import { prisma } from '../prisma';

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

    if (need.status === 'PARTIALLY_FULFILLED') {
      throw new Error('Cannot cancel a partially fulfilled need. Resolve all active transfers first.');
    }

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

    await tx.resourceOffer.updateMany({
      where: { needId, status: 'PENDING' },
      data: { status: 'WITHDRAWN' },
    });

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
  return await prisma.resourceNeed.create({
    data,
    include: {
      resource: true,
      organization: true,
    }
  });
}

export async function getNeedById(id: string) {
  return await prisma.resourceNeed.findUnique({
    where: { id },
    include: {
      resource: true,
      organization: true,
    }
  });
}

export async function getResourceNeeds(filters: any, skip: number = 0, take: number = 20) {
  return await prisma.resourceNeed.findMany({
    where: filters,
    skip,
    take,
    include: {
      resource: true,
      organization: true,
    }
  });
}