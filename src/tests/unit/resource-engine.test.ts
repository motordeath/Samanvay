import { prisma } from '../../prisma';
import { createResourceLot } from '../../services/resource-lot.service';
import { createResourceOffer, acceptOffer, rejectOffer, withdrawOffer } from '../../services/resource-offer.service';
import { updateTransferStatus } from '../../services/transfer.service';
import { recalculateNeedStatus } from '../../services/resource-need.service';

describe('Resource Engine Unit Tests', () => {
  let org1: any, org2: any, user: any, resource1: any, resource2: any;
  let lot1: any, need1: any, offer1: any;

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

    // Setup test data
    org1 = await prisma.organization.create({ data: { name: 'Org 1 ' + suffix, type: 'NGO', sector: 'Health' } });
    org2 = await prisma.organization.create({ data: { name: 'Org 2 ' + suffix, type: 'NGO', sector: 'Relief' } });
    user = await prisma.user.create({ data: { name: 'User ' + suffix, email: `test_${suffix}@example.com`, passwordHash: 'hash' } });
    resource1 = await prisma.resource.create({ data: { name: 'Food Unit ' + suffix, unit: 'boxes' } });
    resource2 = await prisma.resource.create({ data: { name: 'Water Unit ' + suffix, unit: 'liters' } });
  });

  afterAll(async () => {
    // Cleanup if necessary, though SQLite in memory or separate file might reset
    // This is just a quick unit test suite
  });

  test('Negative inventory rejected', async () => {
    await expect(createResourceLot({
      organizationId: org1.id,
      resourceId: resource1.id,
      quantity: -5,
      notes: ''
    })).rejects.toThrow('Quantity must be greater than zero.');
  });

  test('Resource mismatch rejected', async () => {
    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100 });
    const need = await prisma.resourceNeed.create({
      data: { organizationId: org2.id, resourceId: resource2.id, quantity: 50, createdById: user.id }
    });

    await expect(createResourceOffer({
      needId: need.id,
      offeringOrganizationId: org1.id,
      resourceLotId: lot.id,
      offeredQuantity: 50,
      createdById: user.id
    })).rejects.toThrow('Resource mismatch');
  });

  test('Offer exceeds inventory rejected', async () => {
    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 10 });
    const need = await prisma.resourceNeed.create({
      data: { organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id }
    });

    await expect(createResourceOffer({
      needId: need.id,
      offeringOrganizationId: org1.id,
      resourceLotId: lot.id,
      offeredQuantity: 20, // exceeds 10
      createdById: user.id
    })).rejects.toThrow('Cannot exceed available inventory');
  });

  test('Remaining quantity validation on acceptance', async () => {
    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100 });
    const need = await prisma.resourceNeed.create({
      data: { organizationId: org2.id, resourceId: resource1.id, quantity: 10, createdById: user.id }
    });

    const offer = await createResourceOffer({
      needId: need.id,
      offeringOrganizationId: org1.id,
      resourceLotId: lot.id,
      offeredQuantity: 20, // exceeds need quantity of 10
      createdById: user.id
    });

    await expect(acceptOffer(offer.id, org2.id, user.id)).rejects.toThrow('Cannot exceed remaining need quantity');
  });

  test('Cancelled transfer restores inventory', async () => {
    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100 });
    const need = await prisma.resourceNeed.create({
      data: { organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id }
    });

    const offer = await createResourceOffer({
      needId: need.id, offeringOrganizationId: org1.id, resourceLotId: lot.id, offeredQuantity: 40, createdById: user.id
    });

    const transfer = await acceptOffer(offer.id, org2.id, user.id);
    
    // Inventory should be 60 now
    let updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(60);

    // Cancel transfer
    await updateTransferStatus(transfer.id, 'CANCELLED');

    // Inventory should be restored to 100
    updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(100);
  });

  test('Offer state transitions', async () => {
    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100 });
    const need = await prisma.resourceNeed.create({
      data: { organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id }
    });

    const offer = await createResourceOffer({
      needId: need.id, offeringOrganizationId: org1.id, resourceLotId: lot.id, offeredQuantity: 10, createdById: user.id
    });

    await rejectOffer(offer.id, org2.id);

    // Can't accept a rejected offer
    await expect(acceptOffer(offer.id, org2.id, user.id)).rejects.toThrow('Cannot transition from REJECTED to ACCEPTED');
  });

  test('Transfer state transitions', async () => {
    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100 });
    const need = await prisma.resourceNeed.create({
      data: { organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id }
    });

    const offer = await createResourceOffer({
      needId: need.id, offeringOrganizationId: org1.id, resourceLotId: lot.id, offeredQuantity: 10, createdById: user.id
    });

    const transfer = await acceptOffer(offer.id, org2.id, user.id);
    await updateTransferStatus(transfer.id, 'IN_TRANSIT');
    await updateTransferStatus(transfer.id, 'COMPLETED');

    // Can't cancel a completed transfer
    await expect(updateTransferStatus(transfer.id, 'CANCELLED')).rejects.toThrow('Invalid state transition');
  });

  test('Need fulfillment calculation', async () => {
    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100 });
    const need = await prisma.resourceNeed.create({
      data: { organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id }
    });

    const offer = await createResourceOffer({
      needId: need.id, offeringOrganizationId: org1.id, resourceLotId: lot.id, offeredQuantity: 50, createdById: user.id
    });

    const transfer = await acceptOffer(offer.id, org2.id, user.id);
    await updateTransferStatus(transfer.id, 'IN_TRANSIT');
    
    // Status is still OPEN because transfer is IN_TRANSIT
    let updatedNeed = await prisma.resourceNeed.findUnique({ where: { id: need.id } });
    expect(updatedNeed?.status).toBe('OPEN');

    // Complete the transfer
    await updateTransferStatus(transfer.id, 'COMPLETED');

    // Now it should be FULFILLED
    updatedNeed = await prisma.resourceNeed.findUnique({ where: { id: need.id } });
    expect(updatedNeed?.status).toBe('FULFILLED');
  });
});
