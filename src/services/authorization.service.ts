import { prisma } from '../prisma';
import { Membership, Transfer, Partnership } from '@prisma/client';

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

export async function requireTransferAccess(userId: string, transferId: string): Promise<Transfer> {
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  const membershipFrom = await getMembership(userId, transfer.fromOrganizationId);
  const membershipTo = await getMembership(userId, transfer.toOrganizationId);

  if (!membershipFrom && !membershipTo) {
    throw new Error('Access denied for transfer');
  }

  return transfer;
}

export async function requirePartnershipAccess(userId: string, partnershipId: string): Promise<Partnership> {
  const partnership = await prisma.partnership.findUnique({
    where: { id: partnershipId },
  });

  if (!partnership) {
    throw new Error('Partnership not found');
  }

  const membershipReq = await getMembership(userId, partnership.requestingOrganizationId);
  const membershipTarget = await getMembership(userId, partnership.targetOrganizationId);

  if (!membershipReq && !membershipTarget) {
    throw new Error('Access denied for partnership');
  }

  return partnership;
}
