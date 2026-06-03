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

describe('Resource Workflow Route Protection (CRIT-04)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const validLotPayload = (orgId: string) => ({
    organizationId: orgId,
    resourceId: '00000000-0000-0000-0000-000000000000', // random uuid, doesn't matter for auth testing
    quantity: 10,
  });

  const validNeedPayload = (orgId: string, userId: string) => ({
    organizationId: orgId,
    resourceId: '00000000-0000-0000-0000-000000000000',
    quantity: 10,
    createdById: userId,
  });

  const validOfferPayload = (orgId: string, userId: string) => ({
    offeringOrganizationId: orgId, // note: the endpoint might expect offeringOrganizationId in the body for the schema? wait, getOrganizationContext looks for organizationId.
    // Let's include organizationId as well to satisfy the context grabber if it looks for it.
    organizationId: orgId,
    needId: '00000000-0000-0000-0000-000000000000',
    resourceLotId: '00000000-0000-0000-0000-000000000000',
    offeredQuantity: 10,
    createdById: userId,
  });

  const validResourcePayload = () => ({
    name: 'Test Resource',
    unit: 'boxes',
  });

  describe('Unauthenticated Requests', () => {
    it('returns 401 for POST /api/resources', async () => {
      const res = await request(app).post('/api/resources').send(validResourcePayload());
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /api/resource-lots', async () => {
      const res = await request(app).post('/api/resource-lots').send(validLotPayload('00000000-0000-0000-0000-000000000000'));
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /api/needs', async () => {
      const res = await request(app).post('/api/needs').send(validNeedPayload('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'));
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /api/offers', async () => {
      const res = await request(app).post('/api/offers').send(validOfferPayload('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000'));
      expect(res.status).toBe(401);
    });
  });

  describe('Authorized Roles', () => {
    const authorizedRoles = ['OWNER', 'ADMIN', 'COORDINATOR'];

    for (const role of authorizedRoles) {
      it(`allows ${role} to create resources, lots, needs, and offers`, async () => {
        const org = await createTestOrganization();
        const user = await createTestUser();
        await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: 'ACTIVE' } });
        const token = generateToken(user.id);

        const resResource = await request(app)
          .post('/api/resources')
          .set('Authorization', `Bearer ${token}`)
          .send(validResourcePayload());
        expect(resResource.status).not.toBe(401);
        expect(resResource.status).not.toBe(403);

        const resLot = await request(app)
          .post('/api/resource-lots')
          .set('Authorization', `Bearer ${token}`)
          .send(validLotPayload(org.id));
        expect(resLot.status).not.toBe(401);
        expect(resLot.status).not.toBe(403);

        const resNeed = await request(app)
          .post('/api/needs')
          .set('Authorization', `Bearer ${token}`)
          .send(validNeedPayload(org.id, user.id));
        expect(resNeed.status).not.toBe(401);
        expect(resNeed.status).not.toBe(403);

        const resOffer = await request(app)
          .post('/api/offers')
          .set('Authorization', `Bearer ${token}`)
          .send(validOfferPayload(org.id, user.id));
        expect(resOffer.status).not.toBe(401);
        expect(resOffer.status).not.toBe(403);
      });
    }
  });

  describe('Unauthorized Roles', () => {
    const unauthorizedRoles = ['VOLUNTEER', 'VIEWER'];

    for (const role of unauthorizedRoles) {
      it(`denies ${role} from creating lots, needs, and offers, but allows resources`, async () => {
        const org = await createTestOrganization();
        const user = await createTestUser();
        await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: 'ACTIVE' } });
        const token = generateToken(user.id);

        // POST /api/resources has authenticate only, no role restriction
        const resResource = await request(app)
          .post('/api/resources')
          .set('Authorization', `Bearer ${token}`)
          .send(validResourcePayload());
        expect(resResource.status).not.toBe(401);
        expect(resResource.status).not.toBe(403);

        const resLot = await request(app)
          .post('/api/resource-lots')
          .set('Authorization', `Bearer ${token}`)
          .send(validLotPayload(org.id));
        expect(resLot.status).toBe(403);

        const resNeed = await request(app)
          .post('/api/needs')
          .set('Authorization', `Bearer ${token}`)
          .send(validNeedPayload(org.id, user.id));
        expect(resNeed.status).toBe(403);

        const resOffer = await request(app)
          .post('/api/offers')
          .set('Authorization', `Bearer ${token}`)
          .send(validOfferPayload(org.id, user.id));
        expect(resOffer.status).toBe(403);
      });
    }
  });
});
