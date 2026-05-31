import { prisma } from '../prisma';

export async function createMembership(data: any) {
  return await prisma.membership.create({ data });
}

export async function getOrganizationMembers(organizationId: string, skip: number = 0, take: number = 20) {
  return await prisma.membership.findMany({
    where: { organizationId },
    skip,
    take,
    select: {
      id: true,
      userId: true,
      organizationId: true,
      role: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
