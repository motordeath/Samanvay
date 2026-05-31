import { prisma } from '../prisma';

export async function updateTransferStatus(transferId: string, newStatus: string) {
  return await prisma.$transaction(async (tx) => {
    const transfer = await tx.transfer.findUnique({
      where: { id: transferId },
      include: { offer: true },
    });

    if (!transfer) throw new Error('Transfer not found');

    // Invariant 15: Valid transfer state transitions
    const validTransitions: Record<string, string[]> = {
      PENDING: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[transfer.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid state transition: ${transfer.status} -> ${newStatus}`
      );
    }

    const updatedTransfer = await tx.transfer.update({
      where: { id: transferId },
      data: { status: newStatus },
    });

    // Invariant 9: Cancelling a transfer restores reserved inventory
    if (newStatus === 'CANCELLED') {
      await tx.resourceLot.update({
        where: { id: transfer.offer.resourceLotId },
        data: { availableQuantity: { increment: transfer.quantity } },
      });

      // Revert the offer back to PENDING so it can potentially be re-accepted
      await tx.resourceOffer.update({
        where: { id: transfer.offerId },
        data: { status: 'PENDING' },
      });
    }

    // Invariant 16: Need status recalculated when a transfer completes
    if (newStatus === 'COMPLETED') {
      const need = await tx.resourceNeed.findUnique({
        where: { id: transfer.needId },
        include: {
          transfers: true,
        },
      });

      if (need) {
        const totalFulfilled = need.transfers
          .filter((t) => t.status === 'COMPLETED' || t.id === transferId)
          .reduce((sum, t) => sum + t.quantity, 0);

        const needStatus =
          totalFulfilled >= need.quantity
            ? 'FULFILLED'
            : totalFulfilled > 0
              ? 'PARTIALLY_FULFILLED'
              : 'OPEN';

        await tx.resourceNeed.update({
          where: { id: need.id },
          data: { status: needStatus },
        });
      }
    }

    return {
      transfer: updatedTransfer,
      previousStatus: transfer.status,
      newStatus,
    };
  }, { timeout: 30000 }); // match jest.setTimeout to prevent stale transaction errors
}

export async function getTransferById(id: string) {
  return await prisma.transfer.findUnique({ where: { id } });
}

export async function getTransfers(filters: any, skip: number = 0, take: number = 20) {
  return await prisma.transfer.findMany({
    where: filters,
    skip,
    take,
  });
}