import { randomUUID } from 'crypto';
import { prisma } from '../../prisma';

/**
 * Every helper creates a fully independent record.
 * No shared state. No hardcoded names. No counters.
 * Safe to call concurrently across parallel test workers.
 *
 * IMPORTANT: These helpers bypass the service layer intentionally.
 * They exist only to build fixture state for tests that exercise
 * other behaviour.  Tests that verify business rules of a specific
 * service must call that service directly.
 */

export const createTestOrganization = async (
  type = 'NGO',
  sector = 'Health',
) => {
  return prisma.organization.create({
    data: {
      name: `org-${randomUUID()}`,
      type,
      sector,
    },
  });
};

export const createTestUser = async () => {
  return prisma.user.create({
    data: {
      name: `user-${randomUUID()}`,
      email: `${randomUUID()}@test.com`,
      passwordHash: 'hash',
    },
  });
};

export const createTestResource = async (unit = 'units') => {
  // Resource.name has a @unique constraint in the schema.
  // randomUUID() guarantees no collision even without clearDatabase running first.
  return prisma.resource.create({
    data: {
      name: `resource-${randomUUID()}`,
      unit,
    },
  });
};

/**
 * Creates a ResourceLot directly via Prisma (bypasses the service layer).
 * Use this only for fixture setup. Tests that exercise createResourceLot()
 * business rules should call the service directly.
 */
export const createTestLot = async ({
  organizationId,
  resourceId,
  quantity,
}: {
  organizationId: string;
  resourceId: string;
  quantity: number;
}) => {
  return prisma.resourceLot.create({
    data: {
      organizationId,
      resourceId,
      quantity,
      availableQuantity: quantity,
    },
  });
};

/**
 * Creates a ResourceNeed directly via Prisma (bypasses the service layer).
 * Use this only for fixture setup. Tests that exercise createResourceNeed()
 * business rules should call the service directly.
 */
export const createTestNeed = async ({
  organizationId,
  resourceId,
  quantity,
  createdById,
}: {
  organizationId: string;
  resourceId: string;
  quantity: number;
  createdById: string;
}) => {
  return prisma.resourceNeed.create({
    data: {
      organizationId,
      resourceId,
      quantity,
      createdById,
    },
  });
};

/**
 * Creates a ResourceOffer directly via Prisma (bypasses the service layer).
 *
 * NOTE: This does NOT enforce business invariants (inventory check, resource
 * mismatch check, cancelled-need guard).  Use only for fixture setup in tests
 * that are not testing offer-creation rules.
 *
 * For tests that exercise createResourceOffer() business rules, call the
 * service function directly.
 */
export const createTestOffer = async ({
  needId,
  offeringOrganizationId,
  resourceLotId,
  offeredQuantity,
  createdById,
}: {
  needId: string;
  offeringOrganizationId: string;
  resourceLotId: string;
  offeredQuantity: number;
  createdById: string;
}) => {
  return prisma.resourceOffer.create({
    data: {
      needId,
      offeringOrganizationId,
      resourceLotId,
      offeredQuantity,
      createdById,
      status: 'PENDING',
    },
  });
};