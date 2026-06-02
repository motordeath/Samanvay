import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { reservationService } from '../../modules/resources/reservation/service';
import { inventoryService } from '../../modules/resources/inventory/service';

describe('Reservation Lifecycle', () => {
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
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('can create a reservation and hold capacity', async () => {
    const res = await reservationService.createReservation({
      organizationId: org.id,
      resourceId: resource.id,
      resourceLotId: lot.id,
      requestedQuantity: 50,
      createdById: user.id,
    });

    expect(res.status).toBe('RESERVED');
    expect(res.reservedQuantity).toBe(50);

    const updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(50);
  });

  it('can cancel a reservation and restore capacity', async () => {
    const res = await reservationService.createReservation({
      organizationId: org.id,
      resourceId: resource.id,
      resourceLotId: lot.id,
      requestedQuantity: 50,
      createdById: user.id,
    });

    await reservationService.cancelReservation(res.id, user.id, lot.id);

    const updatedRes = await prisma.reservation.findUnique({ where: { id: res.id } });
    expect(updatedRes?.status).toBe('CANCELLED');

    const updatedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(updatedLot?.availableQuantity).toBe(100);
  });

  it('can automatically expire past reservations', async () => {
    const expiresAt = new Date(Date.now() - 10000); // 10 seconds ago

    const res = await reservationService.createReservation({
      organizationId: org.id,
      resourceId: resource.id,
      resourceLotId: lot.id,
      requestedQuantity: 30,
      createdById: user.id,
      expiresAt,
    });

    let lotState = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(lotState?.availableQuantity).toBe(70);

    const expired = await reservationService.expireReservations(user.id);
    expect(expired).toContain(res.id);

    const updatedRes = await prisma.reservation.findUnique({ where: { id: res.id } });
    expect(updatedRes?.status).toBe('EXPIRED');

    lotState = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
    expect(lotState?.availableQuantity).toBe(100);
  });
});
