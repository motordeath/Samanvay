import { prisma } from '../../../prisma';
import { TransferStatus } from '@prisma/client';
import { inventoryService } from '../inventory/service';
import { allocationService } from '../allocation/service';
import { createAuditLog } from '../../../services/audit.service';
import { ConcurrencyConflictError } from '../../volunteers/shared/errors';

export class TransferService {
  async updateTransferStatus(transferId: string, newStatus: TransferStatus, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Transfer (including allocations and offer to know the resource and lot)
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: { 
          offer: true, 
          allocations: true 
        },
      });

      if (!transfer) throw new Error('Transfer not found');

      // 2. Validate Transitions
      const validTransitions: Record<string, string[]> = {
        PENDING: ['APPROVED', 'CANCELLED'],
        APPROVED: ['IN_TRANSIT', 'CANCELLED'],
        IN_TRANSIT: ['COMPLETED', 'CANCELLED', 'FAILED'],
        PARTIALLY_COMPLETED: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
        FAILED: [],
      };

      const allowed = validTransitions[transfer.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new Error(`Invalid state transition: ${transfer.status} -> ${newStatus}`);
      }

      // 3. Optimistic Concurrency Update
      const updateResult = await tx.transfer.updateMany({
        where: { id: transferId, status: transfer.status },
        data: { status: newStatus },
      });

      if (updateResult.count === 0) {
        throw new ConcurrencyConflictError(`Invalid state transition: ${transfer.status} -> ${newStatus} (Concurrent mutation)`);
      }

      // 4. Ledger & Allocation Lifecycle Management
      const resourceLotId = transfer.offer.resourceLotId;

      if (newStatus === 'APPROVED') {
        await createAuditLog({
          action: 'TRANSFER_APPROVED' as any,
          entityType: 'TRANSFER' as any,
          entityId: transferId,
          userId,
          metadata: {
            previousStatus: transfer.status,
            newStatus,
          },
        }, tx);
      }
      
      if (newStatus === 'COMPLETED') {
        // Log Transfer Out from Source Lot
        await inventoryService.recordLedgerEntry(tx, {
          resourceId: transfer.resourceId,
          resourceLotId, // Decrements availableQuantity
          transferId,
          type: 'TRANSFER_OUT',
          quantity: transfer.quantity,
          createdById: userId,
        });

        // Mark allocations as completed
        await allocationService.completeAllocation(tx, transferId);

        // If there are no reservations/allocations, the transfer was directly offer-backed.
        // acceptOffer already decremented availableQuantity. Since recordLedgerEntry(TRANSFER_OUT)
        // decremented availableQuantity again, we must increment it here to prevent double-decrementing.
        if (transfer.allocations.length === 0) {
          await tx.resourceLot.update({
            where: { id: resourceLotId },
            data: {
              availableQuantity: { increment: transfer.quantity }
            }
          });
        }

        // Optional: If this transfer was backed by a reservation, we need to release the HOLD
        // Since the TRANSFER_OUT already decremented the inventory, we don't want RESERVATION_RELEASE 
        // to increment it back. Actually, wait!
        // If a reservation hold exists, availableQuantity is already decremented.
        // If we do TRANSFER_OUT, we decrement it AGAIN, meaning we double counted.
        // So we must release the hold (which increments availableQuantity) AND perform TRANSFER_OUT (which decrements).
        // Let's release any allocations.
        for (const alloc of transfer.allocations) {
          await inventoryService.recordLedgerEntry(tx, {
            resourceId: transfer.resourceId,
            resourceLotId,
            reservationId: alloc.reservationId,
            type: 'RESERVATION_RELEASE',
            quantity: alloc.quantity,
            createdById: userId,
          });

          // Update reservation allocated count
          await tx.reservation.update({
            where: { id: alloc.reservationId },
            data: { 
              allocatedQuantity: { increment: alloc.quantity } 
            }
          });
        }

        await createAuditLog({
          action: 'TRANSFER_COMPLETED' as any,
          entityType: 'TRANSFER' as any,
          entityId: transferId,
          userId,
          metadata: {
            previousStatus: transfer.status,
            newStatus,
          },
        }, tx);

        // Recalculate and update ResourceNeed status
        await tx.$queryRaw`
          SELECT id
          FROM "ResourceNeed"
          WHERE id = ${transfer.needId}
          FOR UPDATE
        `;
        const need = await tx.resourceNeed.findUnique({ where: { id: transfer.needId } });
        if (need) {
          const completedTransfers = await tx.transfer.findMany({
            where: { needId: transfer.needId, status: 'COMPLETED' },
          });
          const totalCompleted = completedTransfers.reduce((sum, t) => sum + t.quantity, 0);

          let needStatus = 'OPEN';
          if (totalCompleted >= need.quantity) {
            needStatus = 'FULFILLED';
          } else if (totalCompleted > 0) {
            needStatus = 'PARTIALLY_FULFILLED';
          }

          await tx.resourceNeed.update({
            where: { id: need.id },
            data: { status: needStatus },
          });
        }
      }

      if (newStatus === 'CANCELLED' || newStatus === 'FAILED') {
        // Revert offer if needed
        if (transfer.status === 'PENDING') {
          await tx.resourceOffer.update({
            where: { id: transfer.offerId },
            data: { status: 'PENDING' },
          });
        }

        // Revert inventory reservation
        if (transfer.status === 'PENDING') {
          await tx.resourceLot.update({
            where: { id: resourceLotId },
            data: {
              availableQuantity: { increment: transfer.quantity }
            }
          });
        } else if (['APPROVED', 'IN_TRANSIT'].includes(transfer.status)) {
          await tx.resourceLot.update({
            where: { id: resourceLotId },
            data: {
              reservedQuantity: { decrement: transfer.quantity },
              availableQuantity: { increment: transfer.quantity }
            }
          });
        }

        // Release allocations without transferring out
        for (const alloc of transfer.allocations) {
          // If the reservation was already held, it remains held for the reservation itself, 
          // but we cancel the allocation linking them.
          // In this model, if an allocation is cancelled, the reservation might still be valid for another transfer.
          // We just cancel the allocation. No ledger entry needed because the reservation hold is still active!
          // Wait, if the transfer was cancelled, does the reservation stay active? Yes, the reservation is independent.
        }
        await allocationService.cancelAllocation(tx, transferId);

        await createAuditLog({
          action: 'TRANSFER_CANCELLED' as any,
          entityType: 'TRANSFER' as any,
          entityId: transferId,
          userId,
          metadata: {
            previousStatus: transfer.status,
            newStatus,
          },
        }, tx);
      }

      return await tx.transfer.findUnique({ where: { id: transferId } });
    });
  }

  async getTransferById(id: string) {
    return await prisma.transfer.findUnique({ where: { id } });
  }

  async getTransfers(filters: any, skip: number = 0, take: number = 20) {
    const transfers = await prisma.transfer.findMany({
      where: filters,
      skip,
      take,
      include: {
        resource: true,
        fromOrganization: true,
        toOrganization: true
      }
    });

    if (process.env.STABILIZATION_DEBUG && transfers.length > 0) {
      console.log('[TRANSFERS]', JSON.stringify(transfers[0], null, 2));
    }

    return transfers;
  }
}

export const transferService = new TransferService();
