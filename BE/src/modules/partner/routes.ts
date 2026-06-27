import type { FastifyInstance } from 'fastify';
import { CheckInMode, LotStatus, LotType, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../shared/prisma/client.js';
import { requireRole } from '../../shared/middleware/auth.js';
import { encryptText } from '../../shared/utils/crypto.js';
import { normalizeVietnamPhone } from '../../shared/utils/phone.js';
import { forbidden, notFound } from '../../shared/errors.js';

const scheduleSchema = z.array(z.object({
  day: z.number().int().min(0).max(6),
  open: z.string(),
  close: z.string(),
  closed: z.boolean().optional()
}));

const registerSchema = z.object({
  ownerName: z.string().min(1),
  phone: z.string().min(8),
  cccd: z.string().min(8),
  bankAccount: z.string().optional(),
  lot: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
    lotType: z.nativeEnum(LotType),
    totalCapacity: z.number().int().positive(),
    priceBike: z.number().int().nonnegative(),
    priceCar: z.number().int().nonnegative(),
    schedule: scheduleSchema,
    checkInMode: z.nativeEnum(CheckInMode)
  })
});

const updateLotSchema = z.object({
  schedule: scheduleSchema.optional(),
  status: z.nativeEnum(LotStatus).optional(),
  priceBike: z.number().int().nonnegative().optional(),
  priceCar: z.number().int().nonnegative().optional(),
  totalCapacity: z.number().int().positive().optional()
});

const createStaffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(8),
  lotIds: z.array(z.string()).min(1)
});

async function assertPartnerOwnsLot(partnerId: string | undefined, lotId: string) {
  if (!partnerId) throw forbidden();
  const lot = await prisma.lot.findFirst({ where: { id: lotId, partnerId } });
  if (!lot) throw forbidden();
}

export async function partnerRoutes(app: FastifyInstance) {
  app.post('/partner/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const partner = await prisma.partner.create({
      data: {
        ownerName: body.ownerName,
        phone: normalizeVietnamPhone(body.phone),
        cccd: encryptText(body.cccd),
        bankAccount: body.bankAccount ? encryptText(body.bankAccount) : undefined,
        lots: {
          create: {
            ...body.lot,
            status: LotStatus.PENDING
          }
        }
      },
      include: { lots: true }
    });
    return reply.status(201).send(partner);
  });

  app.get('/partner/lots', requireRole(app, [Role.PARTNER]), async (request) => {
    return prisma.lot.findMany({
      where: { partnerId: request.authUser!.partnerId },
      orderBy: { createdAt: 'desc' }
    });
  });

  app.patch('/partner/lots/:id', requireRole(app, [Role.PARTNER]), async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await assertPartnerOwnsLot(request.authUser!.partnerId, id);
    const body = updateLotSchema.parse(request.body);
    return prisma.lot.update({ where: { id }, data: body });
  });

  app.get('/partner/lots/:id/sessions', requireRole(app, [Role.PARTNER]), async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const query = z.object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional()
    }).parse(request.query);
    await assertPartnerOwnsLot(request.authUser!.partnerId, id);
    return prisma.session.findMany({
      where: {
        lotId: id,
        checkInTime: { gte: query.from, lte: query.to }
      },
      include: { user: true, vehicle: true },
      orderBy: { checkInTime: 'desc' }
    });
  });

  app.get('/partner/lots/:id/stats', requireRole(app, [Role.PARTNER]), async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await assertPartnerOwnsLot(request.authUser!.partnerId, id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [visits, revenue, averageDuration] = await Promise.all([
      prisma.session.count({ where: { lotId: id, checkInTime: { gte: today } } }),
      prisma.session.aggregate({ where: { lotId: id, status: 'COMPLETED', checkOutTime: { gte: today } }, _sum: { fee: true } }),
      prisma.session.aggregate({ where: { lotId: id, status: 'COMPLETED', checkOutTime: { gte: today } }, _avg: { durationMin: true } })
    ]);
    return {
      visits,
      revenue: revenue._sum.fee ?? 0,
      averageDurationMin: averageDuration._avg.durationMin ?? 0
    };
  });

  app.post('/partner/lots/:id/staff', requireRole(app, [Role.PARTNER]), async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await assertPartnerOwnsLot(request.authUser!.partnerId, id);
    const body = createStaffSchema.parse(request.body);
    for (const lotId of body.lotIds) await assertPartnerOwnsLot(request.authUser!.partnerId, lotId);
    const partnerId = request.authUser!.partnerId;
    if (!partnerId) throw notFound('Không tìm thấy đối tác');
    const staff = await prisma.staff.create({
      data: {
        partnerId,
        name: body.name,
        phone: normalizeVietnamPhone(body.phone),
        lots: { create: body.lotIds.map((lotId) => ({ lotId })) }
      },
      include: { lots: true }
    });
    return reply.status(201).send(staff);
  });
}
