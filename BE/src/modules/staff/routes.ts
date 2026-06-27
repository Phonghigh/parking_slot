import type { FastifyInstance } from 'fastify';
import { ClosedBy, PaymentMethod, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../shared/prisma/client.js';
import { requireRole } from '../../shared/middleware/auth.js';
import { AppError, conflict, forbidden, notFound } from '../../shared/errors.js';
import { decodeCheckoutQr, decodeCommuterQr } from '../../shared/utils/qr.js';
import { isLotOpen } from '../../shared/utils/schedule.js';
import { calculateFee } from '../../shared/utils/fee.js';
import { publishCapacity } from '../../shared/redis/client.js';
import { staffCanAccessLot } from './access.js';
import { enqueueNotification } from '../../shared/queue/notifications.js';

const lotBodySchema = z.object({ lotId: z.string() });
const checkinQrSchema = lotBodySchema.extend({ qr: z.string().min(1) });
const checkinConfirmSchema = lotBodySchema.extend({ userId: z.string(), vehicleId: z.string() });
const checkoutQrSchema = lotBodySchema.extend({ qr: z.string().min(1) });
const checkoutConfirmSchema = lotBodySchema.extend({ sessionId: z.string() });
const lookupSchema = lotBodySchema.extend({
  query: z.string().min(3),
  type: z.enum(['phone', 'plate', 'cccd'])
});
const capacitySchema = z.object({
  delta: z.number().int().min(-50).max(50),
  reason: z.string().min(3)
});

async function assertLotAccess(staffId: string | undefined, lotId: string) {
  if (!staffId || !(await staffCanAccessLot(staffId, lotId))) throw forbidden();
}

export async function staffRoutes(app: FastifyInstance) {
  app.post('/staff/checkin/qr', requireRole(app, [Role.STAFF]), async (request) => {
    const body = checkinQrSchema.parse(request.body);
    await assertLotAccess(request.authUser!.staffId, body.lotId);
    const qr = decodeCommuterQr(body.qr);
    const [user, lot] = await Promise.all([
      prisma.user.findUnique({ where: { id: qr.uid }, include: { vehicles: true } }),
      prisma.lot.findUnique({ where: { id: body.lotId } })
    ]);
    if (!user) throw notFound('Không tìm thấy người dùng');
    if (!lot) throw notFound('Không tìm thấy bãi xe');
    const plate = qr.plate?.toUpperCase();
    const vehicle = plate
      ? user.vehicles.find((item) => item.plate === plate)
      : user.vehicles[0];

    return {
      user: { id: user.id, name: user.name, phone: user.phone },
      vehicle,
      lot: {
        hasCapacity: lot.activeSessions < lot.totalCapacity,
        isOpen: lot.status === 'ACTIVE' && isLotOpen(lot.schedule)
      }
    };
  });

  app.post('/staff/checkin/confirm', requireRole(app, [Role.STAFF]), async (request, reply) => {
    const body = checkinConfirmSchema.parse(request.body);
    await assertLotAccess(request.authUser!.staffId, body.lotId);

    const result = await prisma.$transaction(async (tx) => {
      const lot = await tx.lot.findUnique({ where: { id: body.lotId } });
      if (!lot) throw notFound('Không tìm thấy bãi xe');
      if (lot.status !== 'ACTIVE') throw conflict('LOT_NOT_ACTIVE', 'Bãi xe chưa hoạt động');
      if (!isLotOpen(lot.schedule)) throw conflict('LOT_CLOSED', 'Bãi xe đang ngoài giờ hoạt động');
      if (lot.activeSessions >= lot.totalCapacity) throw conflict('LOT_FULL', 'Bãi xe đã hết chỗ');

      const active = await tx.session.findFirst({ where: { userId: body.userId, status: 'ACTIVE' } });
      if (active) throw conflict('SESSION_ALREADY_ACTIVE', 'Người dùng đang có phiên gửi xe');

      const vehicle = await tx.vehicle.findFirst({ where: { id: body.vehicleId, userId: body.userId } });
      if (!vehicle) throw new AppError('VEHICLE_INVALID', 'Xe không thuộc người dùng này', 400);

      const [updatedLot] = await tx.$queryRaw<Array<typeof lot>>`
        UPDATE "Lot"
        SET "activeSessions" = "activeSessions" + 1, "updatedAt" = now()
        WHERE id = ${body.lotId} AND "activeSessions" < "totalCapacity"
        RETURNING *
      `;
      if (!updatedLot) throw conflict('LOT_FULL', 'Bãi xe đã hết chỗ');

      const session = await tx.session.create({
        data: { userId: body.userId, vehicleId: body.vehicleId, lotId: body.lotId },
        include: { user: true, lot: true, vehicle: true }
      });
      return { session, lot: updatedLot };
    });

    await publishCapacity(result.lot);
    await enqueueNotification({
      userId: result.session.userId,
      title: 'ParkHub',
      body: `Đã vào bãi ${result.session.lot.name}`
    });
    return reply.status(201).send(result.session);
  });

  app.post('/staff/checkout/qr', requireRole(app, [Role.STAFF]), async (request) => {
    const body = checkoutQrSchema.parse(request.body);
    await assertLotAccess(request.authUser!.staffId, body.lotId);
    const qr = decodeCheckoutQr(body.qr);
    const session = await prisma.session.findFirst({
      where: { id: qr.sessionId, userId: qr.uid, lotId: body.lotId, status: 'ACTIVE' },
      include: { vehicle: true, lot: true, user: true }
    });
    if (!session) throw notFound('Không tìm thấy phiên đang hoạt động');
    const estimate = calculateFee({
      checkInTime: session.checkInTime,
      checkOutTime: new Date(),
      vehicleType: session.vehicle.type,
      priceBike: session.lot.priceBike,
      priceCar: session.lot.priceCar
    });
    return { session, estimate };
  });

  app.post('/staff/checkout/confirm', requireRole(app, [Role.STAFF]), async (request) => {
    const body = checkoutConfirmSchema.parse(request.body);
    const existing = await prisma.session.findUnique({ where: { id: body.sessionId } });
    if (!existing) throw notFound('Không tìm thấy phiên gửi xe');
    await assertLotAccess(request.authUser!.staffId, existing.lotId);

    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.session.findUnique({
        where: { id: body.sessionId },
        include: { vehicle: true, lot: true, user: true }
      });
      if (!session || session.status !== 'ACTIVE') {
        throw conflict('SESSION_NOT_ACTIVE', 'Phiên gửi xe không còn hoạt động');
      }
      const now = new Date();
      const fee = calculateFee({
        checkInTime: session.checkInTime,
        checkOutTime: now,
        vehicleType: session.vehicle.type,
        priceBike: session.lot.priceBike,
        priceCar: session.lot.priceCar
      });
      const closed = await tx.session.update({
        where: { id: session.id },
        data: {
          checkOutTime: now,
          durationMin: fee.durationMin,
          fee: fee.fee,
          status: 'COMPLETED',
          closedBy: ClosedBy.STAFF,
          paymentMethod: PaymentMethod.CASH
        },
        include: { lot: true, user: true, vehicle: true }
      });
      const [lot] = await tx.$queryRaw<Array<typeof session.lot>>`
        UPDATE "Lot"
        SET "activeSessions" = GREATEST("activeSessions" - 1, 0), "updatedAt" = now()
        WHERE id = ${session.lotId}
        RETURNING *
      `;
      return { session: closed, lot };
    });

    await publishCapacity(result.lot);
    await enqueueNotification({
      userId: result.session.userId,
      title: 'ParkHub',
      body: `Ra bãi ${result.session.lot.name} · Phí: ${result.session.fee?.toLocaleString('vi-VN')}đ`
    });
    return result.session;
  });

  app.post('/staff/lookup', requireRole(app, [Role.STAFF]), async (request) => {
    const body = lookupSchema.parse(request.body);
    await assertLotAccess(request.authUser!.staffId, body.lotId);
    if (body.type === 'plate') {
      const vehicle = await prisma.vehicle.findFirst({
        where: { plate: body.query.toUpperCase().trim() },
        include: { user: true }
      });
      return { user: vehicle?.user ?? null, vehicle };
    }
    if (body.type === 'phone') {
      const user = await prisma.user.findFirst({ where: { phone: body.query }, include: { vehicles: true } });
      return { user };
    }
    throw new AppError('CCCD_LOOKUP_REQUIRES_ENCRYPTED_INDEX', 'Tra cứu CCCD cần chỉ mục bảo mật riêng trước khi bật sản xuất', 501);
  });

  app.patch('/staff/lots/:id/capacity', requireRole(app, [Role.STAFF]), async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = capacitySchema.parse(request.body);
    await assertLotAccess(request.authUser!.staffId, id);
    const lot = await prisma.$transaction(async (tx) => {
      await tx.capacityAdjustment.create({
        data: { lotId: id, delta: body.delta, reason: body.reason, staffId: request.authUser!.staffId }
      });
      return tx.lot.update({
        where: { id },
        data: { activeSessions: { increment: body.delta } }
      });
    });
    await publishCapacity(lot);
    return lot;
  });
}
