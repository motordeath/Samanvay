import { Request, Response } from 'express';
import { getTransfers, getTransferById, updateTransferStatus } from '../services/transfer.service';
import { createSuccessResponse } from '../utils/response';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../utils/errors';

export const getTransfersController = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  
  const filters: any = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.organizationId) {
    filters.OR = [
      { fromOrganizationId: req.query.organizationId },
      { toOrganizationId: req.query.organizationId }
    ];
  }

  const transfers = await getTransfers(filters, skip, limit);
  res.status(200).json(createSuccessResponse(transfers));
});

export const getTransferController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const transfer = await getTransferById(id);
  if (!transfer) {
    throw new NotFoundError('Transfer not found');
  }
  res.status(200).json(createSuccessResponse(transfer));
});

/**
 * Note: organizationId and userId (if needed) are temporary placeholders until authentication 
 * and authorization middleware are implemented. Future phases will derive actor 
 * context from authenticated request state rather than request payloads.
 */
export const completeTransferController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const transfer = await updateTransferStatus(id, 'COMPLETED');
  res.status(200).json(createSuccessResponse(transfer));
});

/**
 * Note: organizationId and userId (if needed) are temporary placeholders until authentication 
 * and authorization middleware are implemented. Future phases will derive actor 
 * context from authenticated request state rather than request payloads.
 */
export const cancelTransferController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const transfer = await updateTransferStatus(id, 'CANCELLED');
  res.status(200).json(createSuccessResponse(transfer));
});
