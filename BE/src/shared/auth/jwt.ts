import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { env } from '../../env.js';

export function signAccessToken(app: FastifyInstance, payload: object) {
  return app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_TTL });
}

export function createRefreshToken() {
  return nanoid(48);
}
