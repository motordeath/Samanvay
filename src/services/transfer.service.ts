import { prisma } from '../prisma';

export async function updateTransferStatus(transferId: string, newStatus: string) {
  // ─── Phase 1: Read current state ─────────────────────────────────────────
  // Read outside the transaction so the interactive-transaction connection is
  // not held while we compute pre-conditions.
  const transfer = await prisma.transfer.findUnique({
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

  // ─── Phase 2: Atomic transfer update (short transaction, no raw SQL) ─────
  //
  // HIGH-03 (Race window 1): Optimistic concurrency control.
  //
  // A Postgres UPDATE evaluates its WHERE clause against the latest committed
  // row at execution time (READ COMMITTED semantics).  By including the
  // *current* status in the WHERE clause, two concurrent workers racing to
  // complete the same transfer cannot both succeed:
  //
  //   Worker 1: UPDATE ... WHERE id=T AND status='IN_TRANSIT' -> 1 row  (ok)
  //   Worker 2: UPDATE ... WHERE id=T AND status='IN_TRANSIT' -> 0 rows (conflict)
  //             (Worker 1 already committed status=COMPLETED)
  //
  // count=0 signals a conflict and we surface it as a state-transition error.
  // No SELECT FOR UPDATE is needed — and importantly, no raw SQL runs inside
  // the interactive transaction, so the single pooled connection
  // (connection_limit=1 in .env.test) is held only for the minimum time.
  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.transfer.updateMany({
      where: { id: transferId, status: transfer.status },
      data: { status: newStatus },
    });

    if (updateResult.count === 0) {
      // Another concurrent request updated the transfer status first.
      throw new Error(
        `Invalid state transition: ${transfer.status} -> ${newStatus}`
      );
    }

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
  }, { timeout: 30000 });

  // Re-fetch the updated record (updateMany does not return the row)
  const updatedTransfer = await prisma.transfer.findUniqueOrThrow({
    where: { id: transferId },
  });

  // ─── Phase 3: Need status recalculation (outside transaction) ────────────
  //
  // Invariant 16: Need status recalculated when a transfer completes.
  //
  // HIGH-03 (Race window 2): The need-status update runs OUTSIDE the
  // interactive transaction.  Running it inside would hold the pooled
  // connection open across multiple statements, starving the pool on
  // connection_limit=1 test databases and causing TRUNCATE deadlocks in
  // afterEach cleanup.
  //
  // Instead we issue a single autonomous SQL UPDATE whose correlated
  // subquery is evaluated atomically by Postgres.  Postgres acquires a
  // row-level write lock on the ResourceNeed row for the duration of this
  // UPDATE statement.  Two concurrent workers computing the aggregate for
  // the same need therefore serialise naturally on that lock:
  //
  //   Worker 1: UPDATE ResourceNeed ... (row lock acquired)
  //             reads committed Transfers -> sees only Transfer A as COMPLETED
  //             writes PARTIALLY_FULFILLED, commits, releases lock.
  //   Worker 2: UPDATE ResourceNeed ... (was blocked, now proceeds)
  //             reads committed Transfers -> sees both A and B as COMPLETED
  //             writes FULFILLED -- the correct terminal state.
  //
  // Because Phase 2 commits the Transfer change before Phase 3 reads the
  // Transfer table, the second worker always sees the first worker's
  // committed Transfer, producing the correct aggregate.
  if (newStatus === 'COMPLETED') {
    await prisma.$executeRaw`
      UPDATE "ResourceNeed"
      SET status = CASE
        WHEN (
          SELECT COALESCE(SUM(t.quantity), 0)
          FROM   "Transfer" t
          WHERE  t."needId" = ${transfer.needId}
            AND  t.status   = 'COMPLETED'
        ) >= quantity THEN 'FULFILLED'
        WHEN (
          SELECT COALESCE(SUM(t.quantity), 0)
          FROM   "Transfer" t
          WHERE  t."needId" = ${transfer.needId}
            AND  t.status   = 'COMPLETED'
        ) > 0 THEN 'PARTIALLY_FULFILLED'
        ELSE 'OPEN'
      END
      WHERE id = ${transfer.needId}
    `;
  }

  return {
    transfer: updatedTransfer,
    previousStatus: transfer.status,
    newStatus,
  };
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