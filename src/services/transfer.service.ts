import { prisma } from '../prisma';
import { recalculateNeedStatus } from './resource-need.service';

export async function updateTransferStatus(transferId: string, newStatus: string) {
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { id: transferId },
      include: { offer: true },
    });
    if (!transfer) throw new Error('Transfer not found');

    // Invariant 15: Transfer State Machine
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['IN_TRANSIT', 'CANCELLED'],
      'IN_TRANSIT': ['COMPLETED'],
      'COMPLETED': [],
      'CANCELLED': [],
    };

    if (!validTransitions[transfer.status].includes(newStatus)) {
      throw new Error(`Invalid state transition: Cannot transition from ${transfer.status} to ${newStatus}`);
    }

    const updatedTransfer = await tx.transfer.update({
      where: { id: transferId },
      data: { status: newStatus },
    });

    if (newStatus === 'CANCELLED') {
      // Invariant 9: Cancelled transfer releases reserved inventory
      await tx.resourceLot.update({
        where: { id: transfer.offer.resourceLotId },
        data: {
          availableQuantity: { increment: transfer.quantity },
        },
      });
    }

    if (newStatus === 'COMPLETED') {
      // Invariant 10: Completed transfer does NOT restore inventory (already reserved).
      // Invariant 11 & 12: Trigger recalculation of Need status
      await recalculateNeedStatus(transfer.needId, tx);
    }

    return updatedTransfer;
  });
}

export async function getTransferById(id: string) {
  return await prisma.transfer.findUnique({ where: { id } });
}
