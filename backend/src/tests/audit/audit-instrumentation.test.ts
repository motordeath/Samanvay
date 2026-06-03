import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { randomUUID } from 'crypto';

/**
 * Phase 3.4.2 — Audit Instrumentation Tests
 * Verifies that controllers properly emit audit logs via safeAudit
 */
describe('Audit Instrumentation', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  describe('Auth Controller', () => {
    it('emits USER_REGISTERED audit log after successful registration', async () => {
      const email = `test-${randomUUID()}@example.com`;
      const res = await request(app).post('/api/auth/register').send({
        name: 'Audit Test',
        email,
        password: 'password123'
      });

      expect(res.status).toBe(201);
      const userId = res.body.data.user.id;

      const logs = await prisma.auditLog.findMany({
        where: { action: 'USER_REGISTERED', entityId: userId }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].entityType).toBe('USER');
    });

    it('emits USER_LOGIN audit log after successful login', async () => {
      const email = `test-login-${randomUUID()}@example.com`;
      const password = 'password123';
      
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'Login Audit Test',
        email,
        password
      });

      const userId = regRes.body.data.user.id;

      const res = await request(app).post('/api/auth/login').send({
        email,
        password
      });

      expect(res.status).toBe(200);

      const logs = await prisma.auditLog.findMany({
        where: { action: 'USER_LOGIN', entityId: userId }
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe(userId);
    });
  });
});
