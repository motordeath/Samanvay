import { prisma } from '../prisma';

export async function createOrganization(data: any) {
  return await prisma.organization.create({ data });
}

export async function getOrganizations() {
  return await prisma.organization.findMany();
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
