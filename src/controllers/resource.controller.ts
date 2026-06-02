import { Request, Response } from 'express';
import { createResourceSchema } from '../schemas/resource.schema';
import { createResource, getResources, getResourceById } from '../services/resource.service';
import { createSuccessResponse } from '../utils/response';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../utils/errors';

export const createResourceController = asyncHandler(async (req: Request, res: Response) => {
  const validatedData = createResourceSchema.parse(req.body);
  const resource = await createResource(validatedData);
  res.status(201).json(createSuccessResponse(resource));
});

export const getResourcesController = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  
  const resources = await getResources(skip, limit);
  res.status(200).json(createSuccessResponse(resources));
});

export const getResourceController = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const resource = await getResourceById(id);
  if (!resource) {
    throw new NotFoundError('Resource not found');
  }
  res.status(200).json(createSuccessResponse(resource));
});
