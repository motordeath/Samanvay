import { Request, Response, NextFunction } from 'express';
import * as partnershipService from '../services/partnership.service';
import { createPartnershipSchema, updatePartnershipSchema } from '../schemas/partnership.schema';
import { createSuccessResponse } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createPartnershipSchema.parse(req.body);
    const partnership = await partnershipService.createPartnership(data);
    res.status(201).json(createSuccessResponse(partnership));
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const data = updatePartnershipSchema.parse(req.body);
    const partnership = await partnershipService.updatePartnership(id, data);
    res.json(createSuccessResponse(partnership));
  } catch (error) {
    next(error);
  }
}
