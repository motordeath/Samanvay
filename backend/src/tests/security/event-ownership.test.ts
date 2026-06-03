import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import {
  createTestOrganization,
  createTestUser,
} from '../helpers/testFactory';
import { sign } from 'jsonwebtoken';
import { env } from '../../config/env';

const generateToken = (userId: string) => sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });

describe('Event Ownership Validation (HIGH-02)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('allows access when user is a COORDINATOR of the target organization', async () => {
    // Org A and User A (COORDINATOR of Org A)
    const orgA = await createTestOrganization();
    const userA = await createTestUser();
    await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'COORDINATOR', status: 'ACTIVE' } });

    // Event A belongs to Org A
    const eventA = await prisma.event.create({
      data: {
        organizationId: orgA.id,
        title: 'Original Title',
        description: 'Original Description',
        startDate: new Date(),
        endDate: new Date(),
        type: 'DRIVE',
        createdById: userA.id,
      },
    });

    const token = generateToken(userA.id);

    const res = await request(app)
      .patch(`/events/${eventA.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationId: orgA.id,
        title: 'Modified Title',
      });

    expect(res.status).toBe(200);

    const updatedEvent = await prisma.event.findUnique({ where: { id: eventA.id } });
    expect(updatedEvent?.title).toBe('Modified Title');
  });

  it('denies access during a cross-organization attack', async () => {
    // Org A
    const orgA = await createTestOrganization();

    // User A
    const userA = await createTestUser();
    await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'COORDINATOR', status: 'ACTIVE' } });

    // Event A belongs to Org A
    const eventA = await prisma.event.create({
      data: {
        organizationId: orgA.id,
        title: 'Original Title',
        description: 'Original Description',
        startDate: new Date(),
        endDate: new Date(),
        type: 'DRIVE',
        createdById: userA.id,
      },
    });

    // Org B and User B (COORDINATOR of Org B only)
    const orgB = await createTestOrganization();
    const userB = await createTestUser();
    await prisma.membership.create({ data: { userId: userB.id, organizationId: orgB.id, role: 'COORDINATOR', status: 'ACTIVE' } });

    const token = generateToken(userB.id);

    const res = await request(app)
      .patch(`/events/${eventA.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationId: orgB.id, // Attempting to pass role check using Org B context
        title: 'Compromised Event',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Access denied for event');

    const unchangedEventA = await prisma.event.findUnique({ where: { id: eventA.id } });
    expect(unchangedEventA?.title).toBe('Original Title');
    expect(unchangedEventA?.title).not.toBe('Compromised Event');
  });

  it('returns 404 for a missing event', async () => {
    const orgA = await createTestOrganization();
    const userA = await createTestUser();
    await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'COORDINATOR', status: 'ACTIVE' } });

    const token = generateToken(userA.id);
    const nonExistentEventId = '00000000-0000-0000-0000-000000000000';

    const res = await request(app)
      .patch(`/events/${nonExistentEventId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationId: orgA.id,
        title: 'Modified Title',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Event not found');
  });
});
