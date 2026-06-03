import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { updateEvent } from '../../services/event.service';

describe('Event → Assignment Propagation', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const setupData = async (status: any = 'ASSIGNED') => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const volunteer = await prisma.volunteer.create({
      data: { userId: user.id },
    });

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Event',
        type: 'Type',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
        status: 'PUBLISHED',
      },
    });

    const need = await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        eventId: event.id,
        title: 'Need',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
        status: 'OPEN',
      },
    });

    const assignment = await prisma.volunteerAssignment.create({
      data: {
        volunteerId: volunteer.id,
        needId: need.id,
        status: status,
        createdBy: user.id,
      },
    });

    return { org, user, volunteer, event, need, assignment };
  };

  it('Event cancellation cancels ASSIGNED assignments', async () => {
    const { event, assignment } = await setupData('ASSIGNED');
    await updateEvent(event.id, { status: 'CANCELLED' });

    const updated = await prisma.volunteerAssignment.findUnique({ where: { id: assignment.id } });
    expect(updated?.status).toBe('CANCELLED');
    
    // Check audit trace
    const audit = await prisma.volunteerAudit.findFirst({
      where: { entityId: assignment.id, action: 'ASSIGNMENT_CANCELLED' }
    });
    expect(audit).not.toBeNull();
  });

  it('CHECKED_IN assignments survive', async () => {
    const { event, assignment } = await setupData('CHECKED_IN');
    await updateEvent(event.id, { status: 'CANCELLED' });

    const updated = await prisma.volunteerAssignment.findUnique({ where: { id: assignment.id } });
    expect(updated?.status).toBe('CHECKED_IN');
  });

  it('COMPLETED assignments survive', async () => {
    const { event, assignment } = await setupData('COMPLETED');
    await updateEvent(event.id, { status: 'CANCELLED' });

    const updated = await prisma.volunteerAssignment.findUnique({ where: { id: assignment.id } });
    expect(updated?.status).toBe('COMPLETED');
  });

  it('Attendance survives propagation', async () => {
    const { event, assignment } = await setupData('CHECKED_IN');
    
    await prisma.volunteerAttendance.create({
      data: {
        assignmentId: assignment.id,
        checkInTime: new Date(),
      }
    });

    await updateEvent(event.id, { status: 'CANCELLED' });

    const attendance = await prisma.volunteerAttendance.findUnique({ where: { assignmentId: assignment.id } });
    expect(attendance).not.toBeNull();
  });

  it('Unrelated event assignments unaffected', async () => {
    const { org, user, volunteer, event } = await setupData('ASSIGNED');

    const event2 = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Event 2',
        type: 'Type',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
        status: 'PUBLISHED',
      },
    });

    const need2 = await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        eventId: event2.id,
        title: 'Need 2',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
        status: 'OPEN',
      },
    });

    const assignment2 = await prisma.volunteerAssignment.create({
      data: {
        volunteerId: volunteer.id,
        needId: need2.id,
        status: 'ASSIGNED',
        createdBy: user.id,
      },
    });

    await updateEvent(event.id, { status: 'CANCELLED' });

    const updated2 = await prisma.volunteerAssignment.findUnique({ where: { id: assignment2.id } });
    expect(updated2?.status).toBe('ASSIGNED');
  });
});
