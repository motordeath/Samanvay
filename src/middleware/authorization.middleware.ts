import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { getOrganizationContext } from '../utils/organization-context';
import { requireRole } from '../services/authorization.service';

export function requireOrganizationRole(allowedRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      const organizationId = getOrganizationContext(req);
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Organization context required' }
        });
      }

      await requireRole(user.id, organizationId, allowedRoles);

      next();
    } catch (error: any) {
      if (error.message === 'Membership required') {
        return res.status(403).json({
          success: false,
          error: { message: 'Membership required' }
        });
      }
      if (error.message === 'Insufficient permissions') {
        return res.status(403).json({
          success: false,
          error: { message: 'Insufficient permissions' }
        });
      }
      next(error);
    }
  };
}
