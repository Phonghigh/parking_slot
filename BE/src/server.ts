import { env } from './env.js';
import { buildApp } from './app.js';
import { prisma } from './shared/prisma/client.js';
import { redis } from './shared/redis/client.js';
import { rehydrateCapacityCounters } from './shared/redis/rehydrate.js';

const app = await buildApp();

try {
  await rehydrateCapacityCounters();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(1);
}

process.on('SIGTERM', async () => {
  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
});
