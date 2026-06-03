/**
 * Security Test Suite: Need Cancellation Integrity (HIGH-02)
 *
 * Threat model: A ResourceNeed can travel through a workflow that produces
 * downstream artifacts (offers, transfers, inventory reservations). This suite
 * verifies that cancelling a Need at any workflow stage never leaves the system
 * in an inconsistent state.
 *
 * Invariants under test
 * ─────────────────────
 * Invariant 13  – A cancelled need blocks new offers.
 * Invariant 14  – Valid offer state transitions only.
 * Invariant 15  – Valid transfer state transitions only.
 * Invariant 17  – (HIGH-02 fix) Need cancellation is blocked while any
 *                 transfer derived from that need is PENDING or IN_TRANSIT.
 *
 * Workflow under test
 * ───────────────────
 * Need → Offer (PENDING) → Offer (ACCEPTED) → Transfer (PENDING)
 *      → Transfer (IN_TRANSIT) → Transfer (COMPLETED) → Need (FULFILLED)
 */

import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import {
  createTestOrganization,
  createTestUser,
  createTestResource,
  createTestNeed,
  createTestLot,
  createTestOffer,
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

// ─── Scenario 1: Need with no offers ────────────────────────────────────────

describe('Scenario 1 – Need with no offers', () => {
  it('cancellation succeeds and need status is CANCELLED', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });

    await cancelResourceNeed(need.id);

    const updated = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updated.status).toBe('CANCELLED');
  });

  it('cancellation is idempotent-safe: second cancel throws', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });

    await cancelResourceNeed(need.id);
    await expect(cancelResourceNeed(need.id)).rejects.toThrow('Need is already cancelled.');
  });
});

// ─── Scenario 2: Need with PENDING offer ────────────────────────────────────

describe('Scenario 2 – Need with pending offer', () => {
  it('cancellation succeeds and PENDING offer is atomically withdrawn', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({
      organizationId: offerOrg.id,
      resourceId: resource.id,
      quantity: 100,
      notes: '',
    });
    const offer = await createResourceOffer({
      needId: need.id,
      offeringOrganizationId: offerOrg.id,
      resourceLotId: lot.id,
      offeredQuantity: 100,
      createdById: user.id,
    });

    await cancelResourceNeed(need.id);

    // Need must be CANCELLED
    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updatedNeed.status).toBe('CANCELLED');

    // Offer must NOT remain PENDING – no dangling offer
    const updatedOffer = await prisma.resourceOffer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(updatedOffer.status).toBe('WITHDRAWN');
  });

  it('multiple PENDING offers are all withdrawn atomically', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 200,
      createdById: user.id,
    });
    const lotA = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const lotB = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });

    const offerA = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotA.id, offeredQuantity: 100, createdById: user.id });
    const offerB = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotB.id, offeredQuantity: 100, createdById: user.id });

    await cancelResourceNeed(need.id);

    const [a, b] = await Promise.all([
      prisma.resourceOffer.findUniqueOrThrow({ where: { id: offerA.id } }),
      prisma.resourceOffer.findUniqueOrThrow({ where: { id: offerB.id } }),
    ]);
    expect(a.status).toBe('WITHDRAWN');
    expect(b.status).toBe('WITHDRAWN');

    // No active offers must remain
    const activeOffers = await prisma.resourceOffer.findMany({
      where: { needId: need.id, status: 'PENDING' },
    });
    expect(activeOffers).toHaveLength(0);
  });

  it('inventory is NOT affected (PENDING offers never reserve inventory)', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });

    await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    const beforeLot = await prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(beforeLot.availableQuantity).toBe(100); // unchanged at offer creation

    await cancelResourceNeed(need.id);

    const afterLot = await prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(afterLot.availableQuantity).toBe(100); // still unchanged
  });
});

// ─── Scenario 3: Need with ACCEPTED offer / PENDING transfer ────────────────

describe('Scenario 3 – Accepted offer with PENDING transfer', () => {
  /**
   * HIGH-02 core case.
   * acceptOffer() creates a Transfer(PENDING) and reserves inventory.
   * cancelResourceNeed() MUST be blocked here.
   */
  it('cancellation is REJECTED when a PENDING transfer exists', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);
    expect(transfer.status).toBe('PENDING');

    await expect(cancelResourceNeed(need.id)).rejects.toThrow(
      'Cannot cancel a need that has active transfers'
    );
  });

  it('need and transfer statuses are unchanged after rejected cancellation', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);

    // Attempt (and fail) to cancel the need
    await expect(cancelResourceNeed(need.id)).rejects.toThrow();

    // Need must still be OPEN
    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updatedNeed.status).toBe('OPEN');

    // Transfer must still be PENDING
    const updatedTransfer = await prisma.transfer.findUniqueOrThrow({ where: { id: transfer.id } });
    expect(updatedTransfer.status).toBe('PENDING');
  });

  it('inventory reservation is intact after rejected cancellation', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 500, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    await acceptOffer(offer.id, needOrg.id, user.id); // reserves 100 units

    const lotAfterAccept = await prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(lotAfterAccept.availableQuantity).toBe(400); // 100 reserved

    await expect(cancelResourceNeed(need.id)).rejects.toThrow();

    // Reservation must be unchanged
    const lotAfterFailedCancel = await prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(lotAfterFailedCancel.availableQuantity).toBe(400);
  });

  it('cancellation succeeds after transfer is cancelled (inventory restored first)', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);

    // Transfer cancellation restores inventory and reverts offer to PENDING
    await updateTransferStatus(transfer.id, 'CANCELLED');

    const lotAfterTransferCancel = await prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(lotAfterTransferCancel.availableQuantity).toBe(100); // restored

    // Now need cancellation should succeed
    await cancelResourceNeed(need.id);

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updatedNeed.status).toBe('CANCELLED');
  });
});

// ─── Scenario 4: Transfer IN_TRANSIT ────────────────────────────────────────

describe('Scenario 4 – Transfer IN_TRANSIT', () => {
  /**
   * Most dangerous state: goods are physically in motion.
   * cancelResourceNeed() MUST be blocked.
   */
  it('cancellation is REJECTED when transfer is IN_TRANSIT', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);
    await updateTransferStatus(transfer.id, 'IN_TRANSIT');

    await expect(cancelResourceNeed(need.id)).rejects.toThrow(
      'Cannot cancel a need that has active transfers'
    );
  });

  it('system state is fully intact after rejected in-transit cancellation attempt', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 500, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);
    await updateTransferStatus(transfer.id, 'IN_TRANSIT');

    await expect(cancelResourceNeed(need.id)).rejects.toThrow();

    // Need must still be OPEN
    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updatedNeed.status).toBe('OPEN');

    // Transfer must still be IN_TRANSIT
    const updatedTransfer = await prisma.transfer.findUniqueOrThrow({ where: { id: transfer.id } });
    expect(updatedTransfer.status).toBe('IN_TRANSIT');

    // Offer must still be ACCEPTED
    const updatedOffer = await prisma.resourceOffer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(updatedOffer.status).toBe('ACCEPTED');

    // Inventory must remain reserved
    const updatedLot = await prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(updatedLot.availableQuantity).toBe(400);
  });
});

// ─── Scenario 5: Need already FULFILLED ─────────────────────────────────────

describe('Scenario 5 – Need already fulfilled', () => {
  it('cancellation is rejected for a FULFILLED need', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);
    await updateTransferStatus(transfer.id, 'IN_TRANSIT');
    await updateTransferStatus(transfer.id, 'COMPLETED');

    const fulfilledNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(fulfilledNeed.status).toBe('FULFILLED');

    await expect(cancelResourceNeed(need.id)).rejects.toThrow('Cannot cancel a fulfilled need.');
  });

  it('FULFILLED → CANCELLED transition is impossible regardless of offer/transfer state', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 50,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 50, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 50, createdById: user.id });

    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);
    await updateTransferStatus(transfer.id, 'IN_TRANSIT');
    await updateTransferStatus(transfer.id, 'COMPLETED');

    // Confirmed FULFILLED
    let updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updatedNeed.status).toBe('FULFILLED');

    // Any attempt to cancel must be rejected
    await expect(cancelResourceNeed(need.id)).rejects.toThrow();

    // Status must not have changed
    updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updatedNeed.status).toBe('FULFILLED');
  });
});

// ─── Scenario 5b: Need PARTIALLY_FULFILLED ───────────────────────────────────

describe('Scenario 5b – Need partially fulfilled', () => {
  /**
   * Policy (HIGH-02 addendum): PARTIALLY_FULFILLED is also a terminal-blocking
   * state. Some goods have already been delivered; cancellation would leave
   * accounting ambiguous. The guard is explicit on the status field — it does
   * NOT rely on the transfer guard as a side-effect.
   *
   * This scenario exercises the case where all transfers are resolved (COMPLETED)
   * but the need is only partially fulfilled. The old code would have allowed
   * cancellation here; the new explicit guard blocks it.
   */
  it('PARTIALLY_FULFILLED → CANCELLED is blocked even when no active transfers remain', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 200,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    // Complete one transfer — need becomes PARTIALLY_FULFILLED (100 of 200)
    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);
    await updateTransferStatus(transfer.id, 'IN_TRANSIT');
    await updateTransferStatus(transfer.id, 'COMPLETED');

    const partialNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(partialNeed.status).toBe('PARTIALLY_FULFILLED');

    // Confirm no active transfers remain — the transfer guard alone would allow this
    const activeTransfers = await prisma.transfer.findMany({
      where: { needId: need.id, status: { in: ['PENDING', 'IN_TRANSIT'] } },
    });
    expect(activeTransfers).toHaveLength(0);

    // The explicit PARTIALLY_FULFILLED status guard must block cancellation
    await expect(cancelResourceNeed(need.id)).rejects.toThrow(
      'Cannot cancel a partially fulfilled need.'
    );

    // Status must be unchanged
    const afterNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(afterNeed.status).toBe('PARTIALLY_FULFILLED');
  });

  it('PARTIALLY_FULFILLED need with active transfer — blocked (belt-and-suspenders)', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 200,
      createdById: user.id,
    });

    const lotA = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const lotB = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });

    const offerA = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotA.id, offeredQuantity: 100, createdById: user.id });
    const offerB = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotB.id, offeredQuantity: 100, createdById: user.id });

    // First transfer completed — PARTIALLY_FULFILLED
    const { transfer: tA } = await acceptOffer(offerA.id, needOrg.id, user.id);
    await updateTransferStatus(tA.id, 'IN_TRANSIT');
    await updateTransferStatus(tA.id, 'COMPLETED');

    // Second transfer still PENDING
    await acceptOffer(offerB.id, needOrg.id, user.id);

    const partialNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(partialNeed.status).toBe('PARTIALLY_FULFILLED');

    // Blocked by explicit status guard (fires before transfer guard is even reached)
    await expect(cancelResourceNeed(need.id)).rejects.toThrow(
      'Cannot cancel a partially fulfilled need.'
    );
  });
});



describe('Scenario 6 – Post-cancellation integrity verification', () => {
  it('after successful cancellation: no active offers, no active transfers', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 200,
      createdById: user.id,
    });

    const lotA = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 80, notes: '' });
    const lotB = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 120, notes: '' });

    // Two PENDING offers – both should be withdrawn on cancel
    const offerA = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotA.id, offeredQuantity: 80, createdById: user.id });
    const offerB = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotB.id, offeredQuantity: 120, createdById: user.id });

    await cancelResourceNeed(need.id);

    // No active (PENDING) offers
    const activeOffers = await prisma.resourceOffer.findMany({
      where: { needId: need.id, status: 'PENDING' },
    });
    expect(activeOffers).toHaveLength(0);

    // All offers are WITHDRAWN
    const [updatedA, updatedB] = await Promise.all([
      prisma.resourceOffer.findUniqueOrThrow({ where: { id: offerA.id } }),
      prisma.resourceOffer.findUniqueOrThrow({ where: { id: offerB.id } }),
    ]);
    expect(updatedA.status).toBe('WITHDRAWN');
    expect(updatedB.status).toBe('WITHDRAWN');

    // No active transfers
    const activeTransfers = await prisma.transfer.findMany({
      where: { needId: need.id, status: { in: ['PENDING', 'IN_TRANSIT'] } },
    });
    expect(activeTransfers).toHaveLength(0);

    // Inventory is unchanged (PENDING offers don't reserve)
    const [updatedLotA, updatedLotB] = await Promise.all([
      prisma.resourceLot.findUniqueOrThrow({ where: { id: lotA.id } }),
      prisma.resourceLot.findUniqueOrThrow({ where: { id: lotB.id } }),
    ]);
    expect(updatedLotA.availableQuantity).toBe(80);
    expect(updatedLotB.availableQuantity).toBe(120);
  });

  it('after transfer cancellation then need cancellation: inventory fully restored', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: user.id,
    });
    const lot = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 500, notes: '' });
    const offer = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lot.id, offeredQuantity: 100, createdById: user.id });

    // Accept → inventory reserved
    const { transfer } = await acceptOffer(offer.id, needOrg.id, user.id);
    let updatedLot = await prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(updatedLot.availableQuantity).toBe(400);

    // Cancel transfer → inventory restored, offer reverts to PENDING
    await updateTransferStatus(transfer.id, 'CANCELLED');
    updatedLot = await prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(updatedLot.availableQuantity).toBe(500);

    // Now cancel the need (offer is now PENDING again, so it will be WITHDRAWN)
    await cancelResourceNeed(need.id);

    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updatedNeed.status).toBe('CANCELLED');

    const updatedOffer = await prisma.resourceOffer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(updatedOffer.status).toBe('WITHDRAWN');

    // Final inventory must equal original capacity
    updatedLot = await prisma.resourceLot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(updatedLot.availableQuantity).toBe(500);

    // No active transfers remain
    const activeTransfers = await prisma.transfer.findMany({
      where: { needId: need.id, status: { in: ['PENDING', 'IN_TRANSIT'] } },
    });
    expect(activeTransfers).toHaveLength(0);
  });

  it('partially fulfilled need (one transfer COMPLETED, one PENDING) — cancellation is blocked', async () => {
    const need = await createTestNeed({
      organizationId: needOrg.id,
      resourceId: resource.id,
      quantity: 200,
      createdById: user.id,
    });

    const lotA = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });
    const lotB = await createResourceLot({ organizationId: offerOrg.id, resourceId: resource.id, quantity: 100, notes: '' });

    const offerA = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotA.id, offeredQuantity: 100, createdById: user.id });
    const offerB = await createResourceOffer({ needId: need.id, offeringOrganizationId: offerOrg.id, resourceLotId: lotB.id, offeredQuantity: 100, createdById: user.id });

    // TransferA: complete it
    const { transfer: transferA } = await acceptOffer(offerA.id, needOrg.id, user.id);
    await updateTransferStatus(transferA.id, 'IN_TRANSIT');
    await updateTransferStatus(transferA.id, 'COMPLETED');

    // TransferB: leave PENDING
    const { transfer: transferB } = await acceptOffer(offerB.id, needOrg.id, user.id);
    expect(transferB.status).toBe('PENDING');

    // Blocked by explicit PARTIALLY_FULFILLED status guard (fires before transfer guard)
    await expect(cancelResourceNeed(need.id)).rejects.toThrow(
      'Cannot cancel a partially fulfilled need.'
    );

    // Need must not have changed status
    const updatedNeed = await prisma.resourceNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(updatedNeed.status).toBe('PARTIALLY_FULFILLED');
  });
});
