import { prisma } from '../../../prisma';

export class AllocationService {
  /**
   * Links a reservation to a transfer, indicating that the transfer
   * consumes a specific quantity of the reserved capacity.
   */
  async createAllocation(tx: any, data: {
    reservationId: string;
    transferId: string;
    quantity: number;
  }) {
    // Note: Assuming `tx` is Prisma.TransactionClient, we avoid strict typing here
    // for flexibility if it's a raw PrismaClient.
    
    return await tx.reservationAllocation.create({
      data: {
        reservationId: data.reservationId,
        transferId: data.transferId,
        quantity: data.quantity,
        status: 'PENDING',
      }
    });
  }

  /**
   * Finalizes an allocation when the transfer completes.
   * This handles updating the status. Real capacity releases are handled
   * by the TransferService/ReservationService working together.
   */
  async completeAllocation(tx: any, transferId: string) {
    await tx.reservationAllocation.updateMany({
      where: { transferId, status: 'PENDING' },
      data: { status: 'COMPLETED' },
    });
  }

  /**
   * Cancels an allocation if the transfer fails or is cancelled.
   */
  async cancelAllocation(tx: any, transferId: string) {
    await tx.reservationAllocation.updateMany({
      where: { transferId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  }
}

export const allocationService = new AllocationService();
