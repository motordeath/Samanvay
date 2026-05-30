import { PrismaClient } from '@prisma/client';

/**
 * Atomically wipes every row in the test database.
 *
 * WHY $executeRawUnsafe + TRUNCATE … CASCADE instead of sequential deleteMany:
 *
 *   Sequential deleteMany is fragile: if any step throws (e.g. a mid-test failure
 *   left orphaned rows that violate an FK the next deleteMany doesn't cover),
 *   subsequent calls start from a dirty state and every following test fails with
 *   cascading FK constraint violations — exactly the pattern seen in the test logs.
 *
 *   TRUNCATE … CASCADE is a single atomic DDL statement that removes all rows from
 *   every listed table and automatically truncates any table that references them,
 *   regardless of the order rows were inserted.  It is safe to call even when some
 *   tables are empty.  Because it runs inside one implicit transaction, it either
 *   clears everything or nothing — there is no partial state.
 *
 * Full FK graph (source → target, for reference):
 *   Transfer        → ResourceNeed, ResourceOffer, Resource, Organization×2
 *   ResourceOffer   → ResourceNeed, ResourceLot, Organization
 *   ResourceNeed    → Organization, Resource, Event (optional)
 *   ResourceLot     → Organization, Resource
 *   Event           → Organization
 *   Membership      → User, Organization
 *   Partnership     → Organization×2
 *
 * We enumerate every table explicitly so the statement stays correct even if
 * Prisma model names are later renamed — the raw table names must match your
 * actual PostgreSQL schema (snake_case by default from Prisma).
 *
 * RESTART IDENTITY resets sequences so auto-increment PKs start from 1 again
 * in each test, making assertion values predictable.
 */
export const clearDatabase = async (prisma: PrismaClient): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Transfer",
      "ResourceOffer",
      "ResourceNeed",
      "ResourceLot",
      "Event",
      "Resource",
      "Membership",
      "Partnership",
      "User",
      "Organization"
    RESTART IDENTITY
    CASCADE
  `);
};