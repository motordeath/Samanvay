import { prisma } from '../../../prisma';

export class AuditService {
  static async log(params: {
    action: string;
    volunteerId?: string | null;
    entityType: string;
    entityId: string;
    metadata?: any;
    tx?: any;
  }) {
    const client = params.tx || prisma;
    return await client.volunteerAudit.create({
      data: {
        action: params.action,
        volunteerId: params.volunteerId || null,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
      },
    });
  }

  static async getLogs(
    filters: {
      volunteerId?: string;
      entityType?: string;
      entityId?: string;
      action?: string;
    },
    skip = 0,
    take = 50
  ) {
    return await prisma.volunteerAudit.findMany({
      where: {
        ...(filters.volunteerId && { volunteerId: filters.volunteerId }),
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.entityId && { entityId: filters.entityId }),
        ...(filters.action && { action: filters.action }),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }
}
