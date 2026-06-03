import { ConflictError, NotFoundError, ForbiddenError, ValidationError } from '../shared/errors';
import { needRepository } from './repository';
import { AuditService } from '../audit/AuditService';
import { SkillLevel } from '@prisma/client';

export class NeedService {
  private validateOwnership(organizationId: string, allowedOrganizationIds: string[]) {
    if (!allowedOrganizationIds.includes(organizationId)) {
      throw new ForbiddenError('User is not authorized to manage needs for this organization');
    }
  }

  async createNeed(
    data: {
      organizationId: string;
      eventId?: string | null;
      title: string;
      description?: string | null;
      requiredCount: number;
      location?: string | null;
      startDate: Date;
      endDate: Date;
      skills?: { skillId: string; requiredLevel: SkillLevel }[];
    },
    userId: string,
    allowedOrganizationIds: string[]
  ) {
    this.validateOwnership(data.organizationId, allowedOrganizationIds);

    if (data.startDate >= data.endDate) {
      throw new ValidationError('startDate must be strictly before endDate');
    }

    const need = await needRepository.create({
      ...data,
      createdBy: userId,
    });

    if (!need) {
      throw new ConflictError('Failed to create volunteer need');
    }

    await AuditService.log({
      action: 'NEED_CREATED',
      entityType: 'VOLUNTEER_NEED',
      entityId: need.id,
      metadata: { organizationId: data.organizationId, createdBy: userId },
    });

    return need;
  }

  async getNeedById(id: string) {
    const need = await needRepository.findById(id);
    if (!need) {
      throw new NotFoundError('Volunteer Need not found');
    }
    return need;
  }

  async getAllNeeds() {
    return await needRepository.findAll();
  }

  async updateNeed(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      requiredCount?: number;
      location?: string | null;
      startDate?: Date;
      endDate?: Date;
    },
    allowedOrganizationIds: string[]
  ) {
    const existing = await this.getNeedById(id);
    this.validateOwnership(existing.organizationId, allowedOrganizationIds);

    const start = data.startDate ?? existing.startDate;
    const end = data.endDate ?? existing.endDate;

    if (start >= end) {
      throw new ValidationError('startDate must be strictly before endDate');
    }

    return await needRepository.update(id, data);
  }

  async closeNeed(id: string, allowedOrganizationIds: string[]) {
    const existing = await this.getNeedById(id);
    this.validateOwnership(existing.organizationId, allowedOrganizationIds);

    const need = await needRepository.softDelete(id);

    await AuditService.log({
      action: 'NEED_CLOSED',
      entityType: 'VOLUNTEER_NEED',
      entityId: need.id,
      metadata: { organizationId: need.organizationId },
    });

    return need;
  }
}
export const needService = new NeedService();
