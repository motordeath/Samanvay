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

describe('Membership Status Validation Bypass (HIGH-01)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('allows access for an ACTIVE OWNER', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();
    
    // Status ACTIVE
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'OWNER', status: 'ACTIVE' },
    });

    const token = generateToken(user.id);

    // Using PATCH /organizations/:id which requires requireOrganizationAccess -> requireMembership
    const res = await request(app)
      .patch(`/organizations/${org.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: org.id, name: 'Updated Org Name' });

    expect(res.status).toBe(200);
  });

  it('denies access for a PENDING OWNER', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();
    
    // Status PENDING
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'OWNER', status: 'PENDING' },
    });

    const token = generateToken(user.id);

    const res = await request(app)
      .patch(`/organizations/${org.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: org.id, name: 'Updated Org Name' });

    expect(res.status).toBe(403);
  });

  it('denies access for a REJECTED OWNER', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();
    
    // Status REJECTED
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'OWNER', status: 'REJECTED' },
    });

    const token = generateToken(user.id);

    const res = await request(app)
      .patch(`/organizations/${org.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: org.id, name: 'Updated Org Name' });

    expect(res.status).toBe(403);
  });

  it('denies access for a SUSPENDED OWNER', async () => {
    const org = await createTestOrganization();
    const user = await createTestUser();
    
    // Status SUSPENDED
    await prisma.membership.create({
      data: { userId: user.id, organizationId: org.id, role: 'OWNER', status: 'SUSPENDED' },
    });

    const token = generateToken(user.id);

    const res = await request(app)
      .patch(`/organizations/${org.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: org.id, name: 'Updated Org Name' });

    expect(res.status).toBe(403);
  });
});
