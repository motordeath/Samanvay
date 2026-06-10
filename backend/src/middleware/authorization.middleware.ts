import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { getOrganizationContext } from '../utils/organization-context';
import { requireRole, requireTransferAccess } from '../services/authorization.service';

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
      console.log('HEADERS:', req.headers);
      console.log('BODY:', req.body);
      console.log('QUERY:', req.query);
      console.log('PARAMS:', req.params);
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

export function requireTransferOwnership(allowedRoles: string[] = ['OWNER', 'ADMIN']) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      const transferId = req.params.id;
      if (!transferId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Transfer ID required' }
        });
      }

      await requireTransferAccess(user.id, transferId, allowedRoles);
      next();
    } catch (error: any) {
      if (error.message === 'Access denied for transfer') {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied for transfer' }
        });
      }
      if (error.message === 'Transfer not found') {
        return res.status(404).json({
          success: false,
          error: { message: 'Transfer not found' }
        });
      }
      next(error);
    }
  };
}

export function requirePartnershipOwnership(allowedRoles: string[] = ['OWNER', 'ADMIN']) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      const partnershipId = req.params.id;
      if (!partnershipId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Partnership ID required' }
        });
      }

      const authService = await import('../services/authorization.service');
      await authService.requirePartnershipAccess(user.id, partnershipId, allowedRoles);
      next();
    } catch (error: any) {
      if (error.message === 'Access denied for partnership') {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied for partnership' }
        });
      }
      if (error.message === 'Partnership not found') {
        return res.status(404).json({
          success: false,
          error: { message: 'Partnership not found' }
        });
      }
      next(error);
    }
  };
}

export function requireOrganizationAccess(allowedRoles: string[] = ['OWNER', 'ADMIN', 'COORDINATOR', 'VOLUNTEER']) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      const organizationId = req.params.id;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Organization ID required' }
        });
      }

      const authService = await import('../services/authorization.service');
      await authService.requireOrganizationAccess(user.id, organizationId, allowedRoles);
      next();
    } catch (error: any) {
      if (error.message === 'Access denied for organization') {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied for organization' }
        });
      }
      if (error.message === 'Organization not found') {
        return res.status(404).json({
          success: false,
          error: { message: 'Organization not found' }
        });
      }
      next(error);
    }
  };
}

export function requireEventAccess(allowedRoles: string[] = ['OWNER', 'ADMIN', 'COORDINATOR']) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      const eventId = req.params.id;
      if (!eventId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Event ID required' }
        });
      }

      const authService = await import('../services/authorization.service');
      await authService.requireEventAccess(user.id, eventId, allowedRoles);
      next();
    } catch (error: any) {
      if (error.message === 'Access denied for event') {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied for event' }
        });
      }
      if (error.message === 'Event not found') {
        return res.status(404).json({
          success: false,
          error: { message: 'Event not found' }
        });
      }
      next(error);
    }
  };
}

export function requireMembershipAccess() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required' }
        });
      }

      const organizationId = req.params.id;
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Organization ID required' }
        });
      }

      const authService = await import('../services/authorization.service');
      await authService.requireMembershipAccess(user.id, organizationId);
      next();
    } catch (error: any) {
      if (error.message === 'Access denied for organization members') {
        return res.status(403).json({
          success: false,
          error: { message: 'Access denied for organization members' }
        });
      }
      next(error);
    }
  };
}
