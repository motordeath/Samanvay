import { prisma } from '../prisma';
import { Membership, Transfer, Partnership, Event } from '@prisma/client';

export async function getMembership(userId: string, organizationId: string): Promise<Membership | null> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    include: {
      organization: true,
    },
  });

  if (
    !membership ||
    membership.status !== 'ACTIVE' ||
    (membership as any).organization.status !== 'ACTIVE'
  ) {
    return null;
  }

  return membership;
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

export async function requireTransferAccess(userId: string, transferId: string, allowedRoles: string[]): Promise<Transfer> {
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
  });

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  const membershipFrom = await getMembership(userId, transfer.fromOrganizationId);
  const membershipTo = await getMembership(userId, transfer.toOrganizationId);

  const validFrom = membershipFrom && allowedRoles.includes(membershipFrom.role);
  const validTo = membershipTo && allowedRoles.includes(membershipTo.role);

  if (!validFrom && !validTo) {
    throw new Error('Access denied for transfer');
  }

  return transfer;
}

export async function requirePartnershipAccess(userId: string, partnershipId: string, allowedRoles: string[]): Promise<Partnership> {
  const partnership = await prisma.partnership.findUnique({
    where: { id: partnershipId },
  });

  if (!partnership) {
    throw new Error('Partnership not found');
  }

  const membershipReq = await getMembership(userId, partnership.requestingOrganizationId);
  const membershipTarget = await getMembership(userId, partnership.targetOrganizationId);

  const validReq = membershipReq && allowedRoles.includes(membershipReq.role);
  const validTarget = membershipTarget && allowedRoles.includes(membershipTarget.role);

  if (!validReq && !validTarget) {
    throw new Error('Access denied for partnership');
  }

  return partnership;
}

export async function requireOrganizationAccess(userId: string, organizationId: string, allowedRoles: string[]): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  const membership = await getMembership(userId, organizationId);
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new Error('Access denied for organization');
  }
}

export async function requireEventAccess(userId: string, eventId: string, allowedRoles: string[]): Promise<Event> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found');
  }

  const membership = await getMembership(userId, event.organizationId);
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new Error('Access denied for event');
  }

  return event;
}

export async function requireMembershipAccess(userId: string, organizationId: string): Promise<void> {
  const membership = await getMembership(userId, organizationId);
  if (!membership) {
    throw new Error('Access denied for organization members');
  }
}
