import { prisma } from '../../shared/prisma/client.js';

export async function staffCanAccessLot(staffId: string, lotId: string) {
  const match = await prisma.staffLot.findUnique({
    where: { staffId_lotId: { staffId, lotId } },
    include: { staff: true }
  });
  return Boolean(match?.staff.active);
}
