import { prisma } from '../prisma';

export async function createResourceNeed(data: any) {
  if (data.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }
  return await prisma.resourceNeed.create({ data });
}

export async function getNeedById(id: string) {
  return await prisma.resourceNeed.findUnique({ where: { id } });
}

export async function cancelResourceNeed(id: string) {
  return await prisma.$transaction(async (tx) => {
    const need = await tx.resourceNeed.findUnique({ where: { id } });
    if (!need) throw new Error('Need not found');

    const updatedNeed = await tx.resourceNeed.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Invariant 13: All PENDING offers become WITHDRAWN
    await tx.resourceOffer.updateMany({
      where: { needId: id, status: 'PENDING' },
      data: { status: 'WITHDRAWN' },
    });

    return updatedNeed;
  });
}

// Invariant 11 & 12: Need fulfillment is calculated only from COMPLETED transfers
export async function recalculateNeedStatus(needId: string, txClient: any = prisma) {
  const need = await txClient.resourceNeed.findUnique({ where: { id: needId } });
  if (!need) return;

  const completedTransfers = await txClient.transfer.findMany({
    where: { needId, status: 'COMPLETED' },
  });

  const fulfilledQuantity = completedTransfers.reduce((sum: number, t: any) => sum + t.quantity, 0);

  let newStatus = 'OPEN';
  if (fulfilledQuantity >= need.quantity) {
    newStatus = 'FULFILLED';
  } else if (fulfilledQuantity > 0) {
    newStatus = 'PARTIALLY_FULFILLED';
  }

  // Update status if it has changed and not CANCELLED
  if (need.status !== 'CANCELLED' && need.status !== newStatus) {
    await txClient.resourceNeed.update({
      where: { id: needId },
      data: { status: newStatus },
    });
  }
}
