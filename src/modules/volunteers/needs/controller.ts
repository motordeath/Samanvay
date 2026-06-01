import { Request, Response } from 'express';
import { createNeedSchema, updateNeedSchema } from './validators';
import { needService } from './service';
import { sendSuccess, sendError } from '../shared/responses';

function getRequestContext(req: Request) {
  const userId = (req.headers['x-user-id'] || 'mock-user-id') as string;
  const orgHeader = (req.headers['x-organization-ids'] || '') as string;
  const organizationIds = orgHeader ? orgHeader.split(',').map(s => s.trim()) : [];
  return { userId, organizationIds };
}

export async function createNeed(req: Request, res: Response) {
  try {
    const { userId, organizationIds } = getRequestContext(req);
    const data = createNeedSchema.parse(req.body);
    const result = await needService.createNeed(data, userId, organizationIds);
    return sendSuccess(res, result, 201);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function getNeed(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const result = await needService.getNeedById(id);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}

export async function getNeeds(req: Request, res: Response) {
  try {
    const result = await needService.getAllNeeds();
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}

export async function updateNeed(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const { organizationIds } = getRequestContext(req);
    const data = updateNeedSchema.parse(req.body);
    const result = await needService.updateNeed(id, data, organizationIds);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function deleteNeed(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const { organizationIds } = getRequestContext(req);
    const result = await needService.closeNeed(id, organizationIds);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}
