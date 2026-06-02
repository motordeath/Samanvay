import { prisma } from '../prisma';
import { ConcurrencyConflictError } from '../modules/volunteers/shared/errors';

export async function createEvent(data: any) {
  return await prisma.event.create({ data });
}

export async function getEvents(skip: number = 0, take: number = 20) {
  return await prisma.event.findMany({
    skip,
    take,
  });
}

export async function getEventById(id: string) {
  return await prisma.event.findUnique({ where: { id } });
}

export async function updateEvent(id: string, data: any) {
  return await prisma.$transaction(async (tx) => {
    const currentEvent = await tx.event.findUnique({ where: { id } });
    if (!currentEvent) {
      throw new Error('Event not found');
    }

    if (data.status) {
      if (currentEvent.status === 'CANCELLED' && data.status !== 'CANCELLED') {
        throw new Error('StateTransitionError: Cannot transition from CANCELLED');
      }
      if (currentEvent.status === 'COMPLETED' && data.status !== 'COMPLETED') {
        throw new Error('StateTransitionError: Cannot transition from COMPLETED');
      }
    }

    const updateResult = await tx.event.updateMany({
      where: { id, status: currentEvent.status },
      data,
    });

    if (updateResult.count !== 1) {
      throw new ConcurrencyConflictError('Event state changed concurrently.');
    }

    const updatedEvent = await tx.event.findUnique({
      where: { id },
    });

    if (data.status === 'CANCELLED') {
      await tx.volunteerNeed.updateMany({
        where: {
          eventId: id,
          status: 'OPEN',
        },
        data: {
          status: 'CLOSED',
        },
      });

      const assignments = await tx.volunteerAssignment.findMany({
        where: {
          need: {
            eventId: id,
          },
          status: 'ASSIGNED',
        },
      });

      for (const assignment of assignments) {
        await tx.volunteerAssignment.update({
          where: { id: assignment.id },
          data: { status: 'CANCELLED' },
        });

        await tx.volunteerAudit.create({
          data: {
            volunteerId: assignment.volunteerId,
            action: 'ASSIGNMENT_CANCELLED',
            entityType: 'VOLUNTEER_ASSIGNMENT',
            entityId: assignment.id,
            metadata: {
              reason: 'EVENT_CANCELLED',
              eventId: id,
              assignmentId: assignment.id,
            },
          },
        });
      }
    }

    return updatedEvent;
  });
}
