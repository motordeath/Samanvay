import { prisma } from '../prisma';

export async function createResourceOffer(data: any) {
  if (data.offeredQuantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  // Invariant 1: ResourceLot.resourceId == ResourceNeed.resourceId
  const need = await prisma.resourceNeed.findUnique({ where: { id: data.needId } });
  if (!need) throw new Error('Need not found');
  if (need.status === 'CANCELLED') throw new Error('Cannot create offer for a cancelled need.'); // Invariant 13

  const lot = await prisma.resourceLot.findUnique({ where: { id: data.resourceLotId } });
  if (!lot) throw new Error('ResourceLot not found');

  if (lot.resourceId !== need.resourceId) {
    throw new Error('Resource mismatch: Offer resource must match Need resource.');
  }

  if (data.offeredQuantity > lot.availableQuantity) {
    throw new Error('Cannot exceed available inventory.');
  }

  // Invariant 5: Offer creation does not reserve inventory
  return await prisma.resourceOffer.create({
    data: {
      needId: data.needId,
      offeringOrganizationId: data.offeringOrganizationId,
      resourceLotId: data.resourceLotId,
      offeredQuantity: data.offeredQuantity,
      notes: data.notes,
      createdById: data.createdById,
    },
  });
}

export async function acceptOffer(offerId: string, actioningOrganizationId: string, approvedById: string) {
  return await prisma.$transaction(async (tx) => {
    const offer = await tx.resourceOffer.findUnique({
      where: { id: offerId },
      include: { need: true },
    });
    if (!offer) throw new Error('Offer not found');

    // Invariant 14: Valid state transition
    if (offer.status !== 'PENDING') {
      throw new Error(`Cannot transition from ${offer.status} to ACCEPTED`);
    }

    // Invariant 3: Only the organization that created the ResourceNeed may Accept
    if (offer.need.organizationId !== actioningOrganizationId) {
      throw new Error('Only the organization that created the ResourceNeed may accept the offer.');
    }

    // Invariant 4: Accepted quantity may not exceed remaining need quantity
    // Calculate how much has already been accepted
    const acceptedOffers = await tx.resourceOffer.findMany({
      where: { needId: offer.need.id, status: 'ACCEPTED' },
    });
    const totalAccepted = acceptedOffers.reduce((sum, o) => sum + o.offeredQuantity, 0);
    const remainingNeed = offer.need.quantity - totalAccepted;

    if (offer.offeredQuantity > remainingNeed) {
      throw new Error(`Cannot exceed remaining need quantity. Remaining: ${remainingNeed}`);
    }

    // Lock ResourceLot to prevent concurrent double-spend
    await tx.$queryRaw`
      SELECT id
      FROM "ResourceLot"
      WHERE id = ${offer.resourceLotId}
      FOR UPDATE
    `;

    const lot = await tx.resourceLot.findUnique({
      where: { id: offer.resourceLotId },
    });

    if (!lot) throw new Error('ResourceLot not found');

    if (offer.offeredQuantity > lot.availableQuantity) {
      throw new Error('Cannot exceed available inventory on offer.');
    }

    // Atomically claim the pending offer so concurrent acceptance requests
    // cannot create multiple transfers from the same offer.
    const offerUpdate = await tx.resourceOffer.updateMany({
      where: { id: offerId, status: 'PENDING' },
      data: { status: 'ACCEPTED' },
    });

    if (offerUpdate.count === 0) {
      throw new Error('Cannot transition from PENDING to ACCEPTED');
    }

    // Invariant 6: Offer acceptance reserves inventory
    await tx.resourceLot.update({
      where: { id: offer.resourceLotId },
      data: {
        availableQuantity: { decrement: offer.offeredQuantity },
      },
    });

    // Invariant 8: Transfer is automatically created when an offer is accepted
    const transfer = await tx.transfer.create({
      data: {
        needId: offer.needId,
        offerId: offer.id,
        resourceId: offer.need.resourceId,
        fromOrganizationId: offer.offeringOrganizationId,
        toOrganizationId: offer.need.organizationId,
        quantity: offer.offeredQuantity,
        status: 'PENDING',
        approvedById: approvedById,
      },
    });

    return {
      transfer,
      organizationId: offer.need.organizationId,
    };
  }, { timeout: 30000 });
}

export async function rejectOffer(offerId: string, actioningOrganizationId: string) {
  const offer = await prisma.resourceOffer.findUnique({
    where: { id: offerId },
    include: { need: true },
  });
  if (!offer) throw new Error('Offer not found');

  if (offer.status !== 'PENDING') {
    throw new Error(`Cannot transition from ${offer.status} to REJECTED`);
  }

  if (offer.need.organizationId !== actioningOrganizationId) {
    throw new Error('Only the organization that created the ResourceNeed may reject the offer.');
  }

  // Invariant 7: Offer rejection changes no inventory
  const updatedOffer = await prisma.resourceOffer.update({
    where: { id: offerId },
    data: { status: 'REJECTED' },
  });

  return {
    offer: updatedOffer,
    organizationId: offer.need.organizationId,
  };
}

export async function withdrawOffer(offerId: string, actioningOrganizationId: string) {
  const offer = await prisma.resourceOffer.findUnique({
    where: { id: offerId },
  });
  if (!offer) throw new Error('Offer not found');

  if (offer.offeringOrganizationId !== actioningOrganizationId) {
    throw new Error('Only the offering organization may withdraw the offer.');
  }

  if (offer.status !== 'PENDING') {
    throw new Error(`Cannot transition from ${offer.status} to WITHDRAWN`);
  }

  return await prisma.resourceOffer.update({
    where: { id: offerId },
    data: { status: 'WITHDRAWN' },
  });
}

export async function getResourceOffers(filters: any, skip: number = 0, take: number = 20) {
  return await prisma.resourceOffer.findMany({
    where: filters,
    skip,
    take,
  });
}

export async function getOfferById(id: string) {
  return await prisma.resourceOffer.findUnique({ where: { id } });
}
