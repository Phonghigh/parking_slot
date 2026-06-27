import type { FastifyInstance } from 'fastify';
import { Role, VehicleType } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../shared/prisma/client.js';
import { requireRole } from '../../shared/middleware/auth.js';
import { notFound } from '../../shared/errors.js';

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  fcmToken: z.string().min(1).optional()
});

const vehicleSchema = z.object({
  plate: z.string().min(4).transform((value) => value.toUpperCase().trim()),
  type: z.nativeEnum(VehicleType)
});

export async function userRoutes(app: FastifyInstance) {
  app.get('/users/me', requireRole(app, [Role.COMMUTER]), async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.authUser!.id },
      select: { id: true, phone: true, name: true, fcmToken: true, createdAt: true }
    });
    if (!user) throw notFound();
    return user;
  });

  app.patch('/users/me', requireRole(app, [Role.COMMUTER]), async (request) => {
    const body = updateProfileSchema.parse(request.body);
    return prisma.user.update({
      where: { id: request.authUser!.id },
      data: body,
      select: { id: true, phone: true, name: true, fcmToken: true }
    });
  });

  app.get('/users/me/vehicles', requireRole(app, [Role.COMMUTER]), async (request) => {
    return prisma.vehicle.findMany({
      where: { userId: request.authUser!.id },
      orderBy: { createdAt: 'desc' }
    });
  });

  app.post('/users/me/vehicles', requireRole(app, [Role.COMMUTER]), async (request, reply) => {
    const body = vehicleSchema.parse(request.body);
    const vehicle = await prisma.vehicle.create({
      data: { ...body, userId: request.authUser!.id }
    });
    return reply.status(201).send(vehicle);
  });

  app.delete('/users/me/vehicles/:id', requireRole(app, [Role.COMMUTER]), async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await prisma.vehicle.delete({ where: { id, userId: request.authUser!.id } });
    return { ok: true };
  });
}
