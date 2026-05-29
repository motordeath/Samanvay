import { prisma } from '../prisma';

export async function createMembership(data: any) {
  return await prisma.membership.create({ data });
}

export async function getOrganizationMembers(organizationId: string) {
  return await prisma.membership.findMany({
    where: { organizationId },
    include: { user: true },
  });
}
