import { z } from 'zod';

export const createSkillSchema = z.object({
  name: z.string().min(1, { message: 'Skill name is required' }),
});

export const associateSkillSchema = z.object({
  skillId: z.string().uuid({ message: 'Skill ID must be a valid UUID' }),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], {
    errorMap: () => ({ message: 'Invalid SkillLevel' }),
  }),
});
