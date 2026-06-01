import { z } from 'zod';

export const createVolunteerSchema = z.object({
  userId: z.string().uuid({ message: 'User ID must be a valid UUID' }),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  experienceYears: z.number().int().nonnegative({ message: 'Experience years must be a non-negative integer' }).optional().nullable(),
});

export const updateVolunteerSchema = z.object({
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  experienceYears: z.number().int().nonnegative({ message: 'Experience years must be a non-negative integer' }).optional().nullable(),
  isAvailable: z.boolean().optional(),
});
