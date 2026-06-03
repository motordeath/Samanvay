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

describe('Concurrent acceptance of the same offer', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('creates exactly one transfer and reserves inventory once', async () => {
    const offeringOrganization = await createTestOrganization();
    const requestingOrganization = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();
    const lot = await createTestLot({
      organizationId: offeringOrganization.id,
      resourceId: resource.id,
      quantity: 200,
    });
    const need = await createTestNeed({
      organizationId: requestingOrganization.id,
      resourceId: resource.id,
      quantity: 200,
      createdById: user.id,
    });
    const offer = await createTestOffer({
      needId: need.id,
      offeringOrganizationId: offeringOrganization.id,
      resourceLotId: lot.id,
      offeredQuantity: 80,
      createdById: user.id,
    });

    const outcomes = await Promise.all([
      acceptOffer(offer.id, requestingOrganization.id, user.id)
        .then(() => 'fulfilled')
        .catch(() => 'rejected'),
      acceptOffer(offer.id, requestingOrganization.id, user.id)
        .then(() => 'fulfilled')
        .catch(() => 'rejected'),
    ]);

    expect(outcomes.filter((status) => status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((status) => status === 'rejected')).toHaveLength(1);

    const [updatedOffer, updatedLot, transfers] = await Promise.all([
      prisma.resourceOffer.findUniqueOrThrow({ where: { id: offer.id } }),
      prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } }),
      prisma.transfer.findMany({ where: { offerId: offer.id } }),
    ]);

    expect(updatedOffer.status).toBe('ACCEPTED');
    expect(updatedLot.availableQuantity).toBe(120);
    expect(transfers).toHaveLength(1);
    expect(transfers[0].quantity).toBe(80);
  });
});
