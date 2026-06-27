import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { Role } from '@prisma/client';
import { forbidden, AppError } from '../errors.js';
import '../auth/types.js';

export async function authenticate(request: FastifyRequest) {
  try {
    const payload = await request.jwtVerify<{ sub: string; role: Role; staffId?: string; partnerId?: string }>();
    request.authUser = {
      id: payload.sub,
      role: payload.role,
      staffId: payload.staffId,
      partnerId: payload.partnerId
    };
  } catch {
    throw new AppError('UNAUTHORIZED', 'Vui lòng đăng nhập', 401);
  }
}

export function requireRole(app: FastifyInstance, roles: Role[]) {
  return {
    preHandler: [
      app.authenticate,
      async (request: FastifyRequest) => {
        if (!request.authUser || !roles.includes(request.authUser.role)) {
          throw forbidden();
        }
      }
    ]
  };
}
