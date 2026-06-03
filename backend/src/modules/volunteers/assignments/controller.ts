import { Request, Response } from 'express';
import { createAssignmentSchema, updateAssignmentStatusSchema } from './validators';
import { assignmentService } from './service';
import { sendSuccess, sendError } from '../shared/responses';
import { AssignmentStatus } from '@prisma/client';

function getRequestContext(req: Request) {
  const userId = (req.headers['x-user-id'] || 'mock-user-id') as string;
  return { userId };
}

export async function createAssignment(req: Request, res: Response) {
  try {
    const { userId } = getRequestContext(req);
    const data = createAssignmentSchema.parse(req.body);
    const result = await assignmentService.createAssignment(data, userId);
    return sendSuccess(res, result, 201);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function getAssignment(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const result = await assignmentService.getAssignmentById(id);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}

export async function getAssignments(req: Request, res: Response) {
  try {
    const result = await assignmentService.getAllAssignments();
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}

export async function updateAssignmentStatus(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const data = updateAssignmentStatusSchema.parse(req.body);
    const result = await assignmentService.updateAssignmentStatus(id, data.status as AssignmentStatus);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function completeAssignment(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const result = await assignmentService.updateAssignmentStatus(id, 'COMPLETED');
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function deleteAssignment(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const result = await assignmentService.removeAssignment(id);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}
