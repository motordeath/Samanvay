import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import {
  createTestOrganization,
  createTestUser,
  createTestResource,
  createTestNeed,
  createTestOffer,
} from '../helpers/testFactory';
import { sign } from 'jsonwebtoken';
import { env } from '../../config/env';

const generateToken = (userId: string) => sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });

describe('Transfer Authorization (CRIT-03)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const setupTransfer = async () => {
    const orgFrom = await createTestOrganization();
    const orgTo = await createTestOrganization();
    const orgUnrelated = await createTestOrganization();

    const userFrom = await createTestUser();
    const userTo = await createTestUser();
    const userUnrelated = await createTestUser();

    // Create memberships
    await prisma.membership.create({ data: { userId: userFrom.id, organizationId: orgFrom.id, role: 'ADMIN', status: 'ACTIVE' } });
    await prisma.membership.create({ data: { userId: userTo.id, organizationId: orgTo.id, role: 'ADMIN', status: 'ACTIVE' } });
    await prisma.membership.create({ data: { userId: userUnrelated.id, organizationId: orgUnrelated.id, role: 'ADMIN', status: 'ACTIVE' } });

    // Setup basic resources for a transfer
    const resource = await createTestResource();
    const need = await createTestNeed({
      organizationId: orgTo.id,
      resourceId: resource.id,
      quantity: 10,
      createdById: userTo.id,
    });
    const lot = await prisma.resourceLot.create({
      data: {
        organizationId: orgFrom.id,
        resourceId: resource.id,
        quantity: 10,
        availableQuantity: 10,
      }
    });
    const offer = await createTestOffer({
      needId: need.id,
      offeringOrganizationId: orgFrom.id,
      resourceLotId: lot.id,
      offeredQuantity: 10,
      createdById: userFrom.id,
    });

    // Create the transfer directly (since we're testing authorization, not the state machine)
    const transfer = await prisma.transfer.create({
      data: {
        needId: need.id,
        offerId: offer.id,
        resourceId: resource.id,
        fromOrganizationId: orgFrom.id,
        toOrganizationId: orgTo.id,
        quantity: 10,
        status: 'PENDING',
      }
    });

    return {
      transfer,
      orgFrom, orgTo, orgUnrelated,
      userFrom, userTo, userUnrelated,
      tokenFrom: generateToken(userFrom.id),
      tokenTo: generateToken(userTo.id),
      tokenUnrelated: generateToken(userUnrelated.id),
    };
  };

  describe('Unauthenticated access', () => {
    it('returns 401 for GET /api/transfers/:id', async () => {
      const { transfer } = await setupTransfer();
      const res = await request(app).get(`/api/transfers/${transfer.id}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /api/transfers/:id/start', async () => {
      const { transfer } = await setupTransfer();
      const res = await request(app).post(`/api/transfers/${transfer.id}/start`);
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /api/transfers/:id/complete', async () => {
      const { transfer, orgFrom } = await setupTransfer();
      const res = await request(app).post(`/api/transfers/${transfer.id}/complete`).send({ organizationId: orgFrom.id });
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST /api/transfers/:id/cancel', async () => {
      const { transfer, orgFrom } = await setupTransfer();
      const res = await request(app).post(`/api/transfers/${transfer.id}/cancel`).send({ organizationId: orgFrom.id });
      expect(res.status).toBe(401);
    });
  });

  describe('Allowed access (fromOrganizationId)', () => {
    it('allows view', async () => {
      const { transfer, tokenFrom } = await setupTransfer();
      const res = await request(app)
        .get(`/api/transfers/${transfer.id}`)
        .set('Authorization', `Bearer ${tokenFrom}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows start', async () => {
      const { transfer, tokenFrom } = await setupTransfer();
      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/start`)
        .set('Authorization', `Bearer ${tokenFrom}`);
      expect(res.status).toBe(200);
    });

    it('allows complete', async () => {
      const { transfer, tokenFrom, orgFrom } = await setupTransfer();
      // Need to start it first for valid state machine, wait, we are just testing auth.
      // Assuming controller executes auth first.
      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/complete`)
        .set('Authorization', `Bearer ${tokenFrom}`)
        .send({ organizationId: orgFrom.id });

      // Might return 400 or 200, but definitely not 401/403
      // expect(res.status).not.toBe(401);
      // expect(res.status).not.toBe(403);
      expect([200, 400, 500]).toContain(res.status);
    });

    it('allows cancel', async () => {
      const { transfer, tokenFrom, orgFrom } = await setupTransfer();
      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/cancel`)
        .set('Authorization', `Bearer ${tokenFrom}`)
        .send({ organizationId: orgFrom.id });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('Allowed access (toOrganizationId)', () => {
    it('allows view', async () => {
      const { transfer, tokenTo } = await setupTransfer();
      const res = await request(app)
        .get(`/api/transfers/${transfer.id}`)
        .set('Authorization', `Bearer ${tokenTo}`);
      expect(res.status).toBe(200);
    });

    it('allows start', async () => {
      const { transfer, tokenTo } = await setupTransfer();
      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/start`)
        .set('Authorization', `Bearer ${tokenTo}`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('allows complete', async () => {
      const { transfer, tokenTo, orgTo } = await setupTransfer();
      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/complete`)
        .set('Authorization', `Bearer ${tokenTo}`)
        .send({ organizationId: orgTo.id });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('allows cancel', async () => {
      const { transfer, tokenTo, orgTo } = await setupTransfer();
      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/cancel`)
        .set('Authorization', `Bearer ${tokenTo}`)
        .send({ organizationId: orgTo.id });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('Denied access (unrelated organization)', () => {
    it('denies view', async () => {
      const { transfer, tokenUnrelated } = await setupTransfer();
      const res = await request(app)
        .get(`/api/transfers/${transfer.id}`)
        .set('Authorization', `Bearer ${tokenUnrelated}`);
      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('Access denied for transfer');
    });

    it('denies start', async () => {
      const { transfer, tokenUnrelated } = await setupTransfer();
      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/start`)
        .set('Authorization', `Bearer ${tokenUnrelated}`);
      expect(res.status).toBe(403);
    });

    it('denies complete', async () => {
      const { transfer, tokenUnrelated, orgUnrelated } = await setupTransfer();
      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/complete`)
        .set('Authorization', `Bearer ${tokenUnrelated}`)
        .send({ organizationId: orgUnrelated.id }); // They pass their own org ID to pass role check
      expect(res.status).toBe(403);
    });

    it('denies cancel', async () => {
      const { transfer, tokenUnrelated, orgUnrelated } = await setupTransfer();
      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/cancel`)
        .set('Authorization', `Bearer ${tokenUnrelated}`)
        .send({ organizationId: orgUnrelated.id });
      expect(res.status).toBe(403);
    });
  });
});
