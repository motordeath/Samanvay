import { Request, Response, NextFunction } from 'express';
import { createResourceSchema } from '../schemas/resource.schema';
import { createResource, getResources, getResourceById } from '../services/resource.service';
import { createSuccessResponse } from '../utils/response';

export async function createResourceController(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = createResourceSchema.parse(req.body);
    const resource = await createResource(validatedData);
    res.status(201).json(createSuccessResponse(resource));
  } catch (error) {
    next(error);
  }
}

export async function getResourcesController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const resources = await getResources(skip, limit);
    res.status(200).json(createSuccessResponse(resources));
  } catch (error) {
    next(error);
  }
}

export async function getResourceController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const resource = await getResourceById(id);
    if (!resource) {
      return res.status(404).json({ success: false, error: { message: 'Resource not found' } });
    }
    res.status(200).json(createSuccessResponse(resource));
  } catch (error) {
    next(error);
  }
}
