import { prisma } from '../prisma';

export async function createOrganization(data: any) {
  return await prisma.organization.create({ data });
}

export async function getOrganizations(skip: number = 0, take: number = 20) {
  return await prisma.organization.findMany({
    skip,
    take,
  });
}

export async function getOrganizationById(id: string) {
  return await prisma.organization.findUnique({ where: { id } });
}

export async function updateOrganization(id: string, data: any) {
  return await prisma.organization.update({
    where: { id },
    data,
  });
}
