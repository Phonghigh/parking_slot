import type { FastifyInstance } from 'fastify';
import { Role, VehicleType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../shared/prisma/client.js';
import { requireRole } from '../../shared/middleware/auth.js';
import { redisSubscriber, capacityChannel } from '../../shared/redis/client.js';
import { isLotOpen } from '../../shared/utils/schedule.js';
import { notFound } from '../../shared/errors.js';

const searchSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusM: z.coerce.number().int().positive().max(20000).default(3000),
  vehicleType: z.nativeEnum(VehicleType).optional(),
  openNow: z.coerce.boolean().default(true)
});

function capacityStatus(available: number) {
  if (available <= 2) return 'red';
  if (available <= 5) return 'yellow';
  return 'green';
}

export async function lotRoutes(app: FastifyInstance) {
  app.get('/lots', requireRole(app, [Role.COMMUTER]), async (request) => {
    const query = searchSchema.parse(request.query);
    const rows = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      totalCapacity: number;
      activeSessions: number;
      priceBike: number;
      priceCar: number;
      schedule: unknown;
      distanceM: number;
    }>>`
      SELECT id, name, address, lat, lng, "totalCapacity", "activeSessions", "priceBike", "priceCar", schedule,
        ST_DistanceSphere(ST_MakePoint(lng, lat), ST_MakePoint(${query.lng}, ${query.lat})) AS "distanceM"
      FROM "Lot"
      WHERE status = 'ACTIVE'
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography,
          ${query.radiusM}
        )
      ORDER BY "distanceM" ASC
      LIMIT 50
    `;

    return rows
      .filter((lot) => !query.openNow || isLotOpen(lot.schedule))
      .map((lot) => {
        const available = Math.max(lot.totalCapacity - lot.activeSessions, 0);
        return {
          ...lot,
          available,
          capacityStatus: capacityStatus(available),
          pricePerHour: query.vehicleType === 'CAR' ? lot.priceCar : lot.priceBike
        };
      });
  });

  app.get('/lots/:id', requireRole(app, [Role.COMMUTER]), async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const lot = await prisma.lot.findUnique({ where: { id } });
    if (!lot) throw notFound('Không tìm thấy bãi xe');
    const available = Math.max(lot.totalCapacity - lot.activeSessions, 0);
    return { ...lot, available, capacityStatus: capacityStatus(available), isOpen: isLotOpen(lot.schedule) };
  });

  app.get('/lots/:id/capacity/stream', requireRole(app, [Role.COMMUTER]), async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache'
    });

    const lot = await prisma.lot.findUnique({ where: { id } });
    if (lot) {
      const available = Math.max(lot.totalCapacity - lot.activeSessions, 0);
      reply.raw.write(`data: ${JSON.stringify({ lotId: id, available, total: lot.totalCapacity, status: capacityStatus(available) })}\n\n`);
    }

    const listener = (_channel: string, message: string) => {
      const payload = JSON.parse(message) as { lotId: string };
      if (payload.lotId === id) reply.raw.write(`data: ${message}\n\n`);
    };
    await redisSubscriber.subscribe(capacityChannel);
    redisSubscriber.on('message', listener);

    request.raw.on('close', () => {
      redisSubscriber.off('message', listener);
    });
  });
}
