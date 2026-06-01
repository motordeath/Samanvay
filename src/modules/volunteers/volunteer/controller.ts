import { Request, Response } from 'express';
import { createVolunteerSchema, updateVolunteerSchema } from './validators';
import { volunteerService } from './service';
import { sendSuccess, sendError } from '../shared/responses';

export async function createVolunteer(req: Request, res: Response) {
  try {
    const data = createVolunteerSchema.parse(req.body);
    const result = await volunteerService.register(data);
    return sendSuccess(res, result, 201);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message || 'Validation Error', statusCode);
  }
}

export async function getVolunteer(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const result = await volunteerService.getById(id);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}

export async function getVolunteers(req: Request, res: Response) {
  try {
    const result = await volunteerService.getAll();
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}

export async function updateVolunteer(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const data = updateVolunteerSchema.parse(req.body);
    const result = await volunteerService.update(id, data);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function deleteVolunteer(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const result = await volunteerService.deactivate(id);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}
