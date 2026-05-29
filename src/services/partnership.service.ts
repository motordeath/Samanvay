import { prisma } from '../prisma';

export async function createPartnership(data: any) {
  return await prisma.partnership.create({ data });
}

export async function updatePartnership(id: string, data: any) {
  return await prisma.partnership.update({
    where: { id },
    data,
  });
}
