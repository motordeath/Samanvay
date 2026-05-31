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

describe('Partnership Ownership & Identity Hardening (CRIT-05B)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  describe('Identity Spoofing', () => {
    it('prevents a user from forging requestedById', async () => {
      const orgA = await createTestOrganization();
      const orgB = await createTestOrganization();
      const userA = await createTestUser();
      const userB = await createTestUser();

      await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'OWNER', status: 'ACTIVE' } });

      const token = generateToken(userA.id);

      const res = await request(app)
        .post('/partnerships')
        .set('Authorization', `Bearer ${token}`)
        .send({
          organizationId: orgA.id,
          requestingOrganizationId: orgA.id,
          targetOrganizationId: orgB.id,
          requestedById: userB.id, // Attack: Spoofing userB
        });

      expect(res.status).toBe(201);

      const partnership = await prisma.partnership.findFirst({
        where: { requestingOrganizationId: orgA.id, targetOrganizationId: orgB.id },
      });

      expect(partnership).toBeDefined();
      expect(partnership!.requestedById).toBe(userA.id);
      expect(partnership!.requestedById).not.toBe(userB.id);
    });
  });

  describe('Partnership Access Validation', () => {
    it('allows access for a user belonging to requesting organization', async () => {
      const orgA = await createTestOrganization();
      const orgB = await createTestOrganization();
      const userA = await createTestUser();

      await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'OWNER', status: 'ACTIVE' } });

      const partnership = await prisma.partnership.create({
        data: {
          requestingOrganizationId: orgA.id,
          targetOrganizationId: orgB.id,
          status: 'PENDING',
          requestedById: userA.id,
        },
      });

      const token = generateToken(userA.id);

      const res = await request(app)
        .patch(`/partnerships/${partnership.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          organizationId: orgA.id,
          status: 'ACTIVE',
        });

      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(404);
      expect(res.status).toBe(200);
    });

    it('allows access for a user belonging to target organization', async () => {
      const orgA = await createTestOrganization();
      const orgB = await createTestOrganization();
      const userB = await createTestUser();
      const userA = await createTestUser();

      await prisma.membership.create({ data: { userId: userB.id, organizationId: orgB.id, role: 'OWNER', status: 'ACTIVE' } });

      const partnership = await prisma.partnership.create({
        data: {
          requestingOrganizationId: orgA.id,
          targetOrganizationId: orgB.id,
          status: 'PENDING',
          requestedById: userA.id,
        },
      });

      const token = generateToken(userB.id);

      const res = await request(app)
        .patch(`/partnerships/${partnership.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          organizationId: orgB.id,
          status: 'ACTIVE',
        });

      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(404);
      expect(res.status).toBe(200);
    });

    it('denies access for a user from an unrelated organization', async () => {
      const orgA = await createTestOrganization();
      const orgB = await createTestOrganization();
      const orgC = await createTestOrganization();
      const userA = await createTestUser();
      const userC = await createTestUser();

      await prisma.membership.create({ data: { userId: userC.id, organizationId: orgC.id, role: 'OWNER', status: 'ACTIVE' } });

      const partnership = await prisma.partnership.create({
        data: {
          requestingOrganizationId: orgA.id,
          targetOrganizationId: orgB.id,
          status: 'PENDING',
          requestedById: userA.id,
        },
      });

      const token = generateToken(userC.id);

      const res = await request(app)
        .patch(`/partnerships/${partnership.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          organizationId: orgC.id,
          status: 'ACTIVE',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toBe('Access denied for partnership');
    });

    it('returns 404 for a missing partnership', async () => {
      const orgA = await createTestOrganization();
      const userA = await createTestUser();

      await prisma.membership.create({ data: { userId: userA.id, organizationId: orgA.id, role: 'OWNER', status: 'ACTIVE' } });

      const token = generateToken(userA.id);
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .patch(`/partnerships/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          organizationId: orgA.id,
          status: 'ACTIVE',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe('Partnership not found');
    });
  });
});
