import { Request, Response } from 'express';
import { createResourceNeedSchema } from '../schemas/resource.schema';
import { createResourceNeed, getResourceNeeds, getNeedById, cancelResourceNeed } from '../services/resource-need.service';
import { createSuccessResponse } from '../utils/response';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../utils/errors';

export const createResourceNeedController = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createResourceNeedSchema.parse(req.body);
  const need = await createResourceNeed(validatedData);
  res.status(201).json(createSuccessResponse(need));
});

export const getResourceNeedsController = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  
  const filters: any = {};
  if (req.query.organizationId) filters.organizationId = req.query.organizationId;
  if (req.query.status) filters.status = req.query.status;
  if (req.query.resourceId) filters.resourceId = req.query.resourceId;

  const needs = await getResourceNeeds(filters, skip, limit);
  res.status(200).json(createSuccessResponse(needs));
});

export const getResourceNeedController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const need = await getNeedById(id);
  if (!need) {
    throw new NotFoundError('ResourceNeed not found');
  }
  res.status(200).json(createSuccessResponse(need));
});

export const cancelResourceNeedController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const need = await cancelResourceNeed(id);
  res.status(200).json(createSuccessResponse(need));
});
