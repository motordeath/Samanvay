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

describe('Organization Ownership Validation (HIGH-01)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('allows access when user is an OWNER of the target organization', async () => {
    // Org A and User A (OWNER of Org A)
    const orgA = await createTestOrganization();
    const userA = await createTestUser();
    await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'OWNER', status: 'ACTIVE' } });

    const token = generateToken(userA.id);

    const res = await request(app)
      .patch(`/organizations/${orgA.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationId: orgA.id,
        name: 'Modified Name A',
      });

    expect(res.status).toBe(200);

    const updatedOrg = await prisma.organization.findUnique({ where: { id: orgA.id } });
    expect(updatedOrg?.name).toBe('Modified Name A');
  });

  it('denies access during a cross-organization attack', async () => {
    // Org A
    const orgA = await createTestOrganization();
    const orgAOriginalName = orgA.name;

    // Org B and User B (OWNER of Org B only)
    const orgB = await createTestOrganization();
    const userB = await createTestUser();
    await prisma.membership.create({ data: { userId: userB.id, organizationId: orgB.id, role: 'OWNER', status: 'ACTIVE' } });

    const token = generateToken(userB.id);

    const res = await request(app)
      .patch(`/organizations/${orgA.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationId: orgB.id, // Attempting to pass role check using Org B context
        name: 'Compromised',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Access denied for organization');

    const unchangedOrgA = await prisma.organization.findUnique({ where: { id: orgA.id } });
    expect(unchangedOrgA?.name).toBe(orgAOriginalName);
    expect(unchangedOrgA?.name).not.toBe('Compromised');
  });

  it('returns 404 for a missing organization', async () => {
    const orgA = await createTestOrganization();
    const userA = await createTestUser();
    await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'OWNER', status: 'ACTIVE' } });

    const token = generateToken(userA.id);
    const nonExistentOrgId = '00000000-0000-0000-0000-000000000000';

    const res = await request(app)
      .patch(`/organizations/${nonExistentOrgId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationId: orgA.id,
        name: 'Modified Name',
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Organization not found');
  });
});
