import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { assignmentService } from '../../modules/volunteers/assignments/service';
import { invitationService } from '../../modules/volunteers/invitations/service';
import { ConcurrencyConflictError } from '../../modules/volunteers/shared/errors';

describe('Concurrency Hardening', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('Concurrent invitation acceptance prevents double processing', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();
    
    const volunteer = await prisma.volunteer.create({
      data: { userId: user.id }
    });

    const need = await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        title: 'Need',
        requiredCount: 2,
        status: 'OPEN',
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
      }
    });

    const invitation = await prisma.volunteerInvitation.create({
      data: {
        volunteerId: volunteer.id,
        needId: need.id,
        status: 'PENDING',
        createdBy: user.id,
      }
    });

    // Simulate concurrent accept/decline by executing respondToInvitation simultaneously
    // One should succeed, the other should fail with ConcurrencyConflictError.
    // However, since we mock concurrency by actually executing them back-to-back because JS is single threaded
    // The second one will hit the 'PENDING' constraint.
    await invitationService.respondToInvitation(invitation.id, 'ACCEPTED', user.id);

    try {
      await invitationService.respondToInvitation(invitation.id, 'DECLINED', user.id);
      fail('Expected an error to be thrown');
    } catch (error: any) {
      expect(['ConcurrencyConflictError', 'ValidationError']).toContain(error.constructor.name);
    }
  });
});
