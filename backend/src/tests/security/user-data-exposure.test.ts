import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestUser } from '../helpers/testFactory';
import { sign } from 'jsonwebtoken';
import { env } from '../../config/env';

const generateToken = (userId: string) => sign({ userId }, env.JWT_SECRET, { expiresIn: '1h' });

describe('Password Hash Exposure via GET /users/:id (HIGH-06)', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('Password Hash Not Exposed and Public Fields Still Returned', async () => {
    const userA = await createTestUser();
    const token = generateToken(userA.id);

    const res = await request(app)
      .get(`/users/${userA.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    
    // Test Case 2 — Public Fields Still Returned
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBeDefined();
    expect(res.body.data.email).toBeDefined();

    // Test Case 1 & 3 — No Sensitive Fields
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.password).toBeUndefined();
  });
});
