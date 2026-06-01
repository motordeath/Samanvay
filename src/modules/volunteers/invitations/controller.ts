import { Request, Response } from 'express';
import { createInvitationSchema, respondInvitationSchema } from './validators';
import { invitationService } from './service';
import { sendSuccess, sendError } from '../shared/responses';

function getRequestContext(req: Request) {
  const userId = (req.headers['x-user-id'] || 'mock-user-id') as string;
  const orgHeader = (req.headers['x-organization-ids'] || '') as string;
  const organizationIds = orgHeader ? orgHeader.split(',').map(s => s.trim()) : [];
  return { userId, organizationIds };
}

export async function sendInvitation(req: Request, res: Response) {
  try {
    const { userId, organizationIds } = getRequestContext(req);
    const data = createInvitationSchema.parse(req.body);
    const result = await invitationService.sendInvitation(data, userId, organizationIds);
    return sendSuccess(res, result, 201);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function respondInvitation(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const { userId } = getRequestContext(req);
    const data = respondInvitationSchema.parse(req.body);
    const result = await invitationService.respondToInvitation(id, data.status, userId);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function getInvitations(req: Request, res: Response) {
  try {
    const result = await invitationService.getAllInvitations();
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}
