import { prisma } from '../prisma';
import { ConcurrencyConflictError } from '../modules/volunteers/shared/errors';

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

export async function updateMembershipStatus(membershipId: string, status: string) {
  return await prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new Error('Membership not found');
    }

    const updateResult = await tx.membership.updateMany({
      where: { id: membershipId, status: membership.status },
      data: { status },
    });

    if (updateResult.count !== 1) {
      throw new ConcurrencyConflictError('Membership status changed concurrently.');
    }

    const updatedMembership = await tx.membership.findUnique({
      where: { id: membershipId },
    });

    await tx.auditLog.create({
      data: {
        action: 'MEMBERSHIP_STATUS_UPDATED',
        entityType: 'MEMBERSHIP',
        entityId: membershipId,
        userId: membership.userId,
        organizationId: membership.organizationId,
        metadata: {
          previousStatus: membership.status,
          newStatus: status,
        },
      },
    });

    if (status === 'INACTIVE') {
      const volunteer = await tx.volunteer.findUnique({
        where: { userId: membership.userId },
      });

      if (volunteer) {
        const assignments = await tx.volunteerAssignment.findMany({
          where: {
            volunteerId: volunteer.id,
            status: 'ASSIGNED',
            need: {
              organizationId: membership.organizationId,
            },
          },
          include: {
            need: true,
          },
        });

        for (const assignment of assignments) {
          await tx.volunteerAssignment.update({
            where: { id: assignment.id },
            data: { status: 'CANCELLED' },
          });

          await tx.volunteerAudit.create({
            data: {
              volunteerId: volunteer.id,
              action: 'ASSIGNMENT_CANCELLED',
              entityType: 'VOLUNTEER_ASSIGNMENT',
              entityId: assignment.id,
              metadata: {
                reason: 'MEMBERSHIP_INACTIVE',
                membershipId: membership.id,
                organizationId: membership.organizationId,
                assignmentId: assignment.id,
              },
            },
          });
        }
      }
    }

    return updatedMembership;
  });
}
