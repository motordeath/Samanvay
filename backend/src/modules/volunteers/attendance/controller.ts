import { Request, Response } from 'express';
import { checkInSchema, checkOutSchema } from './validators';
import { attendanceService } from './service';
import { sendSuccess, sendError } from '../shared/responses';

export async function checkIn(req: Request, res: Response) {
  try {
    const data = checkInSchema.parse(req.body);
    const result = await attendanceService.checkIn(data);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function checkOut(req: Request, res: Response) {
  try {
    const data = checkOutSchema.parse(req.body);
    const result = await attendanceService.checkOut(data);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function getAttendance(req: Request, res: Response) {
  try {
    const assignmentId = req.params.assignmentId;
    const result = await attendanceService.getAttendanceByAssignment(assignmentId);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}
