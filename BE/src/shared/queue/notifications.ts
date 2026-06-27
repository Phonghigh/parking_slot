import { Queue } from 'bullmq';
import { env } from '../../env.js';

export type NotificationPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

const redisUrl = new URL(env.REDIS_URL);

export const notificationQueue = new Queue<NotificationPayload, void, string>('notifications', {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null
  }
});

export async function enqueueNotification(payload: NotificationPayload) {
  await notificationQueue.add('send-push', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 500,
    removeOnFail: 1000
  });
}
