import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';

describe('Event ↔ Volunteer Relation Integrity', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('VolunteerNeed loads related Event', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Test Event',
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
      },
    });

    const need = await prisma.volunteerNeed.findUnique({
      where: { id: volunteerNeed.id },
      include: { event: true },
    });

    expect(need?.event?.id).toBe(event.id);
  });

  it('Event loads volunteerNeeds', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const event = await prisma.event.create({
      data: {
        organizationId: org.id,
        title: 'Test Event',
        type: 'General',
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
      },
    });

    await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        eventId: event.id,
        title: 'Need Volunteers',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
      },
    });

    const loadedEvent = await prisma.event.findUnique({
      where: { id: event.id },
      include: { volunteerNeeds: true },
    });

    expect(loadedEvent?.volunteerNeeds.length).toBe(1);
  });

  it('Invalid eventId rejected', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    await expect(
      prisma.volunteerNeed.create({
        data: {
          organizationId: org.id,
          eventId: '00000000-0000-0000-0000-000000000000',
          title: 'Need Volunteers',
          requiredCount: 5,
          startDate: new Date(),
          endDate: new Date(),
          createdBy: user.id,
        },
      })
    ).rejects.toThrow();
  });

  it('Null eventId still allowed', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();

    const volunteerNeed = await prisma.volunteerNeed.create({
      data: {
        organizationId: org.id,
        title: 'Need Volunteers',
        requiredCount: 5,
        startDate: new Date(),
        endDate: new Date(),
        createdBy: user.id,
      },
    });

    expect(volunteerNeed.id).toBeDefined();
    expect(volunteerNeed.eventId).toBeNull();
  });
});
