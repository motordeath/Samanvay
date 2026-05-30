import { Request, Response, NextFunction } from 'express';
import { getTransfers, getTransferById, updateTransferStatus } from '../services/transfer.service';
import { createSuccessResponse } from '../utils/response';
import { safeAudit } from '../utils/safe-audit';
import { createAuditLog } from '../services/audit.service';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getTransfersController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const filters: any = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.organizationId) {
      // Transfer has fromOrganizationId and toOrganizationId.
      // Usually we want transfers where the organization is either side.
      filters.OR = [
        { fromOrganizationId: req.query.organizationId },
        { toOrganizationId: req.query.organizationId }
      ];
    }

    const transfers = await getTransfers(filters, skip, limit);
    res.status(200).json(createSuccessResponse(transfers));
  } catch (error) {
    next(error);
  }
}

export async function getTransferController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const transfer = await getTransferById(id);
    if (!transfer) {
      return res.status(404).json({ success: false, error: { message: 'Transfer not found' } });
    }
    res.status(200).json(createSuccessResponse(transfer));
  } catch (error) {
    next(error);
  }
}

export async function completeTransferController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const transfer = await updateTransferStatus(id, 'COMPLETED');

    await safeAudit(() =>
      createAuditLog({
        action: 'TRANSFER_COMPLETED',
        entityType: 'TRANSFER',
        entityId: transfer.id,
        userId: req.user?.id,
        organizationId: transfer.toOrganizationId,
        metadata: {
          previousStatus: 'IN_TRANSIT',
          newStatus: 'COMPLETED'
        }
      })
    );

    res.status(200).json(createSuccessResponse(transfer));
  } catch (error) {
    next(error);
  }
}

export async function cancelTransferController(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const transfer = await updateTransferStatus(id, 'CANCELLED');

    await safeAudit(() =>
      createAuditLog({
        action: 'TRANSFER_CANCELLED',
        entityType: 'TRANSFER',
        entityId: transfer.id,
        userId: req.user?.id,
        organizationId: transfer.toOrganizationId,
        metadata: {
          previousStatus: 'PENDING',
          newStatus: 'CANCELLED'
        }
      })
    );

    res.status(200).json(createSuccessResponse(transfer));
  } catch (error) {
    next(error);
  }
}

export const startTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const transfer = await updateTransferStatus(
      req.params.id,
      'IN_TRANSIT'
    );

    return res.json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    next(error);
  }
};
