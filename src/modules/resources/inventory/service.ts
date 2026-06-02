import { Prisma, InventoryLedgerType, ResourceLot } from '@prisma/client';
import { prisma } from '../../../prisma';

export interface CreateLedgerEntryData {
  resourceId: string;
  reservationId?: string;
  transferId?: string;
  type: InventoryLedgerType;
  quantity: number;
  createdById: string;
  resourceLotId: string; // The specific lot being mutated (to update projection)
}

export class InventoryService {
  /**
   * Creates an immutable inventory ledger entry and automatically synchronizes
   * the operational projection (ResourceLot.availableQuantity).
   * MUST be executed inside a transaction.
   */
  async recordLedgerEntry(tx: Prisma.TransactionClient, data: CreateLedgerEntryData & { requireAvailableQuantity?: number }) {
    if (data.quantity < 0) {
      throw new Error('Ledger entry quantity must be strictly positive. Use specific LedgerTypes to indicate deductions.');
    }

    // 1. Create Immutable Ledger Entry
    const entry = await tx.inventoryLedgerEntry.create({
      data: {
        resourceId: data.resourceId,
        reservationId: data.reservationId,
        transferId: data.transferId,
        type: data.type,
        quantity: data.quantity,
        createdById: data.createdById,
      },
    });

    // 2. Synchronize Operational Projection (ResourceLot.availableQuantity)
    let projectionDelta = 0;
    switch (data.type) {
      case 'STOCK_IN':
      case 'RESERVATION_RELEASE':
      case 'TRANSFER_IN':
        projectionDelta = data.quantity;
        break;
      case 'STOCK_OUT':
      case 'RESERVATION_HOLD':
      case 'TRANSFER_OUT':
        projectionDelta = -data.quantity;
        break;
      case 'ADJUSTMENT':
        throw new Error('Direct adjustments require an explicit delta sign.');
    }

    if (projectionDelta !== 0) {
      // Optimistic Locking: if we require a certain capacity, assert it in the WHERE clause
      const whereClause: any = { id: data.resourceLotId };
      if (data.requireAvailableQuantity !== undefined) {
        whereClause.availableQuantity = { gte: data.requireAvailableQuantity };
      }

      const updateResult = await tx.resourceLot.updateMany({
        where: whereClause,
        data: {
          availableQuantity: {
            increment: projectionDelta,
          },
        },
      });

      if (updateResult.count === 0) {
        // If we provided requireAvailableQuantity and it failed, throw a ConcurrencyConflictError
        if (data.requireAvailableQuantity !== undefined) {
          throw new Error('ConcurrencyConflictError: Insufficient inventory capacity or concurrent modification');
        } else {
          throw new Error('ResourceLot not found or concurrent modification failed');
        }
      }
    }

    return entry;
  }

  /**
   * Orchestration-state aware recalculation of inventory.
   * Derives true available inventory strictly from the ledger and orchestration lifecycle states.
   * This is used by reconciliation services, NOT for real-time reads (which use the projection).
   */
  async getDerivedAvailableInventory(resourceId: string): Promise<number> {
    // A robust derivation calculates:
    // (Total valid STOCK_IN) - (Total STOCK_OUT) - (Active Reservation Holds) - (Finalized TRANSFER_OUT without reservations)
    // For simplicity of reconciliation, we calculate based on Ledger Entries but we must ensure we don't double count.
    // If a reservation becomes a transfer, the RESERVATION_HOLD is released and TRANSFER_OUT is logged.
    
    // We aggregate directly over the ledger.
    const aggregations = await prisma.inventoryLedgerEntry.groupBy({
      by: ['type'],
      where: { resourceId },
      _sum: { quantity: true },
    });

    let stockIn = 0;
    let stockOut = 0;
    let reservationHold = 0;
    let reservationRelease = 0;
    let transferOut = 0;
    let transferIn = 0;

    for (const agg of aggregations) {
      const sum = agg._sum.quantity || 0;
      switch (agg.type) {
        case 'STOCK_IN': stockIn += sum; break;
        case 'STOCK_OUT': stockOut += sum; break;
        case 'RESERVATION_HOLD': reservationHold += sum; break;
        case 'RESERVATION_RELEASE': reservationRelease += sum; break;
        case 'TRANSFER_OUT': transferOut += sum; break;
        case 'TRANSFER_IN': transferIn += sum; break;
      }
    }

    // available = (IN) - (OUT) - (ACTIVE_RESERVATIONS)
    const netIn = stockIn + transferIn;
    const netOut = stockOut + transferOut;
    const activeReservations = reservationHold - reservationRelease;

    return netIn - netOut - activeReservations;
  }
}

export const inventoryService = new InventoryService();
