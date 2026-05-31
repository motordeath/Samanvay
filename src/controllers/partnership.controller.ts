import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as partnershipService from '../services/partnership.service';
import { createPartnershipSchema, updatePartnershipSchema } from '../schemas/partnership.schema';
import { createSuccessResponse } from '../utils/response';

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = createPartnershipSchema.parse(req.body);
    const partnershipData = {
      ...data,
      requestedById: req.user!.id,
    };
    const partnership = await partnershipService.createPartnership(partnershipData as any);
    res.status(201).json(createSuccessResponse(partnership));
  } catch (error) {
    next(error);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const data = updatePartnershipSchema.parse(req.body);
    const partnership = await partnershipService.updatePartnership(id, data);
    res.json(createSuccessResponse(partnership));
  } catch (error) {
    next(error);
  }
}
