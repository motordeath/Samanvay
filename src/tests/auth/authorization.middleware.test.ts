import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createTestUser, createTestOrganization } from '../helpers/testFactory';
import { requireOrganizationRole } from '../../middleware/authorization.middleware';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';

describe('Authorization Middleware', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext = () => jest.fn() as NextFunction;

  it('denies user without membership', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();

    const req = {
      user: { id: user.id, email: user.email },
      params: { organizationId: org.id },
      body: {},
      query: {}
    } as unknown as AuthRequest;

    const res = mockResponse();
    const next = mockNext();

    const middleware = requireOrganizationRole(['ADMIN']);
    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Membership required' }
    });
  });

  it('allows user with correct membership', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();

    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ADMIN',
        status: 'ACTIVE',
      }
    });

    const req = {
      user: { id: user.id, email: user.email },
      params: { organizationId: org.id },
      body: {},
      query: {}
    } as unknown as AuthRequest;

    const res = mockResponse();
    const next = mockNext();

    const middleware = requireOrganizationRole(['ADMIN']);
    await middleware(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // called without error
  });

  it('denies user with insufficient role', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();

    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'VIEWER',
        status: 'ACTIVE',
      }
    });

    const req = {
      user: { id: user.id, email: user.email },
      params: { organizationId: org.id },
      body: {},
      query: {}
    } as unknown as AuthRequest;

    const res = mockResponse();
    const next = mockNext();

    const middleware = requireOrganizationRole(['ADMIN']);
    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Insufficient permissions' }
    });
  });

  it('denies if organization context is missing', async () => {
    const user = await createTestUser();

    const req = {
      user: { id: user.id, email: user.email },
      params: {},
      body: {},
      query: {}
    } as unknown as AuthRequest;

    const res = mockResponse();
    const next = mockNext();

    const middleware = requireOrganizationRole(['ADMIN']);
    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Organization context required' }
    });
  });

  it('denies if user is not authenticated', async () => {
    const org = await createTestOrganization();

    const req = {
      params: { organizationId: org.id },
      body: {},
      query: {}
    } as unknown as AuthRequest; // No req.user

    const res = mockResponse();
    const next = mockNext();

    const middleware = requireOrganizationRole(['ADMIN']);
    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Authentication required' }
    });
  });
});
