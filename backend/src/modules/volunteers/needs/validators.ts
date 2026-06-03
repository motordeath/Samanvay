import { z } from 'zod';

export const createNeedSkillSchema = z.object({
  skillId: z.string().uuid({ message: 'Skill ID must be a valid UUID' }),
  requiredLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], {
    errorMap: () => ({ message: 'Invalid SkillLevel' }),
  }),
});

export const createNeedSchema = z.object({
  organizationId: z.string().uuid({ message: 'Organization ID must be a valid UUID' }),
  eventId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, { message: 'Title is required' }),
  description: z.string().optional().nullable(),
  requiredCount: z.number().int().positive({ message: 'requiredCount must be positive' }),
  location: z.string().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  skills: z.array(createNeedSkillSchema).optional().default([]),
});

export const updateNeedSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  requiredCount: z.number().int().positive().optional(),
  location: z.string().optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['OPEN', 'FILLED', 'CLOSED']).optional(),
});
