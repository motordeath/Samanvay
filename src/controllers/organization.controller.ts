import { Request, Response, NextFunction } from 'express';
import * as orgService from '../services/organization.service';
import { createOrganizationSchema, updateOrganizationSchema } from '../schemas/organization.schema';
import { createSuccessResponse } from '../utils/response';
import { safeAudit } from '../utils/safe-audit';
import { createAuditLog } from '../services/audit.service';
import { AuthRequest } from '../middleware/auth.middleware';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createOrganizationSchema.parse(req.body);
    const org = await orgService.createOrganization(data);
    res.status(201).json(createSuccessResponse(org));
  } catch (error) {
    next(error);
  }
}

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const orgs = await orgService.getOrganizations();
    res.json(createSuccessResponse(orgs));
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const org = await orgService.getOrganizationById(id);
    if (!org) throw new Error('Organization not found');
    res.json(createSuccessResponse(org));
  } catch (error) {
    next(error);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const data = updateOrganizationSchema.parse(req.body);
    const org = await orgService.updateOrganization(id, data);

    await safeAudit(() =>
      createAuditLog({
        action: 'ORGANIZATION_UPDATED',
        entityType: 'ORGANIZATION',
        entityId: org.id,
        userId: req.user?.id,
        organizationId: org.id,
      })
    );

    res.json(createSuccessResponse(org));
  } catch (error) {
    next(error);
  }
}
