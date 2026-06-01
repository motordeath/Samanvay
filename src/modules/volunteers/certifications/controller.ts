import { Request, Response } from 'express';
import { createCertificationSchema, associateCertificationSchema } from './validators';
import { certificationService } from './service';
import { sendSuccess, sendError } from '../shared/responses';

export async function createCertification(req: Request, res: Response) {
  try {
    const data = createCertificationSchema.parse(req.body);
    const result = await certificationService.createCertification(data.name);
    return sendSuccess(res, result, 201);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function getCertifications(req: Request, res: Response) {
  try {
    const result = await certificationService.getAllCertifications();
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}

export async function associateCertification(req: Request, res: Response) {
  try {
    const volunteerId = req.params.volunteerId;
    const data = associateCertificationSchema.parse(req.body);
    const result = await certificationService.addCertificationToVolunteer(
      volunteerId,
      data.certificationId,
      data.issuedAt,
      data.expiresAt
    );
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}
