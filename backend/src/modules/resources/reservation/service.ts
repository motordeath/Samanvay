import { Prisma, ReservationStatus } from '@prisma/client';
import { prisma } from '../../../prisma';
import { inventoryService } from '../inventory/service';
import { createAuditLog } from '../../../services/audit.service';
import { ConcurrencyConflictError } from '../../volunteers/shared/errors';

export class ReservationService {
  /**
   * Creates a resource reservation and secures inventory capacity.
   */
  async createReservation(data: {
    organizationId: string;
    resourceId: string;
    resourceLotId: string;
    requestedQuantity: string | number;
    createdById: string;
    expiresAt?: Date;
  }) {
    const requestedQuantity = Number(data.requestedQuantity);
    
    return await prisma.$transaction(async (tx) => {
      // 1. Create Reservation Orchestration Lock
      const reservation = await tx.reservation.create({
        data: {
          organizationId: data.organizationId,
          resourceId: data.resourceId,
          requestedQuantity,
          reservedQuantity: requestedQuantity,
          status: 'RESERVED',
          expiresAt: data.expiresAt,
          createdById: data.createdById,
        },
      });

      // 2. Add Ledger Entry and Decrement Operational Projection
      // The `requireAvailableQuantity` ensures optimistic locking against the projection.
      try {
        await inventoryService.recordLedgerEntry(tx, {
          resourceId: data.resourceId,
          resourceLotId: data.resourceLotId,
          reservationId: reservation.id,
          type: 'RESERVATION_HOLD',
          quantity: requestedQuantity,
          createdById: data.createdById,
          requireAvailableQuantity: requestedQuantity,
        });
      } catch (err: any) {
        if (err.message && err.message.includes('ConcurrencyConflictError')) {
          throw new ConcurrencyConflictError('Insufficient inventory capacity to secure reservation');
        }
        throw err;
      }

      // 3. Log Audit
      await createAuditLog({
        action: 'RESERVATION_CREATED' as any,
        entityType: 'RESERVATION' as any,
        entityId: reservation.id,
        organizationId: data.organizationId,
        userId: data.createdById,
        metadata: { requestedQuantity, resourceId: data.resourceId },
      }, tx);

      return reservation;
    });
  }

  /**
   * Cancels a pending or reserved reservation and releases capacity.
   */
  async cancelReservation(reservationId: string, userId: string, resourceLotId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current reservation
      const current = await tx.reservation.findUnique({ where: { id: reservationId } });
      if (!current) throw new Error('Reservation not found');
      
      if (!['PENDING', 'RESERVED', 'PARTIALLY_ALLOCATED'].includes(current.status)) {
        throw new Error(`Cannot cancel reservation in ${current.status} state`);
      }

      // 2. Optimistic status update
      const updateResult = await tx.reservation.updateMany({
        where: { id: reservationId, status: current.status },
        data: { status: 'CANCELLED' },
      });

      if (updateResult.count === 0) {
        throw new ConcurrencyConflictError('Reservation was concurrently modified');
      }

      const releaseQuantity = current.reservedQuantity;

      // 3. Release capacity through Ledger
      if (releaseQuantity > 0) {
        await inventoryService.recordLedgerEntry(tx, {
          resourceId: current.resourceId,
          resourceLotId,
          reservationId: current.id,
          type: 'RESERVATION_RELEASE',
          quantity: releaseQuantity,
          createdById: userId,
        });
      }

      // 4. Log Audit
      await createAuditLog({
        action: 'RESERVATION_CANCELLED' as any,
        entityType: 'RESERVATION' as any,
        entityId: reservationId,
        organizationId: current.organizationId,
        userId,
        metadata: { releaseQuantity },
      }, tx);

      return await tx.reservation.findUnique({ where: { id: reservationId } });
    });
  }

  /**
   * Identifies and expires reservations that have passed their `expiresAt`.
   */
  async expireReservations(userId: string) {
    const expired = await prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'RESERVED'] },
        expiresAt: { lt: new Date() },
      },
      include: {
        // Need to know the lot. Currently Reservation relates to Resource, not ResourceLot.
        // For accurate capacity release, we either map resource to lot, or we store lot on the reservation.
        // In the schema, Reservation does not have resourceLotId, so we must find the lot.
        // Assuming a 1-to-1 or standard lot retrieval for now.
        resource: {
          include: { lots: true }
        }
      }
    });

    const results: string[] = [];
    for (const r of expired) {
      if (r.resource.lots.length > 0) {
        const lotId = r.resource.lots[0].id;
        try {
          await prisma.$transaction(async (tx) => {
            const updateResult = await tx.reservation.updateMany({
              where: { id: r.id, status: r.status },
              data: { status: 'EXPIRED' },
            });

            if (updateResult.count > 0 && r.reservedQuantity > 0) {
              await inventoryService.recordLedgerEntry(tx, {
                resourceId: r.resourceId,
                resourceLotId: lotId,
                reservationId: r.id,
                type: 'RESERVATION_RELEASE',
                quantity: r.reservedQuantity,
                createdById: userId,
              });

              await createAuditLog({
                action: 'RESERVATION_EXPIRED' as any,
                entityType: 'RESERVATION' as any,
                entityId: r.id,
                organizationId: r.organizationId,
                metadata: { expiredQuantity: r.reservedQuantity },
              }, tx);
              results.push(r.id);
            }
          });
        } catch (e) {
          console.error(`Failed to expire reservation ${r.id}:`, e);
        }
      }
    }
    return results;
  }
}

export const reservationService = new ReservationService();
