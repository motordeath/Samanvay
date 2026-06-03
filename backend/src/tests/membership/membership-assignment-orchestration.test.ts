import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { updateMembershipStatus } from '../../services/membership.service';

describe('Membership → Assignment Orchestration', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const setupData = async (status: any = 'ASSIGNED') => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'VOLUNTEER',
        status: 'ACTIVE',
      },
    });

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

    return { org, user, membership, volunteer, need, assignment };
  };

  it('Membership Inactivation Cancels ASSIGNED Assignments', async () => {
    const { membership, assignment } = await setupData('ASSIGNED');
    await updateMembershipStatus(membership.id, 'INACTIVE');
    
    const updated = await prisma.volunteerAssignment.findUnique({ where: { id: assignment.id } });
    expect(updated?.status).toBe('CANCELLED');
  });

  it('CHECKED_IN Assignments Survive', async () => {
    const { membership, assignment } = await setupData('CHECKED_IN');
    await updateMembershipStatus(membership.id, 'INACTIVE');
    
    const updated = await prisma.volunteerAssignment.findUnique({ where: { id: assignment.id } });
    expect(updated?.status).toBe('CHECKED_IN');
  });

  it('CHECKED_OUT Assignments Survive', async () => {
    const { membership, assignment } = await setupData('CHECKED_OUT');
    await updateMembershipStatus(membership.id, 'INACTIVE');
    
    const updated = await prisma.volunteerAssignment.findUnique({ where: { id: assignment.id } });
    expect(updated?.status).toBe('CHECKED_OUT');
  });

  it('COMPLETED Assignments Survive', async () => {
    const { membership, assignment } = await setupData('COMPLETED');
    await updateMembershipStatus(membership.id, 'INACTIVE');
    
    const updated = await prisma.volunteerAssignment.findUnique({ where: { id: assignment.id } });
    expect(updated?.status).toBe('COMPLETED');
  });

  it('Other Organization Assignments Unaffected', async () => {
    const { membership, assignment, volunteer, user } = await setupData('ASSIGNED');
    
    const org2 = await createTestOrganization();
    
    const event2 = await prisma.event.create({
      data: {
        organizationId: org2.id,
        title: 'Event 2',
        type: 'Type',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
      },
    });

    const need2 = await prisma.volunteerNeed.create({
      data: {
        organizationId: org2.id,
        eventId: event2.id,
        title: 'Need 2',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
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

    await updateMembershipStatus(membership.id, 'INACTIVE');

    const updated1 = await prisma.volunteerAssignment.findUnique({ where: { id: assignment.id } });
    const updated2 = await prisma.volunteerAssignment.findUnique({ where: { id: assignment2.id } });

    expect(updated1?.status).toBe('CANCELLED');
    expect(updated2?.status).toBe('ASSIGNED');
  });

  it('Missing Volunteer Profile Safe', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'VOLUNTEER',
        status: 'ACTIVE',
      },
    });

    await updateMembershipStatus(membership.id, 'INACTIVE');
    const updated = await prisma.membership.findUnique({ where: { id: membership.id } });
    expect(updated?.status).toBe('INACTIVE');
  });

  it('Attendance Integrity Preserved', async () => {
    const { membership, assignment } = await setupData('CHECKED_IN');
    
    await prisma.volunteerAttendance.create({
      data: {
        assignmentId: assignment.id,
        checkInTime: new Date(),
      }
    });

    await updateMembershipStatus(membership.id, 'INACTIVE');
    
    const attendance = await prisma.volunteerAttendance.findUnique({ where: { assignmentId: assignment.id } });
    expect(attendance).not.toBeNull();
  });
});
