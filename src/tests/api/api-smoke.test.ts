import request from 'supertest';
import app from '../../app';
import { clearDatabase } from '../helpers/clearDatabase';
import { prisma } from '../../prisma';

/**
 * API Smoke Tests — Resource Coordination Engine
 *
 * These tests exercise the full HTTP surface end-to-end against a real
 * database. Each test gets a clean slate via clearDatabase (TRUNCATE CASCADE).
 *
 * Verified field contracts (from controllers + Zod schemas):
 *
 *   POST /users             → { name, email, password }          (createUserSchema)
 *   POST /organizations     → { name, type, sector }             (createOrganizationSchema)
 *   POST /api/resources     → { name, unit, description? }       (createResourceSchema)
 *   POST /api/resource-lots → { organizationId, resourceId, quantity, notes? }
 *   POST /api/needs         → { organizationId, resourceId, quantity, createdById }
 *   POST /api/offers        → { needId, offeringOrganizationId, resourceLotId, offeredQuantity, createdById }
 *   POST /api/offers/:id/accept → { organizationId, userId }     (acceptOfferController)
 *     → returns Transfer (status: 'PENDING'), NOT the Offer
 */
jest.setTimeout(30000);

describe('API Smoke Tests - Resource Coordination Engine', () => {

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterEach(async () => {
    await clearDatabase(prisma);
  });

  // ---------------------------------------------------------------------------
  // Full end-to-end coordination workflow
  // ---------------------------------------------------------------------------

  it('should complete a full end-to-end resource coordination workflow', async () => {

    // ── Step 1: Create User ──────────────────────────────────────────────────
    // Schema: { name, email, password }
    const userRes = await request(app).post('/users').send({
      name: 'Smoke Tester',
      email: `smoke-${Date.now()}@example.com`,
      password: 'Test1234!',
    });
    expect(userRes.status).toBe(201);
    expect(userRes.body.success).toBe(true);
    const userId: string = userRes.body.data.id;

    // ── Step 2: Create Organizations ─────────────────────────────────────────
    // Schema: { name, type, sector }  (contactEmail is NOT in schema)
    const orgARes = await request(app).post('/organizations').send({
      name: `Offering Org ${Date.now()}`,
      type: 'NGO',
      sector: 'Relief',
    });
    expect(orgARes.status).toBe(201);
    expect(orgARes.body.success).toBe(true);
    const orgAId: string = orgARes.body.data.id;

    const orgBRes = await request(app).post('/organizations').send({
      name: `Requesting Org ${Date.now()}`,
      type: 'NGO',
      sector: 'Health',
    });
    expect(orgBRes.status).toBe(201);
    expect(orgBRes.body.success).toBe(true);
    const orgBId: string = orgBRes.body.data.id;

    // ── Step 3: Create Resource ───────────────────────────────────────────────
    // Schema: { name, unit, description? }  (no `category` field)
    const resourceRes = await request(app).post('/api/resources').send({
      name: `Smoke Resource ${Date.now()}`,
      unit: 'BOX',
      description: 'Smoke test resource',
    });
    expect(resourceRes.status).toBe(201);
    expect(resourceRes.body.success).toBe(true);
    const resourceId: string = resourceRes.body.data.id;

    // ── Step 4: Create Resource Lot (Org A owns 100 units) ───────────────────
    const lotRes = await request(app).post('/api/resource-lots').send({
      organizationId: orgAId,
      resourceId,
      quantity: 100,
      notes: 'Initial smoke-test stock',
    });
    expect(lotRes.status).toBe(201);
    expect(lotRes.body.success).toBe(true);
    expect(lotRes.body.data.availableQuantity).toBe(100);
    const lotId: string = lotRes.body.data.id;

    // ── Step 5: Create Need (Org B needs 40 units) ───────────────────────────
    const needRes = await request(app).post('/api/needs').send({
      organizationId: orgBId,
      resourceId,
      quantity: 40,
      createdById: userId,
    });
    expect(needRes.status).toBe(201);
    expect(needRes.body.success).toBe(true);
    expect(needRes.body.data.status).toBe('OPEN');
    const needId: string = needRes.body.data.id;

    // ── Step 6: Create Offer (Org A offers 40 units against the need) ─────────
    const offerRes = await request(app).post('/api/offers').send({
      needId,
      offeringOrganizationId: orgAId,
      resourceLotId: lotId,
      offeredQuantity: 40,
      createdById: userId,
    });
    expect(offerRes.status).toBe(201);
    expect(offerRes.body.success).toBe(true);
    expect(offerRes.body.data.status).toBe('PENDING');
    const offerId: string = offerRes.body.data.id;

    // ── Step 7: Accept Offer (Org B accepts) ─────────────────────────────────
    // Controller reads: { organizationId, userId } — NOT acceptingOrganizationId/acceptedById
    // acceptOffer() returns a Transfer (status: 'PENDING'), not the Offer
    const acceptRes = await request(app)
      .post(`/api/offers/${offerId}/accept`)
      .send({
        organizationId: orgBId,
        userId,
      });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    // acceptOffer returns the newly-created Transfer, which starts as PENDING
    expect(acceptRes.body.data.status).toBe('PENDING');
    const transferId: string = acceptRes.body.data.id;

    // ── Step 8: Verify Transfer exists in the list ────────────────────────────
    const transfersRes = await request(app)
      .get('/api/transfers')
      .query({ organizationId: orgBId });
    expect(transfersRes.status).toBe(200);
    expect(transfersRes.body.success).toBe(true);

    const transfers: any[] = transfersRes.body.data;
    const transfer = transfers.find((t: any) => t.offerId === offerId);
    expect(transfer).toBeDefined();
    expect(transfer.status).toBe('PENDING');
    expect(transfer.quantity).toBe(40);
    expect(transfer.id).toBe(transferId);

    // ── Step 9: Verify inventory was reserved ────────────────────────────────
    const lotVerifyRes = await request(app).get(`/api/resource-lots/${lotId}`);
    expect(lotVerifyRes.status).toBe(200);
    expect(lotVerifyRes.body.success).toBe(true);
    // 100 original − 40 reserved = 60 available
    expect(lotVerifyRes.body.data.availableQuantity).toBe(60);

    // ── Step 10: Transfer state machine ──────────────────────────────────────
    // PENDING → COMPLETED must be rejected (must go via IN_TRANSIT first)
    const badCompleteRes = await request(app)
      .post(`/api/transfers/${transferId}/complete`);
    expect(badCompleteRes.body.success).toBe(false);

    // PENDING → IN_TRANSIT is allowed
    const startRes = await request(app)
      .post(`/api/transfers/${transferId}/start`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.success).toBe(true);
    expect(startRes.body.data.status).toBe('IN_TRANSIT');

    // IN_TRANSIT → COMPLETED is allowed
    const completeRes = await request(app)
      .post(`/api/transfers/${transferId}/complete`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.success).toBe(true);
    expect(completeRes.body.data.status).toBe('COMPLETED');

    // ── Step 11: Need is now FULFILLED ───────────────────────────────────────
    const needVerifyRes = await request(app).get(`/api/needs/${needId}`);
    expect(needVerifyRes.status).toBe(200);
    expect(needVerifyRes.body.success).toBe(true);
    expect(needVerifyRes.body.data.status).toBe('FULFILLED');
  });

  // ---------------------------------------------------------------------------
  // Validation smoke tests
  // ---------------------------------------------------------------------------

  describe('Validation Smoke Tests', () => {

    it('should reject invalid resource creation (missing required fields)', async () => {
      // name and unit are required; empty body must fail validation
      const res = await request(app).post('/api/resources').send({});
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for a non-existent resource UUID', async () => {
      // A valid-format UUID that does not exist in the DB returns 404 with success: false
      const res = await request(app).get('/api/resources/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject need creation with missing required fields', async () => {
      // organizationId, resourceId, createdById are required UUIDs — omitting them must fail
      const res = await request(app).post('/api/needs').send({
        quantity: 10,
      });
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
      expect(res.body.success).toBe(false);
    });

    it('should reject offer acceptance by wrong organization', async () => {
      // Set up minimal fixture state directly via Prisma
      const offeringOrg = await prisma.organization.create({
        data: { name: `offeringOrg-${Date.now()}`, type: 'NGO', sector: 'Relief' },
      });
      const needOrg = await prisma.organization.create({
        data: { name: `needOrg-${Date.now()}`, type: 'NGO', sector: 'Health' },
      });
      const wrongOrg = await prisma.organization.create({
        data: { name: `wrongOrg-${Date.now()}`, type: 'NGO', sector: 'Other' },
      });
      const user = await prisma.user.create({
        data: { name: 'test-user', email: `u-${Date.now()}@x.com`, passwordHash: 'h' },
      });
      const resource = await prisma.resource.create({
        data: { name: `res-${Date.now()}`, unit: 'units' },
      });
      const lot = await prisma.resourceLot.create({
        data: { organizationId: offeringOrg.id, resourceId: resource.id, quantity: 50, availableQuantity: 50 },
      });
      const need = await prisma.resourceNeed.create({
        data: { organizationId: needOrg.id, resourceId: resource.id, quantity: 50, createdById: user.id },
      });
      const offer = await prisma.resourceOffer.create({
        data: {
          needId: need.id,
          offeringOrganizationId: offeringOrg.id,
          resourceLotId: lot.id,
          offeredQuantity: 50,
          createdById: user.id,
          status: 'PENDING',
        },
      });

      // wrongOrg is not the need owner — controller sends { organizationId, userId }
      const res = await request(app)
        .post(`/api/offers/${offer.id}/accept`)
        .send({ organizationId: wrongOrg.id, userId: user.id });

      expect(res.body.success).toBe(false);

      // Inventory must be untouched
      const untouchedLot = await prisma.resourceLot.findUnique({ where: { id: lot.id } });
      expect(untouchedLot?.availableQuantity).toBe(50);
    });
  });
});