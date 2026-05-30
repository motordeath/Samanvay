import { prisma } from '../prisma';

/**
 * Cancels a ResourceNeed by setting its status to CANCELLED.
 *
 * Invariant 13: A cancelled need cannot receive new offers.
 * All PENDING offers on this need are also withdrawn atomically
 * so that offering organizations are notified and inventory is
 * not misleadingly reserved.
 */
export async function cancelResourceNeed(needId: string) {
  return await prisma.$transaction(async (tx) => {
    const need = await tx.resourceNeed.findUnique({ where: { id: needId } });

    if (!need) throw new Error('Need not found');

    if (need.status === 'CANCELLED') {
      throw new Error('Need is already cancelled.');
    }

    if (need.status === 'FULFILLED') {
      throw new Error('Cannot cancel a fulfilled need.');
    }

    // Withdraw all PENDING offers on this need
    await tx.resourceOffer.updateMany({
      where: { needId, status: 'PENDING' },
      data: { status: 'WITHDRAWN' },
    });

    // Mark the need itself as CANCELLED
    return await tx.resourceNeed.update({
      where: { id: needId },
      data: { status: 'CANCELLED' },
    });
  }, { timeout: 30000 });
}

export async function createResourceNeed(data: any) {
  if (data.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }
  return await prisma.resourceNeed.create({ data });
}

export async function getNeedById(id: string) {
  return await prisma.resourceNeed.findUnique({ where: { id } });
}

export async function getResourceNeeds(filters: any, skip: number = 0, take: number = 20) {
  return await prisma.resourceNeed.findMany({
    where: filters,
    skip,
    take,
  });
}