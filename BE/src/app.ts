import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import { env } from './env.js';
import { authenticate } from './shared/middleware/auth.js';
import { setErrorHandler } from './shared/errors.js';
import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { lotRoutes } from './modules/lots/routes.js';
import { sessionRoutes } from './modules/sessions/routes.js';
import { staffRoutes } from './modules/staff/routes.js';
import { partnerRoutes } from './modules/partner/routes.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });
  app.setErrorHandler(setErrorHandler);
  app.decorate('authenticate', authenticate);
  await app.register(sensible);
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  app.get('/health', async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.register(userRoutes, { prefix: '/api/v1' });
  await app.register(lotRoutes, { prefix: '/api/v1' });
  await app.register(sessionRoutes, { prefix: '/api/v1' });
  await app.register(staffRoutes, { prefix: '/api/v1' });
  await app.register(partnerRoutes, { prefix: '/api/v1' });

  return app;
}
