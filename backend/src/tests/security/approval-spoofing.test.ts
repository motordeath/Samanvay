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
  createTestLot,
} from '../helpers/testFactory';
import { sign } from 'jsonwebtoken';
import { env } from '../../config/env';

const generateToken = (userId: string) => sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });

describe('Approval Identity Spoofing (CRIT-07)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('prevents approval spoofing by ignoring userId in request body', async () => {
    // Setup
    const orgA = await createTestOrganization(); // Requesting Organization (Needs the resource)
    const orgB = await createTestOrganization(); // Offering Organization

    const userA = await createTestUser(); // Authentic User (Approver)
    const userB = await createTestUser(); // Spoofed User

    await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'OWNER', status: 'ACTIVE' } });
    await prisma.membership.create({ data: { userId: userB.id, organizationId: orgA.id, role: 'OWNER', status: 'ACTIVE' } });

    const resource = await createTestResource();
    const need = await createTestNeed({
      organizationId: orgA.id,
      resourceId: resource.id,
      quantity: 10,
      createdById: userA.id,
    });
    const lot = await createTestLot({
      organizationId: orgB.id,
      resourceId: resource.id,
      quantity: 10,
    });
    const offer = await createTestOffer({
      needId: need.id,
      offeringOrganizationId: orgB.id,
      resourceLotId: lot.id,
      offeredQuantity: 10,
      createdById: userB.id,
    });

    // Authentic token for User A
    const token = generateToken(userA.id);

    // Attack: User A tries to approve the offer but passes User B's ID in the body
    const res = await request(app)
      .post(`/api/offers/${offer.id}/accept`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationId: orgA.id,
        userId: userB.id, // Attempted spoof
      });
    console.log(res.status);
    console.log(res.body);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify
    const transfer = await prisma.transfer.findFirst({
      where: { offerId: offer.id }
    });

    expect(transfer).toBeDefined();
    // The transfer must be approved by the authenticated user (User A), not the spoofed user (User B)
    expect(transfer!.approvedById).toBe(userA.id);
    expect(transfer!.approvedById).not.toBe(userB.id);
  });
});
