import type { FastifyInstance } from 'fastify';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../shared/prisma/client.js';
import { requireRole } from '../../shared/middleware/auth.js';
import { notFound } from '../../shared/errors.js';

export async function sessionRoutes(app: FastifyInstance) {
  app.get('/sessions/active', requireRole(app, [Role.COMMUTER]), async (request) => {
    const session = await prisma.session.findFirst({
      where: { userId: request.authUser!.id, status: 'ACTIVE' },
      include: { lot: true, vehicle: true },
      orderBy: { checkInTime: 'desc' }
    });
    return { session };
  });

  app.get('/sessions', requireRole(app, [Role.COMMUTER]), async (request) => {
    const query = z.object({
      cursor: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20)
    }).parse(request.query);
    return prisma.session.findMany({
      where: { userId: request.authUser!.id },
      include: { lot: true, vehicle: true },
      orderBy: { checkInTime: 'desc' },
      take: query.limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
    });
  });

  app.get('/sessions/:id', requireRole(app, [Role.COMMUTER]), async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const session = await prisma.session.findFirst({
      where: { id, userId: request.authUser!.id },
      include: { lot: true, vehicle: true }
    });
    if (!session) throw notFound('Không tìm thấy phiên gửi xe');
    return session;
  });
}
