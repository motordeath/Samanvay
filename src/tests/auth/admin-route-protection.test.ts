import request from 'supertest';
import app from '../../app';
import { clearDatabase } from '../helpers/clearDatabase';
import { prisma } from '../../prisma';
import { randomUUID } from 'crypto';

/**
 * Admin Route Protection Tests — Phase 3.3.2
 *
 * Covers:
 *   POST   /memberships          → OWNER/ADMIN only
 *   PATCH  /organizations/:id    → OWNER/ADMIN only  (organizationId in body required)
 *   POST   /events               → OWNER/ADMIN/COORDINATOR
 *   PATCH  /events/:id           → OWNER/ADMIN/COORDINATOR
 *
 * Uses real database, real JWT, real memberships. No mocks.
 */
jest.setTimeout(60000);

describe('Admin Route Protection — Phase 3.3.2', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  // ---------------------------------------------------------------------------
  // Fixture helpers
  // ---------------------------------------------------------------------------

  const registerUser = async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Admin Test',
      email: `admin-${randomUUID()}@example.com`,
      password: 'password123',
    });
    if (res.status !== 201) throw new Error(`Register failed: ${JSON.stringify(res.body)}`);
    return { token: res.body.data.token as string, user: res.body.data.user };
  };

  const createOrg = async () =>
    prisma.organization.create({
      data: { name: `Org-${randomUUID()}`, type: 'NGO', sector: 'Relief' },
    });

  const joinOrg = async (userId: string, organizationId: string, role: string) =>
    prisma.membership.create({ data: { userId, organizationId, role, status: 'ACTIVE' } });

  /** Register user + create org + optionally join with given role. */
  const setupAuth = async (role: string | null = null) => {
    const { token, user } = await registerUser();
    const org = await createOrg();
    if (role) await joinOrg(user.id, org.id, role);
    return { token, user, org };
  };

  // ---------------------------------------------------------------------------
  // Membership Creation — POST /memberships
  // ---------------------------------------------------------------------------

  describe('POST /memberships', () => {
    const buildMemberBody = (targetUserId: string, organizationId: string) => ({
      userId: targetUserId,
      organizationId,
      role: 'COORDINATOR',
      status: 'ACTIVE',
    });

    it.each(['OWNER', 'ADMIN'])('allows %s to create membership', async (role) => {
      const { token, org } = await setupAuth(role);
      // Create a second user to add as member
      const { user: newUser } = await registerUser();

      const res = await request(app)
        .post('/memberships')
        .set('Authorization', `Bearer ${token}`)
        .send(buildMemberBody(newUser.id, org.id));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it.each(['COORDINATOR', 'VOLUNTEER', 'VIEWER'])('denies %s from creating membership', async (role) => {
      const { token, org } = await setupAuth(role);
      const { user: newUser } = await registerUser();

      const res = await request(app)
        .post('/memberships')
        .set('Authorization', `Bearer ${token}`)
        .send(buildMemberBody(newUser.id, org.id));

      expect(res.status).toBe(403);
    });

    it('returns 401 when token is missing', async () => {
      const org = await createOrg();
      const { user } = await registerUser();

      const res = await request(app)
        .post('/memberships')
        .send(buildMemberBody(user.id, org.id));

      expect(res.status).toBe(401);
    });

    it('returns 400 when organizationId is missing from body', async () => {
      const { token } = await setupAuth('ADMIN');
      const { user: newUser } = await registerUser();

      const res = await request(app)
        .post('/memberships')
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: newUser.id, role: 'COORDINATOR' }); // no organizationId

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Organization context required');
    });
  });

  // ---------------------------------------------------------------------------
  // Organization Update — PATCH /organizations/:id
  // ---------------------------------------------------------------------------

  describe('PATCH /organizations/:id', () => {
    it.each(['OWNER', 'ADMIN'])('allows %s to update organization', async (role) => {
      const { token, org } = await setupAuth(role);

      const res = await request(app)
        .patch(`/organizations/${org.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id, description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it.each(['COORDINATOR', 'VOLUNTEER', 'VIEWER'])('denies %s from updating organization', async (role) => {
      const { token, org } = await setupAuth(role);

      const res = await request(app)
        .patch(`/organizations/${org.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id, description: 'Should not work' });

      expect(res.status).toBe(403);
    });

    it('returns 401 when token is missing', async () => {
      const org = await createOrg();

      const res = await request(app)
        .patch(`/organizations/${org.id}`)
        .send({ organizationId: org.id, description: 'No auth' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when organizationId is missing from body', async () => {
      const { token, org } = await setupAuth('ADMIN');

      const res = await request(app)
        .patch(`/organizations/${org.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Missing context' }); // no organizationId

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Organization context required');
    });
  });

  // ---------------------------------------------------------------------------
  // Event Creation — POST /events
  // ---------------------------------------------------------------------------

  describe('POST /events', () => {
    const buildEventBody = (organizationId: string, createdById: string) => ({
      organizationId,
      createdById,
      title: 'Test Event',
      type: 'DISTRIBUTION',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    });

    it.each(['OWNER', 'ADMIN', 'COORDINATOR'])('allows %s to create event', async (role) => {
      const { token, org, user } = await setupAuth(role);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send(buildEventBody(org.id, user.id));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it.each(['VOLUNTEER', 'VIEWER'])('denies %s from creating event', async (role) => {
      const { token, org, user } = await setupAuth(role);

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send(buildEventBody(org.id, user.id));

      expect(res.status).toBe(403);
    });

    it('returns 401 when token is missing', async () => {
      const org = await createOrg();
      const { user } = await registerUser();

      const res = await request(app)
        .post('/events')
        .send(buildEventBody(org.id, user.id));

      expect(res.status).toBe(401);
    });

    it('returns 400 when organizationId is missing from body', async () => {
      const { token, user } = await setupAuth('ADMIN');

      const res = await request(app)
        .post('/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          createdById: user.id,
          title: 'No Org Event',
          type: 'DISTRIBUTION',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          endDate: new Date(Date.now() + 2 * 86400000).toISOString(),
          // organizationId intentionally omitted
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Organization context required');
    });
  });

  // ---------------------------------------------------------------------------
  // Event Update — PATCH /events/:id
  // ---------------------------------------------------------------------------

  describe('PATCH /events/:id', () => {
    const createEvent = async (organizationId: string, createdById: string) =>
      prisma.event.create({
        data: {
          organizationId,
          createdById,
          title: 'Existing Event',
          type: 'DISTRIBUTION',
          startDate: new Date(Date.now() + 86400000),
          endDate: new Date(Date.now() + 2 * 86400000),
        },
      });

    it.each(['OWNER', 'ADMIN', 'COORDINATOR'])('allows %s to update event', async (role) => {
      const { token, org, user } = await setupAuth(role);
      const event = await createEvent(org.id, user.id);

      const res = await request(app)
        .patch(`/events/${event.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id, title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it.each(['VOLUNTEER', 'VIEWER'])('denies %s from updating event', async (role) => {
      const { token, org, user } = await setupAuth(role);
      const event = await createEvent(org.id, user.id);

      const res = await request(app)
        .patch(`/events/${event.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: org.id, title: 'Should fail' });

      expect(res.status).toBe(403);
    });

    it('returns 401 when token is missing', async () => {
      const org = await createOrg();
      const { user } = await registerUser();
      const event = await createEvent(org.id, user.id);

      const res = await request(app)
        .patch(`/events/${event.id}`)
        .send({ organizationId: org.id, title: 'No auth' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when organizationId is missing from body', async () => {
      const { token, org, user } = await setupAuth('ADMIN');
      const event = await createEvent(org.id, user.id);

      const res = await request(app)
        .patch(`/events/${event.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Missing context' }); // no organizationId

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Organization context required');
    });
  });
});
