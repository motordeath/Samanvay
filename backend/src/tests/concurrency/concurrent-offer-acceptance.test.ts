import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import {
  createTestOrganization,
  createTestUser,
  createTestResource,
  createTestLot,
  createTestNeed,
  createTestOffer,
} from '../helpers/testFactory';
import { acceptOffer } from '../../services/resource-offer.service';

describe('Concurrency Hardening (CRIT-01) — Offer Acceptance', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('prevents inventory double-spend on concurrent offer acceptance', async () => {
    // 1. Setup Organizations and Auth
    const orgA = await createTestOrganization(); // Offering organization
    const orgB = await createTestOrganization(); // Need organization
    const user = await createTestUser();
    const adminUser = await createTestUser();
    
    // 2. Setup Resource and Lot (Quantity 100)
    const resource = await createTestResource();
    const lot = await createTestLot({
      organizationId: orgA.id,
      resourceId: resource.id,
      quantity: 100,
    });

    // 3. Setup Need (Quantity 160 to allow both offers to be valid against the need)
    const need = await createTestNeed({
      organizationId: orgB.id,
      resourceId: resource.id,
      quantity: 160,
      createdById: user.id,
    });

    // 4. Create Offer A = 80
    const offerA = await createTestOffer({
      needId: need.id,
      offeringOrganizationId: orgA.id,
      resourceLotId: lot.id,
      offeredQuantity: 80,
      createdById: user.id,
    });

    // 5. Create Offer B = 80
    const offerB = await createTestOffer({
      needId: need.id,
      offeringOrganizationId: orgA.id,
      resourceLotId: lot.id,
      offeredQuantity: 80,
      createdById: user.id,
    });

    // 6. Execute concurrently
    const results = await Promise.allSettled([
      acceptOffer(offerA.id, orgB.id, adminUser.id),
      acceptOffer(offerB.id, orgB.id, adminUser.id),
    ]);

    // 7. Verification
    const successful = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    // Exactly one succeeds, exactly one fails
    expect(successful.length).toBe(1);
    expect(failed.length).toBe(1);

    // Verify inventory never went negative
    const finalLot = await prisma.resourceLot.findUnique({
      where: { id: lot.id }
    });

    expect(finalLot).toBeDefined();
    expect(finalLot!.availableQuantity).toBeGreaterThanOrEqual(0);
    
    // 100 - 80 = 20
    expect(finalLot!.availableQuantity).toBe(20);
  });
});
