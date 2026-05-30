import { Request, Response, NextFunction } from 'express';
import { createResourceNeedSchema } from '../schemas/resource.schema';
import { createResourceNeed, getResourceNeeds, getNeedById, cancelResourceNeed } from '../services/resource-need.service';
import { createSuccessResponse } from '../utils/response';
import { safeAudit } from '../utils/safe-audit';
import { createAuditLog } from '../services/audit.service';
import { AuthRequest } from '../middleware/auth.middleware';

export async function createResourceNeedController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const validatedData = createResourceNeedSchema.parse(req.body);
    const need = await createResourceNeed(validatedData);

    await safeAudit(() =>
      createAuditLog({
        action: 'RESOURCE_NEED_CREATED',
        entityType: 'RESOURCE_NEED',
        entityId: need.id,
        userId: req.user?.id,
        organizationId: need.organizationId,
      })
    );

    res.status(201).json(createSuccessResponse(need));
  } catch (error) {
    next(error);
  }
}

export async function getResourceNeedsController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const filters: any = {};
    if (req.query.organizationId) filters.organizationId = req.query.organizationId;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.resourceId) filters.resourceId = req.query.resourceId;

    const needs = await getResourceNeeds(filters, skip, limit);
    res.status(200).json(createSuccessResponse(needs));
  } catch (error) {
    next(error);
  }
}

export async function getResourceNeedController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const need = await getNeedById(id);
    if (!need) {
      return res.status(404).json({ success: false, error: { message: 'ResourceNeed not found' } });
    }
    res.status(200).json(createSuccessResponse(need));
  } catch (error) {
    next(error);
  }
}

export async function cancelResourceNeedController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const need = await cancelResourceNeed(id);

    await safeAudit(() =>
      createAuditLog({
        action: 'RESOURCE_NEED_CANCELLED',
        entityType: 'RESOURCE_NEED',
        entityId: need.id,
        userId: req.user?.id,
        organizationId: need.organizationId,
        metadata: {
          previousStatus: 'OPEN',
          newStatus: 'CANCELLED'
        }
      })
    );

    res.status(200).json(createSuccessResponse(need));
  } catch (error) {
    next(error);
  }
}
