import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestOrganization, createTestUser } from '../helpers/testFactory';
import { sign } from 'jsonwebtoken';
import { env } from '../../config/env';

const generateToken = (userId: string) => sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });

describe('Unbounded Pagination Protection (HIGH-09)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('paginates GET /organizations', async () => {
    // Create 25 organizations
    const orgs = [];
    for (let i = 0; i < 25; i++) {
      orgs.push({
        name: `org-${i}`,
        type: 'NGO',
        sector: 'Health',
      });
    }
    await prisma.organization.createMany({ data: orgs });

    const res = await request(app).get('/organizations?page=1&limit=5');
    
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('paginates GET /events', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();
    
    // Create 25 events
    const events = [];
    for (let i = 0; i < 25; i++) {
      events.push({
        title: `event-${i}`,
        type: 'WORKSHOP',
        organizationId: org.id,
        startDate: new Date(),
        endDate: new Date(),
        createdById: user.id,
      });
    }
    await prisma.event.createMany({ data: events });

    const res = await request(app).get('/events?page=1&limit=5');
    
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });

  it('paginates GET /memberships/org/:id', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();
    
    // Create an active OWNER membership so the user can access the endpoint
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'OWNER', status: 'ACTIVE' },
    });

    // Create 24 more memberships (25 total)
    for (let i = 0; i < 24; i++) {
      const u = await createTestUser();
      await prisma.membership.create({
        data: { userId: u.id, organizationId: org.id, role: 'VOLUNTEER', status: 'ACTIVE' },
      });
    }

    const token = generateToken(user.id);

    const res = await request(app)
      .get(`/memberships/org/${org.id}?page=1&limit=5`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(5);
  });
});
