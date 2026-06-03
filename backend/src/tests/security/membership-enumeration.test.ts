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

describe('Membership Enumeration Protection (HIGH-03)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('allows access for a user who is a member of the organization', async () => {
    const orgA = await createTestOrganization();
    const userA = await createTestUser();
    await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'VOLUNTEER', status: 'ACTIVE' } });

    const token = generateToken(userA.id);

    const res = await request(app)
      .get(`/memberships/org/${orgA.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].user).toBeDefined();
    expect(res.body.data[0].user.passwordHash).toBeUndefined(); // Data Minimization check
  });

  it('denies access for a user from an unrelated organization', async () => {
    const orgA = await createTestOrganization();
    
    // User B belongs to Org B only
    const orgB = await createTestOrganization();
    const userB = await createTestUser();
    await prisma.membership.create({ data: { userId: userB.id, organizationId: orgB.id, role: 'OWNER', status: 'ACTIVE' } });

    const token = generateToken(userB.id);

    const res = await request(app)
      .get(`/memberships/org/${orgA.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Access denied for organization members');
  });

  it('denies access for an anonymous user', async () => {
    const orgA = await createTestOrganization();

    const res = await request(app)
      .get(`/memberships/org/${orgA.id}`);

    console.log('ANON STATUS:', res.status);
    console.log('ANON BODY:', res.body);

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});
