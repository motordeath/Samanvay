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
    const errorMessages = (err as ZodError).errors.map((e: any) => e.message).join(', ');
    return res.status(400).json(createErrorResponse(`Validation Error: ${errorMessages}`));
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json(createErrorResponse(message));
}
