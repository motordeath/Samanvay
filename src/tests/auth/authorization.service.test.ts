import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { getMembership, requireMembership, hasRole, requireRole } from '../../services/authorization.service';
import { createTestUser, createTestOrganization } from '../helpers/testFactory';

describe('Authorization Service', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  it('getMembership returns null for inactive organization', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();
    await prisma.organization.update({ where: { id: org.id }, data: { status: 'INACTIVE' } });
    
    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ADMIN',
        status: 'ACTIVE',
      }
    });

    const membership = await getMembership(user.id, org.id);
    expect(membership).toBeNull();
  });

  it('getMembership succeeds for active organization and active membership', async () => {
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

    const membership = await getMembership(user.id, org.id);
    expect(membership).toBeDefined();
    expect(membership?.role).toBe('ADMIN');
  });

  it('getMembership returns null for inactive membership', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();
    
    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ADMIN',
        status: 'INACTIVE',
      }
    });

    const membership = await getMembership(user.id, org.id);
    expect(membership).toBeNull();
  });

  it('getMembership returns null if membership is missing', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();

    const membership = await getMembership(user.id, org.id);
    expect(membership).toBeNull();
  });

  it('requireMembership throws if membership is missing', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();

    await expect(requireMembership(user.id, org.id)).rejects.toThrow('Membership required');
  });

  it('hasRole returns true for allowed role', async () => {
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

    const result = await hasRole(user.id, org.id, ['ADMIN', 'OWNER']);
    expect(result).toBe(true);
  });

  it('hasRole returns false for disallowed role', async () => {
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

    const result = await hasRole(user.id, org.id, ['ADMIN', 'OWNER']);
    expect(result).toBe(false);
  });

  it('hasRole returns false for missing membership', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();

    const result = await hasRole(user.id, org.id, ['ADMIN']);
    expect(result).toBe(false);
  });
  
  it('requireRole throws for missing membership', async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();

    await expect(requireRole(user.id, org.id, ['ADMIN'])).rejects.toThrow('Membership required');
  });

  it('requireRole throws for disallowed role', async () => {
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

    await expect(requireRole(user.id, org.id, ['ADMIN', 'OWNER'])).rejects.toThrow('Insufficient permissions');
  });

  it('requireRole succeeds for allowed role', async () => {
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

    await expect(requireRole(user.id, org.id, ['ADMIN', 'OWNER'])).resolves.not.toThrow();
  });
});
