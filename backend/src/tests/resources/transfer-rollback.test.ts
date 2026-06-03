import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { transferService } from '../../modules/resources/transfer/service';
import { reservationService } from '../../modules/resources/reservation/service';
import { inventoryService } from '../../modules/resources/inventory/service';
import { allocationService } from '../../modules/resources/allocation/service';

describe('Transfer Rollback and Allocation', () => {
  let user: any;
  let org1: any;
  let org2: any;
  let resource: any;
  let lot: any;
  let need: any;
  let offer: any;

  beforeEach(async () => {
    await clearDatabase(prisma);
    user = await createTestUser();
    org1 = await createTestOrganization();
    org2 = await createTestOrganization();

    resource = await prisma.resource.create({
      data: { name: 'Water', unit: 'Liters' }
    });

    lot = await prisma.resourceLot.create({
      data: {
        organizationId: org1.id,
        resourceId: resource.id,
        quantity: 100,
        availableQuantity: 0,
      }
    });

    await prisma.$transaction(async (tx) => {
      await inventoryService.recordLedgerEntry(tx, {
        resourceId: resource.id,
        resourceLotId: lot.id,
        type: 'STOCK_IN',
        quantity: 100,
        createdById: user.id,
      });
    });

    need = await prisma.resourceNeed.create({
      data: {
        organizationId: org2.id,
        resourceId: resource.id,
        quantity: 50,
        createdById: user.id,
      }
    });

    offer = await prisma.resourceOffer.create({
      data: {
        needId: need.id,
        offeringOrganizationId: org1.id,
        resourceLotId: lot.id,
        offeredQuantity: 50,
        createdById: user.id,
      }
    });
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('completes a transfer, decrements inventory, and resolves allocation', async () => {
    // 1. Create Reservation
    const reservation = await reservationService.createReservation({
      organizationId: org1.id,
      resourceId: resource.id,
      resourceLotId: lot.id,
      requestedQuantity: 50,
      createdById: user.id,
    });

    let currentLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(currentLot?.availableQuantity).toBe(50); // 100 - 50 hold

    // 2. Create Transfer
    const transfer = await prisma.transfer.create({
      data: {
        needId: need.id,
        offerId: offer.id,
        resourceId: resource.id,
        fromOrganizationId: org1.id,
        toOrganizationId: org2.id,
        quantity: 50,
        status: 'PENDING',
      }
    });

    // 3. Create Allocation mapping Transfer -> Reservation
    await prisma.$transaction(async (tx) => {
      await allocationService.createAllocation(tx, {
        reservationId: reservation.id,
        transferId: transfer.id,
        quantity: 50,
      });
    });

    // 4. Complete Transfer
    await transferService.updateTransferStatus(transfer.id, 'APPROVED', user.id);
    await transferService.updateTransferStatus(transfer.id, 'IN_TRANSIT', user.id);
    await transferService.updateTransferStatus(transfer.id, 'COMPLETED', user.id);

    // After completion, hold is released (+50) and transfer out is applied (-50)
    currentLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(currentLot?.availableQuantity).toBe(50); // Net change is 0 on top of the original hold

    // Check reservation allocation status
    const alloc = await prisma.reservationAllocation.findFirst({ where: { transferId: transfer.id } });
    expect(alloc?.status).toBe('COMPLETED');
  });

  it('cancels a transfer and preserves reservation hold without double increment', async () => {
    // 1. Create Reservation
    const reservation = await reservationService.createReservation({
      organizationId: org1.id,
      resourceId: resource.id,
      resourceLotId: lot.id,
      requestedQuantity: 50,
      createdById: user.id,
    });

    // 2. Create Transfer
    const transfer = await prisma.transfer.create({
      data: {
        needId: need.id,
        offerId: offer.id,
        resourceId: resource.id,
        fromOrganizationId: org1.id,
        toOrganizationId: org2.id,
        quantity: 50,
        status: 'PENDING',
      }
    });

    // 3. Create Allocation
    await prisma.$transaction(async (tx) => {
      await allocationService.createAllocation(tx, {
        reservationId: reservation.id,
        transferId: transfer.id,
        quantity: 50,
      });
    });

    // 4. Cancel Transfer
    await transferService.updateTransferStatus(transfer.id, 'CANCELLED', user.id);

    // Capacity shouldn't change, the reservation is still holding it!
    const currentLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(currentLot?.availableQuantity).toBe(50); // Hold remains active

    // Allocation should be cancelled
    const alloc = await prisma.reservationAllocation.findFirst({ where: { transferId: transfer.id } });
    expect(alloc?.status).toBe('CANCELLED');
  });
});
