import request from 'supertest';
import app from '../../app';
import { clearDatabase } from '../helpers/clearDatabase';
import { prisma } from '../../prisma';
import { randomUUID } from 'crypto';

/**
 * Route Protection Tests — Phase 3.3.1
 *
 * Verifies that critical workflow endpoints enforce:
 *  - Authentication (JWT via Bearer token)
 *  - Authorization (membership + role via requireOrganizationRole)
 *
 * Each test group creates its own isolated user/org/data fixture via the
 * real auth API, then exercises the protected route.
 */
jest.setTimeout(60000);

describe('Route Protection for Critical Workflows', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  // ---------------------------------------------------------------------------
  // Fixture helpers
  // ---------------------------------------------------------------------------

  /** Register via HTTP and return token + userId. */
  const registerUser = async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: `test-${randomUUID()}@example.com`,
      password: 'password123',
    });
    if (res.status !== 201) throw new Error(`Register failed: ${JSON.stringify(res.body)}`);
    return { token: res.body.data.token as string, user: res.body.data.user };
  };

  /** Create org + register user + optionally join with given role. */
  const setupAuth = async (role: string | null = null) => {
    const { token, user } = await registerUser();
    const org = await prisma.organization.create({
      data: { name: `Org-${randomUUID()}`, type: 'NGO', sector: 'Relief' },
    });
    if (role) {
      await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role, status: 'ACTIVE' } });
    }
    return { token, org, user };
  };

  /**
   * Create a self-consistent need fixture.
   * The resource, lot and need all share the SAME resourceId.
   */
  const setupNeedWithLot = async (orgId: string, userId: string) => {
    const resource = await prisma.resource.create({
      data: { name: `Res-${randomUUID()}`, unit: 'KG' },
    });
    const lot = await prisma.resourceLot.create({
      data: { organizationId: orgId, resourceId: resource.id, quantity: 100, availableQuantity: 100 },
    });
    const need = await prisma.resourceNeed.create({
      data: { organizationId: orgId, resourceId: resource.id, quantity: 10, createdById: userId },
    });
    return { resource, lot, need };
  };

  /** Create an offer against an existing need+lot, using the same resource. */
  const setupOffer = async (needId: string, lotId: string, orgId: string, userId: string) => {
    return prisma.resourceOffer.create({
      data: {
        needId,
        offeringOrganizationId: orgId,
        resourceLotId: lotId,
        offeredQuantity: 10,
        createdById: userId,
        status: 'PENDING',
      },
    });
  };

  /** Insert a transfer directly, bypassing the engine (for state-machine tests). */
  const setupTransfer = async (offer: any, need: any) => {
    return prisma.transfer.create({
      data: {
        offerId: offer.id,
        needId: need.id,
        resourceId: need.resourceId,
        fromOrganizationId: offer.offeringOrganizationId,
        toOrganizationId: need.organizationId,
        quantity: offer.offeredQuantity,
        status: 'PENDING',
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Resource Needs — Cancel
  // ---------------------------------------------------------------------------

  describe('Resource Needs - Cancel', () => {
    it.each(['OWNER', 'ADMIN', 'COORDINATOR'])('allows %s to cancel need', async (role) => {
      const { token, org, user } = await setupAuth(role);
      const { need } = await setupNeedWithLot(org.id, user.id);

      const res = await request(app)
        .post(`/api/needs/${need.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id });

      expect(res.status).toBe(200);
    });

    it.each(['VOLUNTEER', 'VIEWER'])('denies %s from canceling need', async (role) => {
      const { token, org, user } = await setupAuth(role);
      const { need } = await setupNeedWithLot(org.id, user.id);

      const res = await request(app)
        .post(`/api/needs/${need.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id });

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Resource Offers — Accept / Reject / Withdraw
  // ---------------------------------------------------------------------------

  describe('Resource Offers - Accept/Reject/Withdraw', () => {
    it.each(['OWNER', 'ADMIN', 'COORDINATOR'])('allows %s to accept offer', async (role) => {
      const { token, org, user } = await setupAuth(role);
      const { lot, need } = await setupNeedWithLot(org.id, user.id);
      const offer = await setupOffer(need.id, lot.id, org.id, user.id);

      const res = await request(app)
        .post(`/api/offers/${offer.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id, userId: user.id });

      expect(res.status).toBe(200);
    });

    it.each(['OWNER', 'ADMIN', 'COORDINATOR'])('allows %s to reject offer', async (role) => {
      const { token, org, user } = await setupAuth(role);
      const { lot, need } = await setupNeedWithLot(org.id, user.id);
      const offer = await setupOffer(need.id, lot.id, org.id, user.id);

      const res = await request(app)
        .post(`/api/offers/${offer.id}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id });

      expect(res.status).toBe(200);
    });

    it.each(['VOLUNTEER', 'VIEWER'])('denies %s from accepting offer', async (role) => {
      const { token, org, user } = await setupAuth(role);
      const { lot, need } = await setupNeedWithLot(org.id, user.id);
      const offer = await setupOffer(need.id, lot.id, org.id, user.id);

      const res = await request(app)
        .post(`/api/offers/${offer.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id, userId: user.id });

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Transfers — Complete / Cancel
  // ---------------------------------------------------------------------------

  describe('Transfers - Complete/Cancel', () => {
    it.each(['OWNER', 'ADMIN', 'COORDINATOR'])('allows %s to complete transfer', async (role) => {
      const { token, org, user } = await setupAuth(role);
      const { lot, need } = await setupNeedWithLot(org.id, user.id);
      const offer = await setupOffer(need.id, lot.id, org.id, user.id);
      const transfer = await setupTransfer(offer, need);

      // Advance to IN_TRANSIT so the engine allows completion
      await prisma.transfer.update({ where: { id: transfer.id }, data: { status: 'IN_TRANSIT' } });

      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id });

      expect(res.status).not.toBe(403);
    });

    it.each(['OWNER', 'ADMIN'])('allows %s to cancel transfer', async (role) => {
      const { token, org, user } = await setupAuth(role);
      const { lot, need } = await setupNeedWithLot(org.id, user.id);
      const offer = await setupOffer(need.id, lot.id, org.id, user.id);
      const transfer = await setupTransfer(offer, need);

      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id });

      expect(res.status).not.toBe(403);
    });

    it('denies COORDINATOR from canceling transfer', async () => {
      const { token, org, user } = await setupAuth('COORDINATOR');
      const { lot, need } = await setupNeedWithLot(org.id, user.id);
      const offer = await setupOffer(need.id, lot.id, org.id, user.id);
      const transfer = await setupTransfer(offer, need);

      const res = await request(app)
        .post(`/api/transfers/${transfer.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id });

      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Missing organization context
  // ---------------------------------------------------------------------------

  describe('Missing Organization Context', () => {
    it('returns 400 when organizationId is absent from a protected route', async () => {
      const { token, org, user } = await setupAuth('ADMIN');
      const { need } = await setupNeedWithLot(org.id, user.id);

      const res = await request(app)
        .post(`/api/needs/${need.id}/cancel`)
        .set('Authorization', `Bearer ${token}`)
        .send({}); // No organizationId

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Organization context required');
    });
  });

  // ---------------------------------------------------------------------------
  // Authentication guard
  // ---------------------------------------------------------------------------

  describe('Authentication Scenarios', () => {
    it('returns 401 when token is missing', async () => {
      const { org, user } = await setupAuth('ADMIN');
      const { need } = await setupNeedWithLot(org.id, user.id);

      const res = await request(app)
        .post(`/api/needs/${need.id}/cancel`)
        .send({ organizationId: org.id });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Missing or invalid authentication token');
    });

    it('returns 401 when token is invalid', async () => {
      const { org, user } = await setupAuth('ADMIN');
      const { need } = await setupNeedWithLot(org.id, user.id);

      const res = await request(app)
        .post(`/api/needs/${need.id}/cancel`)
        .set('Authorization', 'Bearer invalid_token')
        .send({ organizationId: org.id });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
    });
  });
});
