import { Worker } from 'bullmq';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { env } from '../env.js';
import { prisma } from '../shared/prisma/client.js';
import type { NotificationPayload } from '../shared/queue/notifications.js';

if (env.FCM_SERVICE_ACCOUNT_JSON && !getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON))
  });
}

const redisUrl = new URL(env.REDIS_URL);

new Worker<NotificationPayload>(
  'notifications',
  async (job) => {
    const user = await prisma.user.findUnique({ where: { id: job.data.userId } });
    if (!user?.fcmToken || !getApps().length) return;
    await getMessaging().send({
      token: user.fcmToken,
      notification: { title: job.data.title, body: job.data.body },
      data: job.data.data
    });
  },
  {
    connection: {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      password: redisUrl.password || undefined,
      maxRetriesPerRequest: null
    }
  }
);
