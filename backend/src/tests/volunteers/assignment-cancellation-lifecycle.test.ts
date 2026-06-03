import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { assignmentService } from '../../modules/volunteers/assignments/service';

describe('Assignment Cancellation Lifecycle', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const setupBaseData = async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();
    
    const volunteer = await prisma.volunteer.create({
      data: {
        userId: user.id,
        isActive: true,
      }
    });

    const volNeed = await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        title: 'Need Volunteers',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
      },
    });

    return { volunteer, need: volNeed, userId: user.id };
  };

  it('ASSIGNED Can Transition To CANCELLED', async () => {
    const { volunteer, need, userId } = await setupBaseData();
    
    const assignment = await prisma.volunteerAssignment.create({
      data: {
        volunteerId: volunteer.id,
        needId: need.id,
        status: 'ASSIGNED',
        createdBy: userId,
      }
    });

    const updated = await assignmentService.updateAssignmentStatus(assignment.id, 'CANCELLED');
    expect(updated.status).toBe('CANCELLED');
    expect(updated.completedAt).toBeNull();
  });

  it('CHECKED_IN Cannot Transition To CANCELLED', async () => {
    const { volunteer, need, userId } = await setupBaseData();
    
    const assignment = await prisma.volunteerAssignment.create({
      data: {
        volunteerId: volunteer.id,
        needId: need.id,
        status: 'CHECKED_IN',
        createdBy: userId,
      }
    });

    await expect(assignmentService.updateAssignmentStatus(assignment.id, 'CANCELLED')).rejects.toThrow();
  });

  it('CHECKED_OUT Cannot Transition To CANCELLED', async () => {
    const { volunteer, need, userId } = await setupBaseData();
    
    const assignment = await prisma.volunteerAssignment.create({
      data: {
        volunteerId: volunteer.id,
        needId: need.id,
        status: 'CHECKED_OUT',
        createdBy: userId,
      }
    });

    await expect(assignmentService.updateAssignmentStatus(assignment.id, 'CANCELLED')).rejects.toThrow();
  });

  it('COMPLETED Cannot Transition To CANCELLED', async () => {
    const { volunteer, need, userId } = await setupBaseData();
    
    const assignment = await prisma.volunteerAssignment.create({
      data: {
        volunteerId: volunteer.id,
        needId: need.id,
        status: 'COMPLETED',
        createdBy: userId,
      }
    });

    await expect(assignmentService.updateAssignmentStatus(assignment.id, 'CANCELLED')).rejects.toThrow();
  });

  it('Attendance Integrity Preserved', async () => {
    const { volunteer, need, userId } = await setupBaseData();
    
    const assignment = await prisma.volunteerAssignment.create({
      data: {
        volunteerId: volunteer.id,
        needId: need.id,
        status: 'CHECKED_IN',
        createdBy: userId,
      }
    });

    await prisma.volunteerAttendance.create({
      data: {
        assignmentId: assignment.id,
        checkInTime: new Date(),
      }
    });

    await expect(assignmentService.updateAssignmentStatus(assignment.id, 'CANCELLED')).rejects.toThrow();
    
    const attendance = await prisma.volunteerAttendance.findUnique({
      where: { assignmentId: assignment.id }
    });
    
    expect(attendance).toBeDefined();
    expect(attendance?.checkInTime).not.toBeNull();
  });
});
