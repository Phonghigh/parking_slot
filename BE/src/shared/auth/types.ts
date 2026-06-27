import type { Role } from '@prisma/client';

export type AuthUser = {
  id: string;
  role: Role;
  staffId?: string;
  partnerId?: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}
