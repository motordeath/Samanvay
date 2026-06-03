import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { reservationService } from '../../modules/resources/reservation/service';
import { inventoryService } from '../../modules/resources/inventory/service';

describe('Reservation Concurrency', () => {
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
        quantity: 100,
        availableQuantity: 0, // Will be updated by ledger
      }
    });

    // Seed 100 items
    await prisma.$transaction(async (tx) => {
      await inventoryService.recordLedgerEntry(tx, {
        resourceId: resource.id,
        resourceLotId: lot.id,
        type: 'STOCK_IN',
        quantity: 100,
        createdById: user.id,
      });
    });
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('prevents over-reserving capacity via optimistic locking', async () => {
    // We have 100 items. Two concurrent requests try to reserve 80 each.
    // The total requested is 160 > 100. One should fail.

    const req1 = reservationService.createReservation({
      organizationId: org.id,
      resourceId: resource.id,
      resourceLotId: lot.id,
      requestedQuantity: 80,
      createdById: user.id,
    });

    const req2 = reservationService.createReservation({
      organizationId: org.id,
      resourceId: resource.id,
      resourceLotId: lot.id,
      requestedQuantity: 80,
      createdById: user.id,
    });

    const results = await Promise.allSettled([req1, req2]);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    if (failures[0].status === 'rejected') {
      expect(failures[0].reason.message).toContain('Insufficient inventory capacity');
    }

    // Verify final capacity is 20
    const finalLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(finalLot?.availableQuantity).toBe(20);
  });
});
