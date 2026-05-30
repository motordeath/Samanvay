import { PrismaClient } from '@prisma/client';

// export const clearDatabase = async (prisma: PrismaClient): Promise<void> => {
//   await prisma.$transaction([
//     prisma.transfer.deleteMany(),
//     prisma.resourceOffer.deleteMany(),
//     prisma.resourceNeed.deleteMany(),
//     prisma.resourceLot.deleteMany(),
//     prisma.event.deleteMany(),
//     prisma.membership.deleteMany(),
//     prisma.partnership.deleteMany(),
//     prisma.resource.deleteMany(),
//     prisma.user.deleteMany(),
//     prisma.organization.deleteMany(),
//   ]);
// };

export const clearDatabase = async (prisma: PrismaClient): Promise<void> => {
  const tables = [
    'transfer',
    'resourceOffer',
    'resourceNeed',
    'resourceLot',
    'event',
    'membership',
    'partnership',
    'resource',
    'user',
    'organization',
  ];

  await prisma.$transaction(async (tx) => {
    for (const table of tables) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (tx as any)[table].deleteMany();
    }
  });
};