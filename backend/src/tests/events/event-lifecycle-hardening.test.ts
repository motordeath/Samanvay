import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { updateEvent } from '../../services/event.service';

describe('Event Lifecycle Enum Hardening', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const setupEvent = async (status: any = 'DRAFT') => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Event',
        type: 'Type',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
        status: status,
      },
    });

    return { event };
  };

  it('CANCELLED cannot republish', async () => {
    const { event } = await setupEvent('CANCELLED');

    await expect(updateEvent(event.id, { status: 'PUBLISHED' }))
      .rejects.toThrow('StateTransitionError: Cannot transition from CANCELLED');
  });

  it('COMPLETED cannot revert to draft', async () => {
    const { event } = await setupEvent('COMPLETED');

    await expect(updateEvent(event.id, { status: 'DRAFT' }))
      .rejects.toThrow('StateTransitionError: Cannot transition from COMPLETED');
  });

  it('Valid transitions succeed', async () => {
    const { event } = await setupEvent('DRAFT');

    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    if (!updated) throw new Error('Event missing');
    expect(updated.status).toBe('IN_PROGRESS');
  });
});
