import { Request, Response, NextFunction } from 'express';
import * as membershipService from '../services/membership.service';
import { createMembershipSchema } from '../schemas/membership.schema';
import { createSuccessResponse } from '../utils/response';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createMembershipSchema.parse(req.body);
    const membership = await membershipService.createMembership(data);
    res.status(201).json(createSuccessResponse(membership));
  } catch (error) {
    next(error);
  }
}

export async function getOrganizationMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id);
    const members = await membershipService.getOrganizationMembers(id);
    res.json(createSuccessResponse(members));
  } catch (error) {
    next(error);
  }
}
