import { Redis } from 'ioredis';
import { env } from '../../env.js';

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const redisSubscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const capacityKey = (lotId: string) => `lot:capacity:${lotId}`;
export const capacityChannel = 'lot-capacity-updates';

export async function publishCapacity(lot: { id: string; totalCapacity: number; activeSessions: number }) {
  const available = Math.max(lot.totalCapacity - lot.activeSessions, 0);
  const payload = {
    lotId: lot.id,
    available,
    total: lot.totalCapacity,
    status: available <= 2 ? 'red' : available <= 5 ? 'yellow' : 'green'
  };

  await redis.set(capacityKey(lot.id), lot.activeSessions);
  await redis.publish(capacityChannel, JSON.stringify(payload));
  return payload;
}
