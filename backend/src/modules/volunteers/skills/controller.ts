import { Request, Response } from 'express';
import { createSkillSchema, associateSkillSchema } from './validators';
import { skillService } from './service';
import { sendSuccess, sendError } from '../shared/responses';
import { SkillLevel } from '@prisma/client';

export async function createSkill(req: Request, res: Response) {
  try {
    const data = createSkillSchema.parse(req.body);
    const result = await skillService.createSkill(data.name);
    return sendSuccess(res, result, 201);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}

export async function getSkills(req: Request, res: Response) {
  try {
    const result = await skillService.getAllSkills();
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return sendError(res, error.message, statusCode);
  }
}

export async function associateSkill(req: Request, res: Response) {
  try {
    const volunteerId = req.params.volunteerId;
    const data = associateSkillSchema.parse(req.body);
    const result = await skillService.addSkillToVolunteer(
      volunteerId,
      data.skillId,
      data.level as SkillLevel
    );
    return sendSuccess(res, result);
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    return sendError(res, error.message, statusCode);
  }
}
