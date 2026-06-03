import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser, createTestResource, createTestNeed } from '../helpers/testFactory';
import { createResourceLot } from '../../services/resource-lot.service';
import { createResourceOffer, acceptOffer, rejectOffer, withdrawOffer } from '../../services/resource-offer.service';
import { updateTransferStatus } from '../../services/transfer.service';
import { cancelResourceNeed } from '../../services/resource-need.service';

jest.setTimeout(30000);

describe('Resource Engine Verification Pack', () => {

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterEach(async () => {
    await clearDatabase(prisma);
  });

  // Test Group 1: Multiple Offers Fulfillment
  test('Multiple Offers Fulfillment', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });

    const lotA = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 40, notes: '' });
    const offerA = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lotA.id, offeredQuantity: 40, createdById: user.id });

    const lotB = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 60, notes: '' });
    const offerB = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lotB.id, offeredQuantity: 60, createdById: user.id });

    const { transfer: transferA } = await acceptOffer(offerA.id, hopeOrg.id, user.id);
    await updateTransferStatus(transferA.id, 'IN_TRANSIT');
    await updateTransferStatus(transferA.id, 'COMPLETED');

    let updatedNeed = await prisma.resourceNeed.findUnique({ where: { id: need.id } });
    expect(updatedNeed?.status).toBe('PARTIALLY_FULFILLED');

    const { transfer: transferB } = await acceptOffer(offerB.id, hopeOrg.id, user.id);
    await updateTransferStatus(transferB.id, 'IN_TRANSIT');
    await updateTransferStatus(transferB.id, 'COMPLETED');

    updatedNeed = await prisma.resourceNeed.findUnique({ where: { id: need.id } });
    expect(updatedNeed?.status).toBe('FULFILLED');
  });

  // Test Group 2: Unauthorized Offer Acceptance
  test('Unauthorized Offer Acceptance', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const randomOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lot = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    await expect(acceptOffer(offer.id, randomOrg.id, user.id)).rejects.toThrow('Only the organization that created the ResourceNeed may accept');

    const updatedOffer = await prisma.resourceOffer.findUnique({ where: { id: offer.id } });
    expect(updatedOffer?.status).toBe('PENDING');

    const transfers = await prisma.transfer.findMany({ where: { offerId: offer.id } });
    expect(transfers.length).toBe(0);

    const updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(100);
  });

  // Test Group 3: Double Acceptance Protection
  test('Double Acceptance Protection', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lot = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    await acceptOffer(offer.id, hopeOrg.id, user.id);
    await expect(acceptOffer(offer.id, hopeOrg.id, user.id)).rejects.toThrow(/Cannot transition from ACCEPTED/);

    const transfers = await prisma.transfer.findMany({ where: { offerId: offer.id } });
    expect(transfers.length).toBe(1);

    const updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(0); // Reserved once (100 - 100)
  });

  // Test Group 4: Need Cancellation
  test('Need Cancellation', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lotA = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 40, notes: '' });
    const offerA = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lotA.id, offeredQuantity: 40, createdById: user.id });
    const lotB = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 60, notes: '' });
    const offerB = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lotB.id, offeredQuantity: 60, createdById: user.id });

    await cancelResourceNeed(need.id);

    const updatedNeed = await prisma.resourceNeed.findUnique({ where: { id: need.id } });
    expect(updatedNeed?.status).toBe('CANCELLED');

    const updatedOfferA = await prisma.resourceOffer.findUnique({ where: { id: offerA.id } });
    expect(updatedOfferA?.status).toBe('WITHDRAWN');

    const updatedOfferB = await prisma.resourceOffer.findUnique({ where: { id: offerB.id } });
    expect(updatedOfferB?.status).toBe('WITHDRAWN');
  });

  // Test Group 5: No New Offers On Cancelled Need
  test('No New Offers On Cancelled Need', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    await cancelResourceNeed(need.id);

    const lot = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    await expect(createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id })).rejects.toThrow('Cannot create offer for a cancelled need.');

    const offers = await prisma.resourceOffer.findMany({ where: { needId: need.id } });
    expect(offers.length).toBe(0);
  });

  // Test Group 6: Offer Withdrawal Rules
  test('Offer Withdrawal Rules', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lot = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    await withdrawOffer(offer.id, helpingOrg.id);

    const updatedOffer = await prisma.resourceOffer.findUnique({ where: { id: offer.id } });
    expect(updatedOffer?.status).toBe('WITHDRAWN');

    const updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(100);

    const transfers = await prisma.transfer.findMany({ where: { offerId: offer.id } });
    expect(transfers.length).toBe(0);

    await expect(acceptOffer(offer.id, hopeOrg.id, user.id)).rejects.toThrow(/Cannot transition from WITHDRAWN/);
  });

  // Test Group 7: Inventory Reservation Integrity
  test('Inventory Reservation Integrity', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lot = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 500, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    const { transfer } = await acceptOffer(offer.id, hopeOrg.id, user.id);

    let updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(400);

    await updateTransferStatus(transfer.id, 'IN_TRANSIT');
    await updateTransferStatus(transfer.id, 'COMPLETED');

    updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(400);
  });

  // Test Group 8: Transfer Cancellation Recovery
  test('Transfer Cancellation Recovery', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lot = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 500, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    const { transfer } = await acceptOffer(offer.id, hopeOrg.id, user.id);
    let updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(400);

    await updateTransferStatus(transfer.id, 'CANCELLED');

    updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(500);
  });

  // Test Group 9: Over Allocation Protection
  test('Over Allocation Protection', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lotA = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offerA = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lotA.id, offeredQuantity: 80, createdById: user.id });

    await acceptOffer(offerA.id, hopeOrg.id, user.id);

    const lotB = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offerB = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lotB.id, offeredQuantity: 50, createdById: user.id });

    await expect(acceptOffer(offerB.id, hopeOrg.id, user.id)).rejects.toThrow('Cannot exceed remaining need quantity');

    const updatedLotB = await prisma.resourceLot.findUnique({ where: { id: lotB.id } });
    expect(updatedLotB?.availableQuantity).toBe(100);
  });

  // Test Group 10: Transfer State Machine
  test('Transfer State Machine', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lot = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    // COMPLETED -> anything is forbidden
    const { transfer: transfer1 } = await acceptOffer(offer.id, hopeOrg.id, user.id);
    await updateTransferStatus(transfer1.id, 'IN_TRANSIT');
    await updateTransferStatus(transfer1.id, 'COMPLETED');
    await expect(updateTransferStatus(transfer1.id, 'CANCELLED')).rejects.toThrow('Invalid state transition');
    await expect(updateTransferStatus(transfer1.id, 'PENDING')).rejects.toThrow('Invalid state transition');

    // CANCELLED -> anything is forbidden
    const need2 = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lot2 = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer2 = await createResourceOffer({ needId: need2.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot2.id, offeredQuantity: 100, createdById: user.id });

    const { transfer: transfer2 } = await acceptOffer(offer2.id, hopeOrg.id, user.id);
    await updateTransferStatus(transfer2.id, 'CANCELLED');
    await expect(updateTransferStatus(transfer2.id, 'PENDING')).rejects.toThrow('Invalid state transition');
    await expect(updateTransferStatus(transfer2.id, 'COMPLETED')).rejects.toThrow('Invalid state transition');
  });

  // Test Group 11: Offer State Machine
  test('Offer State Machine', async () => {
    const hopeOrg = await createTestOrganization();
    const helpingOrg = await createTestOrganization();
    const user = await createTestUser();
    const resource = await createTestResource();

    const need = await createTestNeed({ organizationId: hopeOrg.id, resourceId: resource.id, quantity: 100, createdById: user.id });
    const lot = await createResourceLot({ organizationId: helpingOrg.id, resourceId: resource.id, quantity: 100, notes: '' });

    // ACCEPTED -> PENDING is forbidden (covered in Double Acceptance)
    const offer1 = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 10, createdById: user.id });
    await acceptOffer(offer1.id, hopeOrg.id, user.id);
    await expect(rejectOffer(offer1.id, hopeOrg.id)).rejects.toThrow(/Cannot transition from ACCEPTED to REJECTED/);

    // REJECTED -> PENDING is forbidden
    const offer2 = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 10, createdById: user.id });
    await rejectOffer(offer2.id, hopeOrg.id);
    await expect(acceptOffer(offer2.id, hopeOrg.id, user.id)).rejects.toThrow(/Cannot transition from REJECTED to ACCEPTED/);

    // WITHDRAWN -> PENDING is forbidden
    const offer3 = await createResourceOffer({ needId: need.id, offeringOrganizationId: helpingOrg.id, resourceLotId: lot.id, offeredQuantity: 10, createdById: user.id });
    await withdrawOffer(offer3.id, helpingOrg.id);
    await expect(acceptOffer(offer3.id, hopeOrg.id, user.id)).rejects.toThrow(/Cannot transition from WITHDRAWN to ACCEPTED/);
  });
});
