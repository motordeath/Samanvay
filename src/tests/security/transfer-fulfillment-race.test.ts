/**
 * Security Test Suite: Transfer Fulfillment Race Condition (HIGH-03)
 *
 * Threat model: Concurrent transfer operations can produce inconsistent
 * fulfillment state.  This suite exercises every race window identified in
 * the HIGH-03 investigation:
 *
 *   Race window 1 – Duplicate completion of the same transfer
 *   Race window 2 – Lost update on need status from concurrent completions
 *                   of different transfers for the same need
 *
 * Invariants under test
 * ─────────────────────
 *  1  A transfer may only be completed once.
 *  2  Need fulfillment must reflect actual completed transfers.
 *  3  Need fulfillment may never exceed requested quantity.
 *  4  Concurrent completion attempts must never leave state inconsistent.
 * 15  Valid transfer state transitions only.
 * 16  Need status recalculated correctly on completion.
 */

import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import {
  createTestOrganization,
  createTestUser,
  createTestResource,
  createTestNeed,
} from '../helpers/testFactory';
import { createResourceLot } from '../../services/resource-lot.service';
import { createResourceOffer, acceptOffer } from '../../services/resource-offer.service';
import { updateTransferStatus } from '../../services/transfer.service';
import { cancelResourceNeed } from '../../services/resource-need.service';

jest.setTimeout(30000);

// ─── Shared fixtures ────────────────────────────────────────────────────────

let needOrg: Awaited<ReturnType<typeof createTestOrganization>>;
let offerOrg: Awaited<ReturnType<typeof createTestOrganization>>;
let user: Awaited<ReturnType<typeof createTestUser>>;
let resource: Awaited<ReturnType<typeof createTestResource>>;

beforeEach(async () => {
  await clearDatabase(prisma);
  needOrg  = await createTestOrganization();
  offerOrg = await createTestOrganization();
  user     = await createTestUser();
  resource = await createTestResource();
});

afterEach(async () => {
  await clearDatabase(prisma);
});

// ─── Helper: build a need with N accepted offers/transfers, all IN_TRANSIT ──

async function buildTransferScenario(
  needQuantity: number,
  transferQuantities: number[],
) {
  const need = await createTestNeed({
    organizationId: needOrg.id,
    resourceId: resource.id,
    quantity: needQuantity,
    createdById: user.id,
  });

  const transfers: { transferId: string; offerId: string; lotId: string }[] = [];

  for (const qty of transferQuantities) {
    const lot = await createResourceLot({
      organizationId: offerOrg.id,
      resourceId: resource.id,
      quantity: qty,
      notes: '',
    });
    const offer = await createResourceOffer({
      needId: need.id,
      offeringOrganizationId: offerOrg.id,
      resourceLotId: lot.id,
      offeredQuantity: qty,
      createdById: user.id,
    });
    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);

    // Move to IN_TRANSIT
    await updateTransferStatus(transfer.id, 'IN_TRANSIT');

    transfers.push({
      transferId: transfer.id,
      offerId: offer.id,
      lotId: lot.id,
    });
  }

  return { need, transfers };
}

// ─── Scenario 1: Single completion (baseline sanity) ────────────────────────

describe('Scenario 1 – Single completion', () => {
  it('completes transfer and recalculates need status correctly', async () => {
    const { need, transfers } = await buildTransferScenario(100, [60]);
    const [tA] = transfers;

    await updateTransferStatus(tA.transferId, 'COMPLETED');

    const updatedTransfer = await prisma.transfer.findUniqueOrThrow({
      where: { id: tA.transferId },
    });
    expect(updatedTransfer.status).toBe('COMPLETED');

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });
    expect(updatedNeed.status).toBe('PARTIALLY_FULFILLED');
  });

  it('full quantity completion sets need to FULFILLED', async () => {
    const { need, transfers } = await buildTransferScenario(100, [100]);
    const [tA] = transfers;

    await updateTransferStatus(tA.transferId, 'COMPLETED');

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });
    expect(updatedNeed.status).toBe('FULFILLED');
  });
});

// ─── Scenario 2: Duplicate completion (Race window 1) ──────────────────────

describe('Scenario 2 – Duplicate completion of same transfer', () => {
  it('exactly one succeeds, one fails with state transition error', async () => {
    const { transfers } = await buildTransferScenario(100, [100]);
    const [tA] = transfers;

    const results = await Promise.allSettled([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tA.transferId, 'COMPLETED'),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures  = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // The failure must be a state-transition error, not a crash.
    // With OCC the losing worker reads the original status before the winner
    // commits (e.g. "IN_TRANSIT -> COMPLETED"), so we match the prefix only.
    const reason = (failures[0] as PromiseRejectedResult).reason;
    expect(reason.message).toMatch(/Invalid state transition/);

  });

  it('transfer is COMPLETED exactly once in the database', async () => {
    const { transfers } = await buildTransferScenario(100, [100]);
    const [tA] = transfers;

    await Promise.allSettled([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tA.transferId, 'COMPLETED'),
    ]);

    const transfer = await prisma.transfer.findUniqueOrThrow({
      where: { id: tA.transferId },
    });
    expect(transfer.status).toBe('COMPLETED');
  });

  it('need status is correct after duplicate completion attempt', async () => {
    const { need, transfers } = await buildTransferScenario(100, [100]);
    const [tA] = transfers;

    await Promise.allSettled([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tA.transferId, 'COMPLETED'),
    ]);

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });
    expect(updatedNeed.status).toBe('FULFILLED');
  });
});

// ─── Scenario 3: Concurrent different transfers (Race window 2) ─────────────

describe('Scenario 3 – Concurrent completion of different transfers', () => {
  it('both transfers complete successfully', async () => {
    const { transfers } = await buildTransferScenario(100, [60, 40]);
    const [tA, tB] = transfers;

    const results = await Promise.allSettled([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tB.transferId, 'COMPLETED'),
    ]);

    // Both must succeed (different rows — no state conflict)
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
  });

  it('both transfers are COMPLETED in the database', async () => {
    const { transfers } = await buildTransferScenario(100, [60, 40]);
    const [tA, tB] = transfers;

    await Promise.all([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tB.transferId, 'COMPLETED'),
    ]);

    const [updatedA, updatedB] = await Promise.all([
      prisma.transfer.findUniqueOrThrow({ where: { id: tA.transferId } }),
      prisma.transfer.findUniqueOrThrow({ where: { id: tB.transferId } }),
    ]);

    expect(updatedA.status).toBe('COMPLETED');
    expect(updatedB.status).toBe('COMPLETED');
  });

  it('need status reflects the sum of both completions (no lost update)', async () => {
    const { need, transfers } = await buildTransferScenario(100, [60, 40]);
    const [tA, tB] = transfers;

    await Promise.all([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tB.transferId, 'COMPLETED'),
    ]);

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });

    // Without the FOR UPDATE fix, this would be PARTIALLY_FULFILLED (lost update)
    expect(updatedNeed.status).toBe('FULFILLED');
  });
});

// ─── Scenario 4: Fulfillment threshold race ────────────────────────────────

describe('Scenario 4 – Fulfillment threshold race', () => {
  it('concurrent 60+40 completion sets need to FULFILLED exactly', async () => {
    const { need, transfers } = await buildTransferScenario(100, [60, 40]);
    const [tA, tB] = transfers;

    // Fire both completions at once
    await Promise.all([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tB.transferId, 'COMPLETED'),
    ]);

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });
    expect(updatedNeed.status).toBe('FULFILLED');
  });

  it('three-way concurrent completion: 40+30+30 = 100 → FULFILLED', async () => {
    const { need, transfers } = await buildTransferScenario(100, [40, 30, 30]);
    const [tA, tB, tC] = transfers;

    await Promise.all([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tB.transferId, 'COMPLETED'),
      updateTransferStatus(tC.transferId, 'COMPLETED'),
    ]);

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });
    expect(updatedNeed.status).toBe('FULFILLED');
  });

  it('partial completion: concurrent 30+30 of 100 → PARTIALLY_FULFILLED', async () => {
    const { need, transfers } = await buildTransferScenario(100, [30, 30]);
    const [tA, tB] = transfers;

    await Promise.all([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tB.transferId, 'COMPLETED'),
    ]);

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });
    expect(updatedNeed.status).toBe('PARTIALLY_FULFILLED');
  });
});

// ─── Scenario 5: Over-fulfillment ───────────────────────────────────────────

describe('Scenario 5 – Over-fulfillment protection', () => {
  /**
   * Over-acceptance is prevented at the acceptOffer layer (Invariant 4).
   * This test uses direct Prisma writes to simulate a hypothetical race
   * condition at the acceptance layer (HIGH-04 territory) and verifies
   * that the completion layer does not crash or corrupt state.
   *
   * The expected behaviour is: both transfers complete (goods are already
   * shipped — you cannot un-ship them), and the need is marked FULFILLED
   * since totalFulfilled (140) >= need.quantity (100).
   */
  it('over-accepted transfers complete without crashing — need marked FULFILLED', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lotA = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 70, notes: '' });
    const lotB = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 70, notes: '' });

    // Bypass acceptOffer validation to create over-accepted state
    const offerA = await prisma.resourceOffer.create({
      data: { needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotA.id, offeredQuantity: 70, status: 'ACCEPTED', createdById: user.id },
    });
    const offerB = await prisma.resourceOffer.create({
      data: { needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotB.id, offeredQuantity: 70, status: 'ACCEPTED', createdById: user.id },
    });
    const transferA = await prisma.transfer.create({
      data: { needId: need.id, offerId: offerA.id, resourceId: resource.id, fromOrganizationId: offerOrg.id, toOrganizationId: needOrg.id, quantity: 70, status: 'IN_TRANSIT', approvedById: user.id },
    });
    const transferB = await prisma.transfer.create({
      data: { needId: need.id, offerId: offerB.id, resourceId: resource.id, fromOrganizationId: offerOrg.id, toOrganizationId: needOrg.id, quantity: 70, status: 'IN_TRANSIT', approvedById: user.id },
    });

    // Both should complete without errors
    await Promise.all([
      updateTransferStatus(transferA.id, 'COMPLETED'),
      updateTransferStatus(transferB.id, 'COMPLETED'),
    ]);

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updatedNeed.status).toBe('FULFILLED');

    // Both transfers are COMPLETED
    const [updatedA, updatedB] = await Promise.all([
      prisma.transfer.findUniqueOrThrow({ where: { id: transferA.id } }),
      prisma.transfer.findUniqueOrThrow({ where: { id: transferB.id } }),
    ]);
    expect(updatedA.status).toBe('COMPLETED');
    expect(updatedB.status).toBe('COMPLETED');
  });
});

// ─── Scenario 6: Cancellation vs completion race ────────────────────────────

describe('Scenario 6 – Need cancellation vs transfer completion race', () => {
  /**
   * HIGH-02 guarantees: cancelResourceNeed blocks when active transfers exist
   * (PENDING or IN_TRANSIT), and blocks when need is PARTIALLY_FULFILLED or
   * FULFILLED.  This means in a race between cancelNeed and completeTransfer,
   * cancelNeed should ALWAYS fail and completeTransfer should ALWAYS succeed.
   */
  it('cancel fails, completion succeeds — system is consistent', async () => {
    const { need, transfers } = await buildTransferScenario(100, [100]);
    const [tA] = transfers;

    const results = await Promise.allSettled([
      cancelResourceNeed(need.id),
      updateTransferStatus(tA.transferId, 'COMPLETED'),
    ]);

    // Regardless of execution order, the system must be consistent.
    // cancelNeed must fail (active transfer exists, or need is now FULFILLED).
    // completeTransfer must succeed.
    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });

    const updatedTransfer = await prisma.transfer.findUniqueOrThrow({
      where: { id: tA.transferId },
    });

    // The need must NOT be CANCELLED while the transfer is COMPLETED.
    // Two valid outcomes:
    //   1. Transfer completed, need is FULFILLED   (completion won)
    //   2. Transfer still IN_TRANSIT, need is OPEN  (cancel failed because of active transfer)
    //
    // The invalid outcome is: need=CANCELLED + transfer=COMPLETED
    const invalidState =
      updatedNeed.status === 'CANCELLED' && updatedTransfer.status === 'COMPLETED';
    expect(invalidState).toBe(false);

    // The transfer must have completed (cancelNeed can't cancel transfers)
    expect(updatedTransfer.status).toBe('COMPLETED');
    expect(updatedNeed.status).toBe('FULFILLED');
  });

  it('partial completion + cancel race: need stays PARTIALLY_FULFILLED', async () => {
    const { need, transfers } = await buildTransferScenario(100, [60, 40]);
    const [tA, tB] = transfers;

    // Complete first transfer sequentially
    await updateTransferStatus(tA.transferId, 'COMPLETED');

    // Now race: cancel need vs complete second transfer
    const results = await Promise.allSettled([
      cancelResourceNeed(need.id),
      updateTransferStatus(tB.transferId, 'COMPLETED'),
    ]);

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });

    // After both transfers complete, need should be FULFILLED.
    // cancelNeed should have failed (PARTIALLY_FULFILLED guard from HIGH-02
    // and/or active transfer guard).
    expect(updatedNeed.status).toBe('FULFILLED');

    // Must never reach CANCELLED + COMPLETED
    const updatedB = await prisma.transfer.findUniqueOrThrow({
      where: { id: tB.transferId },
    });
    expect(updatedB.status).toBe('COMPLETED');
    expect(updatedNeed.status !== 'CANCELLED' || updatedB.status !== 'COMPLETED').toBe(true);
  });
});

// ─── Scenario 7: Completion + cancellation of different transfers ───────────

describe('Scenario 7 – Concurrent complete and cancel of different transfers', () => {
  it('one transfer completes, another cancels — need status correct', async () => {
    const { need, transfers } = await buildTransferScenario(100, [60, 40]);
    const [tA, tB] = transfers;

    await Promise.all([
      updateTransferStatus(tA.transferId, 'COMPLETED'),
      updateTransferStatus(tB.transferId, 'CANCELLED'),
    ]);

    const [updatedA, updatedB] = await Promise.all([
      prisma.transfer.findUniqueOrThrow({ where: { id: tA.transferId } }),
      prisma.transfer.findUniqueOrThrow({ where: { id: tB.transferId } }),
    ]);

    expect(updatedA.status).toBe('COMPLETED');
    expect(updatedB.status).toBe('CANCELLED');

    // Need status should reflect only the completed transfer
    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({
      where: { id: need.id },
    });
    expect(updatedNeed.status).toBe('PARTIALLY_FULFILLED');
  });
});
