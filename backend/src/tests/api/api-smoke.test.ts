import request from 'supertest';
import app from '../../app';
import { clearDatabase } from '../helpers/clearDatabase';
import { prisma } from '../../prisma';
import { randomUUID } from 'crypto';

/**
 * API Smoke Tests — Resource Coordination Engine
 *
 * Tests exercise the full HTTP surface end-to-end against a real database.
 * Phase 3.3: protected routes (accept/reject/withdraw/complete/cancel) require
 *   - Authorization: Bearer <token>
 *   - { organizationId } in the body
 *   - The authenticated user must be a member of that org with a qualifying role.
 *
 * Verified field contracts (from controllers + Zod schemas):
 *
 *   POST /users             → { name, email, password }
 *   POST /organizations     → { name, type, sector }
 *   POST /api/resources     → { name, unit, description? }
 *   POST /api/resource-lots → { organizationId, resourceId, quantity, notes? }
 *   POST /api/needs         → { organizationId, resourceId, quantity, createdById }
 *   POST /api/offers        → { needId, offeringOrganizationId, resourceLotId, offeredQuantity, createdById }
 *   POST /api/offers/:id/accept → { organizationId, userId }  [AUTH REQUIRED, min role: COORDINATOR]
 */
jest.setTimeout(60000);

describe('API Smoke Tests - Resource Coordination Engine', () => {

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterEach(async () => {
    await clearDatabase(prisma);
  });

  // ---------------------------------------------------------------------------
  // Helper: register a user via the auth API and return { token, userId }
  // ---------------------------------------------------------------------------
  const registerUser = async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Smoke Tester',
      email: `smoke-${randomUUID()}@example.com`,
      password: 'Test1234!',
    });
    expect(res.status).toBe(201);
    return { token: res.body.data.token as string, userId: res.body.data.user.id as string };
  };

  // Helper: make a user a member of an org with a given role
  const makeMember = async (userId: string, organizationId: string, role = 'ADMIN') => {
    await prisma.membership.create({ data: { userId, organizationId, role, status: 'ACTIVE' } });
  };

  // ---------------------------------------------------------------------------
  // Full end-to-end coordination workflow
  // ---------------------------------------------------------------------------

  it('should complete a full end-to-end resource coordination workflow', async () => {

    // ── Auth: register operator, create orgs, join both ─────────────────────
    const { token, userId } = await registerUser();

    // ── Step 1: Create Organizations ─────────────────────────────────────────
    const orgARes = await request(app).post('/organizations').send({
      name: `Offering Org ${Date.now()}`,
      type: 'NGO',
      sector: 'Relief',
    });
    expect(orgARes.status).toBe(201);
    const orgAId: string = orgARes.body.data.id;

    const orgBRes = await request(app).post('/organizations').send({
      name: `Requesting Org ${Date.now()}`,
      type: 'NGO',
      sector: 'Health',
    });
    expect(orgBRes.status).toBe(201);
    const orgBId: string = orgBRes.body.data.id;

    // Operator is ADMIN in both orgs so they can accept on behalf of orgB
    await makeMember(userId, orgAId);
    await makeMember(userId, orgBId);

    // ── Step 2: Create Resource ───────────────────────────────────────────────
    const resourceRes = await request(app).post('/api/resources').send({
      name: `Smoke Resource ${Date.now()}`,
      unit: 'BOX',
      description: 'Smoke test resource',
    });
    expect(resourceRes.status).toBe(201);
    const resourceId: string = resourceRes.body.data.id;

    // ── Step 3: Create Resource Lot (Org A owns 100 units) ───────────────────
    const lotRes = await request(app).post('/api/resource-lots').send({
      organizationId: orgAId,
      resourceId,
      quantity: 100,
      notes: 'Initial smoke-test stock',
    });
    expect(lotRes.status).toBe(201);
    expect(lotRes.body.data.availableQuantity).toBe(100);
    const lotId: string = lotRes.body.data.id;

    // ── Step 4: Create Need (Org B needs 40 units) ───────────────────────────
    const needRes = await request(app).post('/api/needs').send({
      organizationId: orgBId,
      resourceId,
      quantity: 40,
      createdById: userId,
    });
    expect(needRes.status).toBe(201);
    expect(needRes.body.data.status).toBe('OPEN');
    const needId: string = needRes.body.data.id;

    // ── Step 5: Create Offer (Org A offers 40 units) ──────────────────────────
    const offerRes = await request(app).post('/api/offers').send({
      needId,
      offeringOrganizationId: orgAId,
      resourceLotId: lotId,
      offeredQuantity: 40,
      createdById: userId,
    });
    expect(offerRes.status).toBe(201);
    expect(offerRes.body.data.status).toBe('PENDING');
    const offerId: string = offerRes.body.data.id;

    // ── Step 6: Accept Offer (Org B accepts) — PROTECTED ─────────────────────
    const acceptRes = await request(app)
      .post(`/api/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: orgBId, userId });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.data.status).toBe('PENDING');
    const transferId: string = acceptRes.body.data.id;

    // ── Step 7: Verify transfer exists ───────────────────────────────────────
    const transfersRes = await request(app)
      .get('/api/transfers')
      .query({ organizationId: orgBId });
    expect(transfersRes.status).toBe(200);
    const transfers: any[] = transfersRes.body.data;
    const transfer = transfers.find((t: any) => t.offerId === offerId);
    expect(transfer).toBeDefined();
    expect(transfer.status).toBe('PENDING');
    expect(transfer.quantity).toBe(40);

    // ── Step 8: Verify inventory was reserved ────────────────────────────────
    const lotVerifyRes = await request(app).get(`/api/resource-lots/${lotId}`);
    expect(lotVerifyRes.status).toBe(200);
    expect(lotVerifyRes.body.data.availableQuantity).toBe(60); // 100 - 40

    // ── Step 9: Transfer state machine ───────────────────────────────────────
    // PENDING → COMPLETED must be rejected (must go via IN_TRANSIT first)
    const badCompleteRes = await request(app)
      .post(`/api/transfers/${transferId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: orgBId });
    expect(badCompleteRes.body.success).toBe(false);

    // PENDING → IN_TRANSIT (start is not protected)
    const startRes = await request(app)
      .post(`/api/transfers/${transferId}/start`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe('IN_TRANSIT');

    // IN_TRANSIT → COMPLETED — PROTECTED
    const completeRes = await request(app)
      .post(`/api/transfers/${transferId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: orgBId });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');

    // ── Step 10: Need is now FULFILLED ───────────────────────────────────────
    const needVerifyRes = await request(app).get(`/api/needs/${needId}`);
    expect(needVerifyRes.status).toBe(200);
    expect(needVerifyRes.body.data.status).toBe('FULFILLED');
  });

  // ---------------------------------------------------------------------------
  // Validation smoke tests
  // ---------------------------------------------------------------------------

  describe('Validation Smoke Tests', () => {

    it('should reject invalid resource creation (missing required fields)', async () => {
      const res = await request(app).post('/api/resources').send({});
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for a non-existent resource UUID', async () => {
      const res = await request(app).get('/api/resources/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject need creation with missing required fields', async () => {
      const res = await request(app).post('/api/needs').send({ quantity: 10 });
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(res.body.success).toBe(false);
    });

    it('should reject offer acceptance by wrong organization', async () => {
      // Register an operator who is ADMIN of wrongOrg but NOT needOrg
      const { token, userId } = await registerUser();

      const offeringOrg = await prisma.organization.create({
        data: { name: `offeringOrg-${randomUUID()}`, type: 'NGO', sector: 'Relief' },
      });
      const needOrg = await prisma.organization.create({
        data: { name: `needOrg-${randomUUID()}`, type: 'NGO', sector: 'Health' },
      });
      const wrongOrg = await prisma.organization.create({
        data: { name: `wrongOrg-${randomUUID()}`, type: 'NGO', sector: 'Other' },
      });

      // Operator is only in wrongOrg — so the auth middleware passes, but the engine rejects
      await makeMember(userId, wrongOrg.id);

      const resource = await prisma.resource.create({
        data: { name: `res-${randomUUID()}`, unit: 'units' },
      });
      const lot = await prisma.resourceLot.create({
        data: { organizationId: offeringOrg.id, resourceId: resource.id, quantity: 50, availableQuantity: 50 },
      });
      const need = await prisma.resourceNeed.create({
        data: { organizationId: needOrg.id, resourceId: resource.id, quantity: 50, createdById: userId },
      });
      const offer = await prisma.resourceOffer.create({
        data: {
          needId: need.id,
          offeringOrganizationId: offeringOrg.id,
          resourceLotId: lot.id,
          offeredQuantity: 50,
          createdById: userId,
          status: 'PENDING',
        },
      });

      // wrongOrg is not the need owner — engine should reject (business logic, not auth)
      const res = await request(app)
        .post(`/api/offers/${offer.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: wrongOrg.id, userId });

      expect(res.body.success).toBe(false);

      // Inventory must be untouched
      const untouchedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
      expect(untouchedLot?.availableQuantity).toBe(50);
    });
  });
});