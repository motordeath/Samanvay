import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import {
  createTestOrganization,
  createTestUser,
  createTestResource,
  createTestLot,
  createTestNeed,
  createTestOffer,
} from '../helpers/testFactory';
import { sign } from 'jsonwebtoken';
import { env } from '../../config/env';

const generateToken = (userId: string) => sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });

describe('Resource Offer Withdrawal Ownership Validation (HIGH-08)', () => {
  let resource: any;

  beforeEach(async () => {
    await clearDatabase(prisma);
    resource = await createTestResource();
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('allows withdrawal by the offering organization', async () => {
    // Need created by Org A
    const orgA = await createTestOrganization();
    const userA = await createTestUser();
    const need = await createTestNeed({
      organizationId: orgA.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: userA.id,
    });

    // Offer created by Org B
    const orgB = await createTestOrganization();
    const userB = await createTestUser();
    await prisma.membership.create({ data: { userId: userB.id, organizationId: orgB.id, role: 'OWNER', status: 'ACTIVE' } });
    
    const lot = await createTestLot({
      organizationId: orgB.id,
      resourceId: resource.id,
      quantity: 100,
    });

    const offer = await createTestOffer({
      needId: need.id,
      offeringOrganizationId: orgB.id,
      resourceLotId: lot.id,
      offeredQuantity: 50,
      createdById: userB.id,
    });

    const token = generateToken(userB.id);

    const res = await request(app)
      .post(`/api/offers/${offer.id}/withdraw`)
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: orgB.id });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('WITHDRAWN');
  });

  it('denies withdrawal by an unrelated organization', async () => {
    // Need created by Org A
    const orgA = await createTestOrganization();
    const userA = await createTestUser();
    const need = await createTestNeed({
      organizationId: orgA.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: userA.id,
    });

    // Offer created by Org B
    const orgB = await createTestOrganization();
    const userB = await createTestUser();
    
    const lot = await createTestLot({
      organizationId: orgB.id,
      resourceId: resource.id,
      quantity: 100,
    });

    const offer = await createTestOffer({
      needId: need.id,
      offeringOrganizationId: orgB.id,
      resourceLotId: lot.id,
      offeredQuantity: 50,
      createdById: userB.id,
    });

    // Unrelated Org C attempts to withdraw
    const orgC = await createTestOrganization();
    const userC = await createTestUser();
    await prisma.membership.create({ data: { userId: userC.id, organizationId: orgC.id, role: 'OWNER', status: 'ACTIVE' } });
    
    const token = generateToken(userC.id);

    const res = await request(app)
      .post(`/api/offers/${offer.id}/withdraw`)
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: orgC.id });

    expect(res.status).toBe(403);
    
    // Check error from the service or global error handler if it maps differently, but expect 403 or 400
    // The service throws an Error, which the global error handler wraps as 500, UNLESS there is specific mapping.
    // Wait, the instruction says "Expected: 403". I should check if the error handler correctly returns 403 or if I need to catch it.
    // Let me update the controller later if needed, but for now I'll just assert 403. 
    // Actually the instruction just says "Expected: 403". If it returns 500, I might need to adjust the controller to return 403,
    // but the instruction says "Fix ownership validation only. Do not redesign offer workflows."
    // Let's assert 403 or 500 and wait for the test to run.
  });

  it('denies withdrawal from an anonymous user', async () => {
    const orgA = await createTestOrganization();
    const userA = await createTestUser();
    const need = await createTestNeed({
      organizationId: orgA.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: userA.id,
    });

    const orgB = await createTestOrganization();
    const userB = await createTestUser();
    const lot = await createTestLot({
      organizationId: orgB.id,
      resourceId: resource.id,
      quantity: 100,
    });
    const offer = await createTestOffer({
      needId: need.id,
      offeringOrganizationId: orgB.id,
      resourceLotId: lot.id,
      offeredQuantity: 50,
      createdById: userB.id,
    });

    const res = await request(app)
      .post(`/api/offers/${offer.id}/withdraw`)
      .send({ organizationId: orgB.id });

    expect(res.status).toBe(401);
  });

  it('denies withdrawal when organization context is missing', async () => {
    const orgA = await createTestOrganization();
    const userA = await createTestUser();
    const need = await createTestNeed({
      organizationId: orgA.id,
      resourceId: resource.id,
      quantity: 100,
      createdById: userA.id,
    });

    const orgB = await createTestOrganization();
    const userB = await createTestUser();
    await prisma.membership.create({ data: { userId: userB.id, organizationId: orgB.id, role: 'OWNER', status: 'ACTIVE' } });
    
    const lot = await createTestLot({
      organizationId: orgB.id,
      resourceId: resource.id,
      quantity: 100,
    });

    const offer = await createTestOffer({
      needId: need.id,
      offeringOrganizationId: orgB.id,
      resourceLotId: lot.id,
      offeredQuantity: 50,
      createdById: userB.id,
    });

    const token = generateToken(userB.id);

    const res = await request(app)
      .post(`/api/offers/${offer.id}/withdraw`)
      .set('Authorization', `Bearer ${token}`)
      .send({}); // Missing organizationId

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Organization context required');
  });
});
