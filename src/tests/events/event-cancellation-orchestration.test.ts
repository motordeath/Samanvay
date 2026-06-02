import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { updateEvent } from '../../services/event.service';

describe('Event Cancellation Orchestration', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('Event Cancellation Closes OPEN Needs', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Test Event 1',
        type: 'General',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
      },
    });

    const volunteerNeed = await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        eventId: event.id,
        title: 'Need Volunteers',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
        status: 'OPEN',
      },
    });

    await updateEvent(event.id, { status: 'CANCELLED' });

    const need = await prisma.volunteerNeed.findUnique({
      where: { id: volunteerNeed.id },
    });

    expect(need?.status).toBe('CLOSED');
  });

  it('FILLED Needs Remain FILLED', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Test Event 2',
        type: 'General',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
      },
    });

    const volunteerNeed = await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        eventId: event.id,
        title: 'Need Volunteers',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
        status: 'FILLED',
      },
    });

    await updateEvent(event.id, { status: 'CANCELLED' });

    const need = await prisma.volunteerNeed.findUnique({
      where: { id: volunteerNeed.id },
    });

    expect(need?.status).toBe('FILLED');
  });

  it('Unrelated Needs Unaffected', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const event1 = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Test Event 3',
        type: 'General',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
      },
    });

    const event2 = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Test Event 4',
        type: 'General',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
      },
    });

    const volunteerNeed = await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        eventId: event2.id,
        title: 'Need Volunteers',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
        status: 'OPEN',
      },
    });

    await updateEvent(event1.id, { status: 'CANCELLED' });

    const need = await prisma.volunteerNeed.findUnique({
      where: { id: volunteerNeed.id },
    });

    expect(need?.status).toBe('OPEN');
  });
});
