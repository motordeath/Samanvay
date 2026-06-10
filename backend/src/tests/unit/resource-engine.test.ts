import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser, createTestResource, createTestNeed } from '../helpers/testFactory';
import { createResourceLot } from '../../services/resource-lot.service';
import { createResourceOffer, acceptOffer, rejectOffer, withdrawOffer } from '../../services/resource-offer.service';
import { updateTransferStatus } from '../../services/transfer.service';

jest.setTimeout(30000);

describe('Resource Engine Unit Tests', () => {

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterEach(async () => {
    await clearDatabase(prisma);
  });

  test('Negative inventory rejected', async () => {
    const org = await createTestOrganization();
    const resource = await createTestResource();

    await expect(createResourceLot({
      organizationId: org.id,
      resourceId: resource.id,
      quantity: -5,
      notes: ''
    })).rejects.toThrow('Quantity must be greater than zero.');
  });

  test('Resource mismatch rejected', async () => {
    const org1 = await createTestOrganization();
    const org2 = await createTestOrganization();
    const user = await createTestUser();
    const resource1 = await createTestResource();
    const resource2 = await createTestResource();

    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100, notes: '' });
    const need = await createTestNeed({ organizationId: org2.id, resourceId: resource2.id, quantity: 50, createdById: user.id });

    await expect(createResourceOffer({
      needId: need.id,
      offeringOrganizationId: org1.id,
      resourceLotId: lot.id,
      offeredQuantity: 50,
      createdById: user.id
    })).rejects.toThrow('Resource mismatch');
  });

  test('Offer exceeds inventory rejected', async () => {
    const org1 = await createTestOrganization();
    const org2 = await createTestOrganization();
    const user = await createTestUser();
    const resource1 = await createTestResource();

    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 10, notes: '' });
    const need = await createTestNeed({ organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id });

    await expect(createResourceOffer({
      needId: need.id,
      offeringOrganizationId: org1.id,
      resourceLotId: lot.id,
      offeredQuantity: 20, // exceeds 10
      createdById: user.id
    })).rejects.toThrow('Cannot exceed available inventory');
  });

  test('Remaining quantity validation on acceptance', async () => {
    const org1 = await createTestOrganization();
    const org2 = await createTestOrganization();
    const user = await createTestUser();
    const resource1 = await createTestResource();

    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100, notes: '' });
    const need = await createTestNeed({ organizationId: org2.id, resourceId: resource1.id, quantity: 10, createdById: user.id });

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
    const org1 = await createTestOrganization();
    const org2 = await createTestOrganization();
    const user = await createTestUser();
    const resource1 = await createTestResource();

    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100, notes: '' });
    const need = await createTestNeed({ organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id });

    const offer = await createResourceOffer({
      needId: need.id, offeringOrganizationId: org1.id, resourceLotId: lot.id, offeredQuantity: 40, createdById: user.id
    });

    const { transfer } = await acceptOffer(offer.id, org2.id, user.id);

    // Inventory should be 60 now
    let updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(60);

    // Cancel transfer
    await updateTransferStatus(transfer.id, 'CANCELLED', user.id);

    // Inventory should be restored to 100
    updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(100);
  });

  test('Offer state transitions', async () => {
    const org1 = await createTestOrganization();
    const org2 = await createTestOrganization();
    const user = await createTestUser();
    const resource1 = await createTestResource();

    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100, notes: '' });
    const need = await createTestNeed({ organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id });

    const offer = await createResourceOffer({
      needId: need.id, offeringOrganizationId: org1.id, resourceLotId: lot.id, offeredQuantity: 10, createdById: user.id
    });

    await rejectOffer(offer.id, org2.id);

    // Can't accept a rejected offer
    await expect(acceptOffer(offer.id, org2.id, user.id)).rejects.toThrow('Cannot transition from REJECTED to ACCEPTED');
  });

  test('Transfer state transitions', async () => {
    const org1 = await createTestOrganization();
    const org2 = await createTestOrganization();
    const user = await createTestUser();
    const resource1 = await createTestResource();

    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100, notes: '' });
    const need = await createTestNeed({ organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id });

    const offer = await createResourceOffer({
      needId: need.id, offeringOrganizationId: org1.id, resourceLotId: lot.id, offeredQuantity: 10, createdById: user.id
    });

    const { transfer } = await acceptOffer(offer.id, org2.id, user.id);
    await updateTransferStatus(transfer.id, 'APPROVED', user.id);
    await updateTransferStatus(transfer.id, 'IN_TRANSIT', user.id);
    await updateTransferStatus(transfer.id, 'COMPLETED', user.id);

    // Can't cancel a completed transfer
    await expect(updateTransferStatus(transfer.id, 'CANCELLED', user.id)).rejects.toThrow('Invalid state transition');
  });

  test('Need fulfillment calculation', async () => {
    const org1 = await createTestOrganization();
    const org2 = await createTestOrganization();
    const user = await createTestUser();
    const resource1 = await createTestResource();

    const lot = await createResourceLot({ organizationId: org1.id, resourceId: resource1.id, quantity: 100, notes: '' });
    const need = await createTestNeed({ organizationId: org2.id, resourceId: resource1.id, quantity: 50, createdById: user.id });

    const offer = await createResourceOffer({
      needId: need.id, offeringOrganizationId: org1.id, resourceLotId: lot.id, offeredQuantity: 50, createdById: user.id
    });

    const { transfer } = await acceptOffer(offer.id, org2.id, user.id);
    await updateTransferStatus(transfer.id, 'APPROVED', user.id);
    await updateTransferStatus(transfer.id, 'IN_TRANSIT', user.id);

    // Status is still OPEN because transfer is IN_TRANSIT
    let updatedNeed = await prisma.resourceNeed.findUnique({ where: { id: need.id } });
    expect(updatedNeed?.status).toBe('OPEN');

    // Complete the transfer
    await updateTransferStatus(transfer.id, 'COMPLETED', user.id);

    // Now it should be FULFILLED
    updatedNeed = await prisma.resourceNeed.findUnique({ where: { id: need.id } });
    expect(updatedNeed?.status).toBe('FULFILLED');
  });
});
