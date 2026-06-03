import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';

describe('Authentication Rate Limiting (HIGH-05)', () => {
  beforeAll(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('limits repeated authentication attempts', async () => {
    let lastResponse;

    // Send 11 requests (limit is 10)
    for (let i = 0; i < 11; i++) {
      lastResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'fake@test.com',
          password: 'wrong-password',
        });
    }

    // The 11th request should be rate limited
    expect(lastResponse!.status).toBe(429);
    expect(lastResponse!.body.success).toBe(false);
    expect(lastResponse!.body.error.message).toBe('Too many authentication attempts. Please try again later.');
  });
});
