import { Request, Response } from 'express';
import { createResourceLotSchema } from '../schemas/resource.schema';
import { createResourceLot, getResourceLots, getLotById } from '../services/resource-lot.service';
import { createSuccessResponse } from '../utils/response';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../utils/errors';

export const createResourceLotController = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createResourceLotSchema.parse(req.body);
  const lot = await createResourceLot(validatedData);
  res.status(201).json(createSuccessResponse(lot));
});

export const getResourceLotsController = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  
  const filters: any = {};
  if (req.query.organizationId) filters.organizationId = req.query.organizationId;
  if (req.query.resourceId) filters.resourceId = req.query.resourceId;

  const lots = await getResourceLots(filters, skip, limit);
  res.status(200).json(createSuccessResponse(lots));
});

export const getResourceLotController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const lot = await getLotById(id);
  if (!lot) {
    throw new NotFoundError('ResourceLot not found');
  }
  res.status(200).json(createSuccessResponse(lot));
});
