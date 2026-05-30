import { prisma } from '../prisma';

export async function createResource(data: any) {
  return await prisma.resource.create({ data });
}

export async function getResources(skip: number = 0, take: number = 20) {
  return await prisma.resource.findMany({
    skip,
    take,
  });
}

export async function getResourceById(id: string) {
  return await prisma.resource.findUnique({ where: { id } });
}
