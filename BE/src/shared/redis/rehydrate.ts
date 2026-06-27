import { prisma } from '../prisma/client.js';
import { capacityKey, redis } from './client.js';

export async function rehydrateCapacityCounters() {
  const rows = await prisma.session.groupBy({
    by: ['lotId'],
    where: { status: 'ACTIVE' },
    _count: { _all: true }
  });
  await Promise.all(rows.map((row) => redis.set(capacityKey(row.lotId), row._count._all)));
}
