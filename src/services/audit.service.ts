import { prisma } from '../prisma';
import { AuditAction, AuditEntityType } from '@prisma/client';

export interface CreateAuditLogParams {
  action: AuditAction;
  userId?: string;
  organizationId?: string;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: any;
}

export async function createAuditLog(params: CreateAuditLogParams, tx?: any) {
  const client = tx || prisma;
  return await client.auditLog.create({
    data: {
      action: params.action,
      userId: params.userId,
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata || null,
    },
  });
}

export interface GetAuditLogsFilters {
  organizationId: string; // Required per rules
  userId?: string;
  action?: AuditAction;
}

export async function getAuditLogs(filters: GetAuditLogsFilters, skip: number = 0, take: number = 20) {
  if (!filters.organizationId) {
    throw new Error('Organization context required for audit logs');
  }

  return await prisma.auditLog.findMany({
    where: {
      organizationId: filters.organizationId,
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.action && { action: filters.action }),
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  });
}
