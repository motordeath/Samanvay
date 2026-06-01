import { Request, Response } from 'express';
import { createAvailabilitySchema, updateAvailabilitySchema } from './validators';
import { availabilityService } from './service';
import { sendSuccess, sendError } from '../shared/responses';

export async function createAvailability(req: Request, res: Response) {
  try {
    const data = createAvailabilitySchema.parse(req.body);
    const result = await availabilityService.addAvailability(data);
    return sendSuccess(res, result, 201);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function getVolunteerAvailability(req: Request, res: Response) {
  try {
    const volunteerId = req.params.volunteerId;
    const result = await availabilityService.getAvailabilityByVolunteer(volunteerId);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}

export async function updateAvailability(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const data = updateAvailabilitySchema.parse(req.body);
    const result = await availabilityService.updateAvailability(id, data);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function deleteAvailability(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const result = await availabilityService.removeAvailability(id);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}
