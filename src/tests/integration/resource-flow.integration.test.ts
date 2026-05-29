import { prisma } from '../../prisma';
import { createResourceLot } from '../../services/resource-lot.service';
import { createResourceOffer, acceptOffer } from '../../services/resource-offer.service';
import { updateTransferStatus } from '../../services/transfer.service';

describe('Resource Engine Integration Scenario', () => {
  let hopeFoundation: any;
  let helpingHands: any;
  let adminUser: any;
  let resource: any;

  beforeAll(async () => {
    // Clean database
    await prisma.transfer.deleteMany();
    await prisma.resourceOffer.deleteMany();
    await prisma.resourceNeed.deleteMany();
    await prisma.resourceLot.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.event.deleteMany();
    await prisma.partnership.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();

    const suffix = Date.now().toString() + Math.random().toString().substring(2, 6);

    // 1. Setup seed data for the scenario
    hopeFoundation = await prisma.organization.create({ data: { name: 'Hope Foundation ' + suffix, type: 'NGO', sector: 'Health' } });
    helpingHands = await prisma.organization.create({ data: { name: 'Helping Hands ' + suffix, type: 'NGO', sector: 'Relief' } });
    adminUser = await prisma.user.create({ data: { name: 'Alice Admin ' + suffix, email: `alice.test_${suffix}@example.com`, passwordHash: 'hash' } });
    resource = await prisma.resource.create({ data: { name: 'Blanket ' + suffix, unit: 'units' } });
  });

  afterAll(async () => {
    // Cleanup not strictly necessary for this quick integration test in memory/sqlite
  });

  test('Full resource coordination flow', async () => {
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
    const transfer = await acceptOffer(offer.id, hopeFoundation.id, adminUser.id);

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

    expect(completedTransfer.status).toBe('COMPLETED');

    // Step 7: Need becomes fulfilled
    const updatedNeed = await prisma.resourceNeed.findUnique({ where: { id: need.id } });
    expect(updatedNeed?.status).toBe('FULFILLED');
  });
});
