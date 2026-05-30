import { Request, Response, NextFunction } from 'express';
import { createResourceLotSchema } from '../schemas/resource.schema';
import { createResourceLot, getResourceLots, getLotById } from '../services/resource-lot.service';
import { createSuccessResponse } from '../utils/response';

export async function createResourceLotController(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = createResourceLotSchema.parse(req.body);
    const lot = await createResourceLot(validatedData);
    res.status(201).json(createSuccessResponse(lot));
  } catch (error) {
    next(error);
  }
}

export async function getResourceLotsController(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const filters: any = {};
    if (req.query.organizationId) filters.organizationId = req.query.organizationId;
    if (req.query.resourceId) filters.resourceId = req.query.resourceId;

    const lots = await getResourceLots(filters, skip, limit);
    res.status(200).json(createSuccessResponse(lots));
  } catch (error) {
    next(error);
  }
}

export async function getResourceLotController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const lot = await getLotById(id);
    if (!lot) {
      return res.status(404).json({ success: false, error: { message: 'ResourceLot not found' } });
    }
    res.status(200).json(createSuccessResponse(lot));
  } catch (error) {
    next(error);
  }
}
