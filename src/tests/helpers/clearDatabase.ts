import { PrismaClient } from '@prisma/client';

/**
 * Clears all tables in dependency-safe order.
 *
 * Uses a raw TRUNCATE ... CASCADE so that FK constraints never block deletion,
 * regardless of which tables have data or in what order they were populated.
 *
 * This is safe for the test database only — never call this in production.
 *
 * Why not sequential deleteMany()?
 * The deleteMany approach requires knowing the exact FK graph at the time of
 * writing. When the schema evolves (new FKs, new join tables) the delete order
 * breaks silently and tests start failing with cryptic FK violations.
 * TRUNCATE CASCADE is schema-agnostic and always correct.
 *
 * Why not prisma.$transaction([])?
 * Postgres does not guarantee evaluation order inside a batch transaction,
 * and the interactive-transaction protocol holds a single connection open,
 * which starves the pool (connection_limit=1 in .env.test) causing deadlocks
 * on Neon/PgBouncer.
 */
export const clearDatabase = async (prisma: PrismaClient): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog",
      "Transfer",
      "ResourceOffer",
      "ResourceNeed",
      "ResourceLot",
      "Event",
      "Membership",
      "Partnership",
      "Resource",
      "User",
      "Organization"
    RESTART IDENTITY CASCADE
  `);
};