import request from 'supertest';
import app from '../../app';
import { clearDatabase } from '../helpers/clearDatabase';
import { prisma } from '../../prisma';
import { randomUUID } from 'crypto';

jest.setTimeout(60000);

describe('Audit API', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const registerUser = async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Audit API Test User',
      email: `audit-${randomUUID()}@example.com`,
      password: 'password123',
    });
    return { token: res.body.data.token as string, user: res.body.data.user };
  };

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

  const seedAuditLogs = async (orgId: string, count: number) => {
    await prisma.auditLog.createMany({
      data: Array.from({ length: count }).map((_, i) => ({
        action: 'EVENT_CREATED',
        organizationId: orgId,
        entityType: 'EVENT',
        entityId: `evt-${i}`,
      })),
    });
  };

  it.each(['OWNER', 'ADMIN'])('allows %s to read audit logs', async (role) => {
    const { token, org } = await setupAuth(role);
    await seedAuditLogs(org.id, 5);

    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`)
      .query({ organizationId: org.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(5);
  });

  it.each(['COORDINATOR', 'VOLUNTEER', 'VIEWER'])('denies %s from reading audit logs', async (role) => {
    const { token, org } = await setupAuth(role);

    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`)
      .query({ organizationId: org.id });

    expect(res.status).toBe(403);
  });

  it('denies access when token is missing', async () => {
    const { org } = await setupAuth('ADMIN');

    const res = await request(app)
      .get('/api/audit')
      .query({ organizationId: org.id });

    expect(res.status).toBe(401);
  });

  it('returns 400 when organizationId is missing from query', async () => {
    const { token } = await setupAuth('ADMIN');

    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Organization context required');
  });

  it('enforces cross-organization isolation', async () => {
    const { token: token1, org: org1 } = await setupAuth('ADMIN');
    const { org: org2 } = await setupAuth('ADMIN'); // different org

    // Try to read org2 logs using org1's token
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token1}`)
      .query({ organizationId: org2.id });

    // The middleware checks if the user is an ADMIN in org2. They are not.
    expect(res.status).toBe(403);
  });
});
