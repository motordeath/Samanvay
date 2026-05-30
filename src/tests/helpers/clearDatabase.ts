import { PrismaClient } from '@prisma/client';

/**
 * Atomically wipes every row in the test database.
 *
 * WHY batch deleteMany instead of TRUNCATE … CASCADE:
 *
 *   TRUNCATE acquires AccessExclusiveLock on the entire table. On Neon (and any
 *   Postgres with a connection pool), if another pooled connection still holds a
 *   RowExclusiveLock from a recently-rolled-back transaction, the two locks
 *   deadlock (Postgres error 40P01). This caused intermittent test failures even
 *   with --runInBand, because Prisma's client-side pool keeps multiple connections
 *   alive concurrently within the same process.
 *
 *   Using prisma.$transaction([...deleteMany()]) instead:
 *   1. Acquires only row-level locks — no AccessExclusiveLock contention.
 *   2. Runs as a single atomic BEGIN/COMMIT block.
 *   3. Tables are deleted in FK-dependency order (most-dependent first), so no
 *      FK constraint errors occur during deletion.
 *
 * FK graph (most-dependent → least-dependent):
 *   Transfer        → ResourceNeed, ResourceOffer, Resource, Organization×2
 *   ResourceOffer   → ResourceNeed, ResourceLot, Organization
 *   ResourceNeed    → Organization, Resource, Event (optional)
 *   ResourceLot     → Organization, Resource
 *   Event           → Organization
 *   Membership      → User, Organization
 *   Partnership     → Organization×2
 *   Resource        → (none)
 *   User            → (none)
 *   Organization    → (none)
 */
export const clearDatabase = async (prisma: PrismaClient): Promise<void> => {
  await prisma.$transaction([
    prisma.transfer.deleteMany(),
    prisma.resourceOffer.deleteMany(),
    prisma.resourceNeed.deleteMany(),
    prisma.resourceLot.deleteMany(),
    prisma.event.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.partnership.deleteMany(),
    prisma.resource.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);
};