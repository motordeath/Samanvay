import { prisma } from '../prisma';

export async function createResource(data: any) {
  return await prisma.resource.create({ data });
}

export async function getResources() {
  return await prisma.resource.findMany();
}

export async function getResourceById(id: string) {
  return await prisma.resource.findUnique({ where: { id } });
}
