import { prisma } from '../../../prisma';
import { inventoryService } from './service';

export interface ReconciliationReport {
  resourceId: string;
  resourceLotId: string;
  projectedAvailable: number;
  derivedAvailable: number;
  drift: number;
  isConsistent: boolean;
  activeReservations: number;
  totalStockIn: number;
  totalStockOut: number;
  totalTransferOut: number;
}

export class InventoryReconciliationService {
  /**
   * Generates a diagnostic report comparing the fast projection (ResourceLot.availableQuantity)
   * with the true authoritative derived inventory from the InventoryLedger.
   * 
   * This is a read-only process designed to detect drift or silent corruption.
   * IT DOES NOT MUTATE OR AUTO-REPAIR INVENTORY.
   */
  async generateResourceReport(resourceLotId: string): Promise<ReconciliationReport> {
    const lot = await prisma.resourceLot.findUnique({
      where: { id: resourceLotId },
      include: { resource: true }
    });

    if (!lot) {
      throw new Error(`ResourceLot ${resourceLotId} not found`);
    }

    const projectedAvailable = lot.availableQuantity;
    const derivedAvailable = await inventoryService.getDerivedAvailableInventory(lot.resourceId);

    // Collect additional diagnostics
    const aggregations = await prisma.inventoryLedgerEntry.groupBy({
      by: ['type'],
      where: { resourceId: lot.resourceId },
      _sum: { quantity: true },
    });

    let totalStockIn = 0;
    let totalStockOut = 0;
    let totalTransferOut = 0;
    let reservationHold = 0;
    let reservationRelease = 0;

    for (const agg of aggregations) {
      const sum = agg._sum.quantity || 0;
      switch (agg.type) {
        case 'STOCK_IN': totalStockIn += sum; break;
        case 'STOCK_OUT': totalStockOut += sum; break;
        case 'TRANSFER_OUT': totalTransferOut += sum; break;
        case 'RESERVATION_HOLD': reservationHold += sum; break;
        case 'RESERVATION_RELEASE': reservationRelease += sum; break;
      }
    }

    const activeReservations = reservationHold - reservationRelease;
    const drift = projectedAvailable - derivedAvailable;

    return {
      resourceId: lot.resourceId,
      resourceLotId: lot.id,
      projectedAvailable,
      derivedAvailable,
      drift,
      isConsistent: drift === 0,
      activeReservations,
      totalStockIn,
      totalStockOut,
      totalTransferOut,
    };
  }

  /**
   * Scans all resource lots for drift.
   */
  async scanAllLots(): Promise<ReconciliationReport[]> {
    const lots = await prisma.resourceLot.findMany({
      select: { id: true },
    });

    const reports: ReconciliationReport[] = [];
    for (const lot of lots) {
      const report = await this.generateResourceReport(lot.id);
      reports.push(report);
    }

    return reports;
  }
}

export const inventoryReconciliationService = new InventoryReconciliationService();
