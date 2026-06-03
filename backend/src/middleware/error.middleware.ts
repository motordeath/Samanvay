import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '../utils/response';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(err);

  if (err instanceof ZodError) {
    const errorMessages = err.errors.map((e: any) => e.message).join(', ');
    return res.status(400).json(createErrorResponse(`Validation Error: ${errorMessages}`));
  }

  // Handle custom domain errors
  if (err.statusCode) {
    return res.status(err.statusCode).json(createErrorResponse(err.message));
  }

  // Handle Prisma Known Request Errors safely (do not expose Prisma internals)
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json(createErrorResponse('A unique constraint would be violated.'));
    }
    if (err.code === 'P2025') {
      return res.status(404).json(createErrorResponse('Record not found.'));
    }
    return res.status(400).json(createErrorResponse('Database constraint violation.'));
  }

  // Simple string matching for unrefactored service throws
  const msg = err.message || '';
  if (msg.includes('not found')) {
    return res.status(404).json(createErrorResponse(msg));
  }
  if (msg.includes('transition') || msg.includes('exceed') || msg.includes('must be')) {
    return res.status(409).json(createErrorResponse(msg));
  }
  if (msg.includes('Only the organization')) {
    return res.status(403).json(createErrorResponse(msg));
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json(createErrorResponse(message));
}
