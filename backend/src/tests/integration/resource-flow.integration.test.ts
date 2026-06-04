import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser, createTestResource } from '../helpers/testFactory';
import { createResourceLot } from '../../services/resource-lot.service';
import { createResourceOffer, acceptOffer } from '../../services/resource-offer.service';
import { updateTransferStatus } from '../../services/transfer.service';

jest.setTimeout(30000);

describe('Resource Engine Integration Scenario', () => {

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterEach(async () => {
    await clearDatabase(prisma);
  });

  test('Full resource coordination flow', async () => {
    // 1. Setup seed data for the scenario locally
    const hopeFoundation = await createTestOrganization('NGO', 'Health');
    const helpingHands = await createTestOrganization('NGO', 'Relief');
    const adminUser = await createTestUser();
    const resource = await createTestResource('units');

    // Step 1: Hope Foundation creates Need
    const need = await prisma.resourceNeed.create({
      data: {
        organizationId: hopeFoundation.id,
        resourceId: resource.id,
        quantity: 100,
        createdById: adminUser.id
      }
    });

    expect(need.status).toBe('OPEN');

    // Step 2: Helping Hands owns inventory
    const lot = await createResourceLot({
      organizationId: helpingHands.id,
      resourceId: resource.id,
      quantity: 150
    });

    expect(lot.availableQuantity).toBe(150);

    // Step 3: Helping Hands creates Offer
    const offer = await createResourceOffer({
      needId: need.id,
      offeringOrganizationId: helpingHands.id,
      resourceLotId: lot.id,
      offeredQuantity: 100,
      createdById: adminUser.id
    });

    expect(offer.status).toBe('PENDING');

    // Step 4: Hope Foundation accepts Offer
    const { transfer } = await acceptOffer(offer.id, hopeFoundation.id, adminUser.id);

    // Verify reservation happened
    const updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(50); // 150 - 100 reserved

    // Step 5: Transfer created automatically
    expect(transfer).toBeDefined();
    expect(transfer.status).toBe('PENDING');
    expect(transfer.quantity).toBe(100);

    // Step 6: Transfer completed (needs to go through IN_TRANSIT first per invariant 15)
    await updateTransferStatus(transfer.id, 'IN_TRANSIT');
    const completedTransfer = await updateTransferStatus(transfer.id, 'COMPLETED');
    if (!completedTransfer) throw new Error('Transfer missing');

    expect(completedTransfer.status).toBe('COMPLETED');

    // Step 7: Need becomes fulfilled
    const updatedNeed = await prisma.resourceNeed.findUnique({ where: { id: need.id } });
    expect(updatedNeed?.status).toBe('FULFILLED');
  });
});