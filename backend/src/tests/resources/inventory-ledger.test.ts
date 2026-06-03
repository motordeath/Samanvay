import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { inventoryService } from '../../modules/resources/inventory/service';
import { inventoryReconciliationService } from '../../modules/resources/inventory/reconciliation.service';

describe('Inventory Ledger & Reconciliation', () => {
  let user: any;
  let org: any;
  let resource: any;
  let lot: any;

  beforeEach(async () => {
    await clearDatabase(prisma);
    user = await createTestUser();
    org = await createTestOrganization();

    resource = await prisma.resource.create({
      data: {
        name: 'Test Resource',
        unit: 'KG',
      }
    });

    lot = await prisma.resourceLot.create({
      data: {
        organizationId: org.id,
        resourceId: resource.id,
        quantity: 0,
        availableQuantity: 0,
      }
    });
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('correctly tracks STOCK_IN and synchronizes projection', async () => {
    await prisma.$transaction(async (tx) => {
      await inventoryService.recordLedgerEntry(tx, {
        resourceId: resource.id,
        resourceLotId: lot.id,
        type: 'STOCK_IN',
        quantity: 100,
        createdById: user.id,
      });
    });

    const report = await inventoryReconciliationService.generateResourceReport(lot.id);
    expect(report.projectedAvailable).toBe(100);
    expect(report.derivedAvailable).toBe(100);
    expect(report.isConsistent).toBe(true);
  });

  it('correctly derives inventory with active reservations and transfers', async () => {
    await prisma.$transaction(async (tx) => {
      // 1. Stock In: +100
      await inventoryService.recordLedgerEntry(tx, {
        resourceId: resource.id,
        resourceLotId: lot.id,
        type: 'STOCK_IN',
        quantity: 100,
        createdById: user.id,
      });

      // 2. Reservation Hold: -30
      await inventoryService.recordLedgerEntry(tx, {
        resourceId: resource.id,
        resourceLotId: lot.id,
        type: 'RESERVATION_HOLD',
        quantity: 30,
        createdById: user.id,
      });
    });

    let report = await inventoryReconciliationService.generateResourceReport(lot.id);
    expect(report.projectedAvailable).toBe(70);
    expect(report.derivedAvailable).toBe(70);
    expect(report.activeReservations).toBe(30);
    expect(report.isConsistent).toBe(true);

    await prisma.$transaction(async (tx) => {
      // 3. Transfer out a portion of the reservation (Release 20, Transfer Out 20)
      await inventoryService.recordLedgerEntry(tx, {
        resourceId: resource.id,
        resourceLotId: lot.id,
        type: 'RESERVATION_RELEASE',
        quantity: 20,
        createdById: user.id,
      });

      await inventoryService.recordLedgerEntry(tx, {
        resourceId: resource.id,
        resourceLotId: lot.id,
        type: 'TRANSFER_OUT',
        quantity: 20,
        createdById: user.id,
      });
    });

    report = await inventoryReconciliationService.generateResourceReport(lot.id);
    
    // Original 100. Hold 30 -> 70. Release 20 -> 90. Transfer Out 20 -> 70.
    // Derived: In(100) - Out(20) - ActiveReservations(10) = 70.
    expect(report.projectedAvailable).toBe(70);
    expect(report.derivedAvailable).toBe(70);
    expect(report.activeReservations).toBe(10);
    expect(report.isConsistent).toBe(true);
  });

  it('throws ConcurrencyConflictError if optimistic locking capacity check fails', async () => {
    await prisma.$transaction(async (tx) => {
      await inventoryService.recordLedgerEntry(tx, {
        resourceId: resource.id,
        resourceLotId: lot.id,
        type: 'STOCK_IN',
        quantity: 10,
        createdById: user.id,
      });
    });

    await expect(
      prisma.$transaction(async (tx) => {
        await inventoryService.recordLedgerEntry(tx, {
          resourceId: resource.id,
          resourceLotId: lot.id,
          type: 'RESERVATION_HOLD',
          quantity: 20,
          createdById: user.id,
          requireAvailableQuantity: 20, // Only 10 available
        });
      })
    ).rejects.toThrow('ConcurrencyConflictError');
  });
});
