import { Request, Response } from 'express';
import { matchingService } from './service';
import { sendSuccess, sendError } from '../shared/responses';

export async function computeMatches(req: Request, res: Response) {
  try {
    const needId = req.params.needId;
    const result = await matchingService.getMatchesForNeed(needId);
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}
