import { prisma } from '../prisma';

/**
 * Cancels a ResourceNeed by setting its status to CANCELLED.
 *
 * Invariant 13: A cancelled need cannot receive new offers.
 * All PENDING offers on this need are also withdrawn atomically
 * so that offering organizations are notified and inventory is
 * not misleadingly reserved.
 *
 * Invariant 17 (HIGH-02): Cancellation is blocked when any transfer
 * derived from this need is still active (PENDING or IN_TRANSIT).
 * The caller must cancel those transfers first via the transfer
 * state machine, which will restore reserved inventory and revert
 * the associated offer back to PENDING before this function is
 * called again.
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

    // Policy (HIGH-02): A partially fulfilled need has already delivered
    // resources to the requesting organization. Allowing cancellation at this
    // point would produce ambiguous accounting — some goods have moved, some
    // have not. Operators must resolve remaining transfers explicitly before
    // the need can transition to any terminal state.
    if (need.status === 'PARTIALLY_FULFILLED') {
      throw new Error('Cannot cancel a partially fulfilled need. Resolve all active transfers first.');
    }

    // Invariant 17: Block cancellation while active transfers exist.
    // A PENDING or IN_TRANSIT transfer means inventory has been reserved and
    // goods may already be in motion. Cancelling the need without first
    // cancelling those transfers would leave:
    //   - reserved inventory that is never released
    //   - active transfers with no live parent need
    // The transfer cancellation workflow (updateTransferStatus → CANCELLED)
    // restores inventory and reverts the offer to PENDING; callers must
    // invoke that path before retrying need cancellation.
    const activeTransferCount = await tx.transfer.count({
      where: {
        needId,
        status: { in: ['PENDING', 'IN_TRANSIT'] },
      },
    });

    if (activeTransferCount > 0) {
      throw new Error(
        'Cannot cancel a need that has active transfers. ' +
        'Cancel all PENDING and IN_TRANSIT transfers first.'
      );
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