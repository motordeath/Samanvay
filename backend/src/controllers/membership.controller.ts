import { Request, Response, NextFunction } from 'express';
import * as membershipService from '../services/membership.service';
import { createMembershipSchema } from '../schemas/membership.schema';
import { createSuccessResponse } from '../utils/response';
import { safeAudit } from '../utils/safe-audit';
import { createAuditLog } from '../services/audit.service';
import { AuthRequest } from '../middleware/auth.middleware';

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createMembershipSchema.parse(req.body);
    const membership = await membershipService.createMembership(data);

    await safeAudit(() =>
      createAuditLog({
        action: 'MEMBERSHIP_CREATED',
        entityType: 'MEMBERSHIP',
        entityId: membership.id,
        userId: req.user?.id,
        organizationId: membership.organizationId,
        metadata: { role: membership.role },
      })
    );

    res.status(201).json(createSuccessResponse(membership));
  } catch (error) {
    next(error);
  }
}

export async function getOrganizationMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const members = await membershipService.getOrganizationMembers(id, skip, limit);
    res.json(createSuccessResponse(members));
  } catch (error) {
    next(error);
  }
}
