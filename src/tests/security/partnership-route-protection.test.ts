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

describe('Partnership Route Protection (CRIT-05A)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const validPostPayload = (orgId: string, targetOrgId: string, userId: string) => ({
    organizationId: orgId, // Needed for RBAC context resolution
    requestingOrganizationId: orgId,
    targetOrganizationId: targetOrgId,
    requestedById: userId,
  });

  const validPatchPayload = (orgId: string, userId: string) => ({
    organizationId: orgId,
    status: 'ACTIVE',
    updatedById: userId,
  });

  describe('Unauthenticated Requests', () => {
    it('returns 401 for POST /partnerships', async () => {
      const res = await request(app).post('/partnerships').send(validPostPayload('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'));
      expect(res.status).toBe(401);
    });

    it('returns 401 for PATCH /partnerships/:id', async () => {
      const res = await request(app).patch('/partnerships/test-id').send(validPatchPayload('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'));
      expect(res.status).toBe(401);
    });
  });

  describe('Authorized Roles', () => {
    const authorizedRoles = ['OWNER', 'ADMIN'];

    for (const role of authorizedRoles) {
      it(`allows ${role} to create and update partnerships`, async () => {
        const org = await createTestOrganization();
        const targetOrg = await createTestOrganization();
        const user = await createTestUser();
        await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: 'ACTIVE' } });
        const token = generateToken(user.id);

        const resPost = await request(app)
          .post('/partnerships')
          .set('Authorization', `Bearer ${token}`)
          .send(validPostPayload(org.id, targetOrg.id, user.id));
        expect(resPost.status).not.toBe(401);
        expect(resPost.status).not.toBe(403);

        const createdId = resPost.body.data.id;

        const resPatch = await request(app)
          .patch(`/partnerships/${createdId}`)
          .set('Authorization', `Bearer ${token}`)
          .send(validPatchPayload(org.id, user.id));
        expect(resPatch.status).not.toBe(401);
        expect(resPatch.status).not.toBe(403);
      });
    }
  });

  describe('Unauthorized Roles', () => {
    const unauthorizedRoles = ['COORDINATOR', 'VOLUNTEER', 'VIEWER'];

    for (const role of unauthorizedRoles) {
      it(`denies ${role} from creating and updating partnerships`, async () => {
        const org = await createTestOrganization();
        const targetOrg = await createTestOrganization();
        const user = await createTestUser();
        await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: 'ACTIVE' } });
        const token = generateToken(user.id);

        const resPost = await request(app)
          .post('/partnerships')
          .set('Authorization', `Bearer ${token}`)
          .send(validPostPayload(org.id, targetOrg.id, user.id));

        console.log(`[${role}] POST /partnerships status:`, resPost.status);
        console.log(`[${role}] POST body:`, resPost.body);
        expect(resPost.status).toBe(403);

        const createdPartnership = await prisma.partnership.create({
          data: {
            requestingOrganizationId: org.id,
            targetOrganizationId: targetOrg.id,
            status: 'PENDING',
            requestedById: user.id,
          },
        });

        const resPatch = await request(app)
          .patch(`/partnerships/${createdPartnership.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send(validPatchPayload(org.id, user.id));

        console.log(`[${role}] PATCH /partnerships/:id status:`, resPatch.status);
        expect(resPatch.status).toBe(403);
      });
    }
  });
});
