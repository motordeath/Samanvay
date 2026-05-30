import { prisma } from '../../prisma';
import { clearDatabase } from '../helpers/clearDatabase';
import { createAuditLog, getAuditLogs } from '../../services/audit.service';
import { randomUUID } from 'crypto';

describe('Audit Service', () => {
  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
  });

  const setupFixtures = async () => {
    const org1 = await prisma.organization.create({
      data: { name: `Org1-${randomUUID()}`, type: 'NGO', sector: 'Relief' },
    });
    const org2 = await prisma.organization.create({
      data: { name: `Org2-${randomUUID()}`, type: 'NGO', sector: 'Relief' },
    });
    const user = await prisma.user.create({
      data: { name: 'Test User', email: `test-${randomUUID()}@example.com`, passwordHash: 'hash' },
    });
    return { org1, org2, user };
  };

  it('creates an audit log successfully', async () => {
    const { org1, user } = await setupFixtures();

    const log = await createAuditLog({
      action: 'USER_LOGIN',
      userId: user.id,
      organizationId: org1.id,
      entityType: 'USER',
      entityId: user.id,
      metadata: { ip: '127.0.0.1' },
    });

    expect(log).toBeDefined();
    expect(log.id).toBeDefined();
    expect(log.action).toBe('USER_LOGIN');
    expect(log.userId).toBe(user.id);
    expect(log.organizationId).toBe(org1.id);
    expect(log.entityType).toBe('USER');
    expect(log.entityId).toBe(user.id);
    expect(log.metadata).toEqual({ ip: '127.0.0.1' });
  });

  it('retrieves audit logs filtered by organizationId', async () => {
    const { org1, org2, user } = await setupFixtures();

    await createAuditLog({
      action: 'ORGANIZATION_UPDATED',
      organizationId: org1.id,
      entityType: 'ORGANIZATION',
      entityId: org1.id,
    });

    await createAuditLog({
      action: 'ORGANIZATION_UPDATED',
      organizationId: org2.id, // different org
      entityType: 'ORGANIZATION',
      entityId: org2.id,
    });

    const logs = await getAuditLogs({ organizationId: org1.id });
    expect(logs.length).toBe(1);
    expect(logs[0].organizationId).toBe(org1.id);
  });

  it('retrieves audit logs filtered by action and userId', async () => {
    const { org1, user } = await setupFixtures();
    const otherUser = await prisma.user.create({
      data: { name: 'Other', email: `other-${randomUUID()}@example.com`, passwordHash: 'hash' },
    });

    await createAuditLog({
      action: 'MEMBERSHIP_CREATED',
      userId: user.id,
      organizationId: org1.id,
      entityType: 'MEMBERSHIP',
      entityId: 'mem1',
    });

    await createAuditLog({
      action: 'MEMBERSHIP_CREATED',
      userId: otherUser.id,
      organizationId: org1.id,
      entityType: 'MEMBERSHIP',
      entityId: 'mem2',
    });

    await createAuditLog({
      action: 'EVENT_CREATED',
      userId: user.id,
      organizationId: org1.id,
      entityType: 'EVENT',
      entityId: 'evt1',
    });

    const logsAction = await getAuditLogs({ organizationId: org1.id, action: 'MEMBERSHIP_CREATED' });
    expect(logsAction.length).toBe(2);

    const logsUser = await getAuditLogs({ organizationId: org1.id, userId: user.id });
    expect(logsUser.length).toBe(2);

    const logsBoth = await getAuditLogs({ organizationId: org1.id, action: 'EVENT_CREATED', userId: user.id });
    expect(logsBoth.length).toBe(1);
    expect(logsBoth[0].entityType).toBe('EVENT');
  });

  it('throws error if organizationId is missing in getAuditLogs', async () => {
    await expect(getAuditLogs({ organizationId: '' })).rejects.toThrow('Organization context required for audit logs');
  });

  it('ensures audit log immutability at service layer by lack of update/delete methods', () => {
    const auditServiceModule = require('../../services/audit.service');
    expect(auditServiceModule.updateAuditLog).toBeUndefined();
    expect(auditServiceModule.deleteAuditLog).toBeUndefined();
  });
});
