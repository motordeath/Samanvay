import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { updateMembershipStatus, createMembership } from '../../services/membership.service';

describe('Membership Invalidation Propagation', () => {
  let user: any;
  let org: any;
  let membership: any;
  let volunteer: any;

  beforeEach(async () => {
    await clearDatabase(prisma);
    user = await createTestUser();
    org = await createTestOrganization();
    
    membership = await createMembership({
      userId: user.id,
      organizationId: org.id,
      role: 'VOLUNTEER',
      status: 'ACTIVE',
    });

    volunteer = await prisma.volunteer.create({
      data: { userId: user.id }
    });
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('cancels all ASSIGNED assignments when membership becomes INACTIVE', async () => {
    // 1. Create Need
    const need = await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        title: 'Need medics',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'OPEN',
        createdBy: user.id,
      }
    });

    // 2. Create Assignments (one ASSIGNED, one COMPLETED)
    const assignment1 = await prisma.volunteerAssignment.create({
      data: {
        volunteerId: volunteer.id,
        needId: need.id,
        status: 'ASSIGNED',
        createdBy: user.id,
      }
    });

    // 3. Update Membership
    await updateMembershipStatus(membership.id, 'INACTIVE');

    // 4. Verify Propagation
    const updatedAssignment1 = await prisma.volunteerAssignment.findUnique({ where: { id: assignment1.id } });
    expect(updatedAssignment1?.status).toBe('CANCELLED');

    const auditLogs = await prisma.volunteerAudit.findMany({
      where: { entityId: assignment1.id, action: 'ASSIGNMENT_CANCELLED' }
    });
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].metadata).toMatchObject({ reason: 'MEMBERSHIP_INACTIVE' });
  });
});
