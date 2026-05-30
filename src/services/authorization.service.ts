import { prisma } from '../prisma';
import { Membership } from '@prisma/client';

export async function getMembership(userId: string, organizationId: string): Promise<Membership | null> {
  return prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });
}

export async function requireMembership(userId: string, organizationId: string): Promise<Membership> {
  const membership = await getMembership(userId, organizationId);
  
  if (!membership) {
    throw new Error('Membership required');
  }
  
  return membership;
}

export async function hasRole(userId: string, organizationId: string, allowedRoles: string[]): Promise<boolean> {
  const membership = await getMembership(userId, organizationId);
  
  if (!membership) {
    return false;
  }
  
  return allowedRoles.includes(membership.role);
}

export async function requireRole(userId: string, organizationId: string, allowedRoles: string[]): Promise<void> {
  const membership = await requireMembership(userId, organizationId);
  
  if (!allowedRoles.includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }
}
