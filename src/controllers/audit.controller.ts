import { Request, Response, NextFunction } from 'express';
import { getAuditLogs } from '../services/audit.service';
import { getOrganizationContext } from '../utils/organization-context';
import { createSuccessResponse } from '../utils/response';
import { AuditAction } from '@prisma/client';

export async function getAuditLogsController(req: Request, res: Response, next: NextFunction) {
  try {
    const organizationId = getOrganizationContext(req);
    if (!organizationId) {
      return res.status(400).json({ success: false, error: { message: 'Organization context required' } });
    }

    const userId = req.query.userId as string | undefined;
    const action = req.query.action as AuditAction | undefined;
    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;
    const take = req.query.take ? parseInt(req.query.take as string, 10) : 20;

    const logs = await getAuditLogs(
      { organizationId, userId, action },
      skip,
      take
    );

    res.json(createSuccessResponse(logs));
  } catch (error) {
    next(error);
  }
}
