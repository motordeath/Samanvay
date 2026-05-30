import { PrismaClient } from '@prisma/client';

// Sequential deletes respecting FK dependency order.
// Do NOT use prisma.$transaction([...]) here — Postgres does not guarantee
// evaluation order inside a batch transaction, causing FK violations.
// Do NOT use a loop inside a transaction — the interactive-transaction protocol
// holds a single connection open, which starves the pool (connection_limit=1 in .env.test)
// and causes deadlocks on Neon/PgBouncer.
export const clearDatabase = async (prisma: PrismaClient): Promise<void> => {
  await prisma.transfer.deleteMany();
  await prisma.resourceOffer.deleteMany();
  await prisma.resourceNeed.deleteMany();
  await prisma.resourceLot.deleteMany();
  await prisma.event.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.partnership.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
};