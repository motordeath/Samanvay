import { PrismaClient } from '@prisma/client';

/**
 * Deletes every row in FK-dependency order (children before parents).
 *
 * WHY sequential deleteMany and not $transaction([...]):
 *   Prisma's array-form $transaction parallelises independent statements.
 *   PostgreSQL enforces FK constraints at statement time, so a parallel
 *   delete of ResourceOffer and ResourceNeed can race and fail with a
 *   constraint violation even though the final state would be consistent.
 *   Sequential awaits guarantee the order.
 *
 * Full FK graph (source → target):
 *   Transfer        → ResourceNeed, ResourceOffer, Resource, Organization×2
 *   ResourceOffer   → ResourceNeed, ResourceLot, Organization
 *   ResourceNeed    → Organization, Resource, Event (optional)
 *   ResourceLot     → Organization, Resource
 *   Event           → Organization
 *   Membership      → User, Organization
 *   Partnership     → Organization×2
 *
 * Deletion order derived from the graph (leaf → root):
 *   Transfer → ResourceOffer → ResourceNeed → ResourceLot
 *   → Event → Resource → Membership → Partnership → User → Organization
 */
export const clearDatabase = async (prisma: PrismaClient): Promise<void> => {
  // Leaf: nothing points at Transfer
  await prisma.transfer.deleteMany();

  // ResourceOffer is referenced by Transfer (now gone)
  await prisma.resourceOffer.deleteMany();

  // ResourceNeed is referenced by Transfer + ResourceOffer (both gone)
  await prisma.resourceNeed.deleteMany();

  // ResourceLot is referenced by ResourceOffer (now gone)
  await prisma.resourceLot.deleteMany();

  // Event is referenced by ResourceNeed (now gone)
  await prisma.event.deleteMany();

  // Resource is referenced by ResourceLot, ResourceNeed, Transfer (all gone)
  await prisma.resource.deleteMany();

  // Membership references User + Organization — must precede both
  await prisma.membership.deleteMany();

  // Partnership references Organization×2 — must precede Organization
  await prisma.partnership.deleteMany();

  // User is referenced by Membership (now gone)
  await prisma.user.deleteMany();

  // Organization is the root; everything that referenced it is gone
  await prisma.organization.deleteMany();
};