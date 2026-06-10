import { prisma } from '../prisma';

export async function createResourceLot(data: any) {
  if (data.quantity <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }

  return await prisma.resourceLot.create({
    data: {
      organizationId: data.organizationId,
      resourceId: data.resourceId,
      quantity: data.quantity,
      availableQuantity: data.quantity, // Initially, all is available
      notes: data.notes,
    },
  });
}

export async function getLotById(id: string) {
  return await prisma.resourceLot.findUnique({ where: { id } });
}

// Ensure ownership when modifying
export async function updateResourceLot(id: string, organizationId: string, data: any) {
  const lot = await getLotById(id);
  if (!lot) throw new Error('ResourceLot not found.');
  if (lot.organizationId !== organizationId) {
    throw new Error('Ownership Rule Violation: Only the owning organization may modify a ResourceLot.');
  }

  // Handle inventory constraint
  const newQuantity = data.quantity ?? lot.quantity;
  const newAvailable = data.availableQuantity ?? lot.availableQuantity;
  
  if (newQuantity <= 0) throw new Error('Quantity must be positive.');
  if (newAvailable < 0) throw new Error('Available quantity cannot be negative.');
  if (newAvailable > newQuantity) throw new Error('Available quantity cannot exceed total quantity.');

  return await prisma.resourceLot.update({
    where: { id },
    data,
  });
}

export async function getResourceLots(filters: any, skip: number = 0, take: number = 20) {
  const lots = await prisma.resourceLot.findMany({
    where: filters,
    skip,
    take,
    include: {
      resource: true,
      organization: true
    }
  });

  if (process.env.STABILIZATION_DEBUG && lots.length > 0) {
    console.log('[LOTS]', JSON.stringify(lots[0], null, 2));
  }

  return lots;
}
