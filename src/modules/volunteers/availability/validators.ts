import { z } from 'zod';

export const createAvailabilitySchema = z.object({
  volunteerId: z.string().uuid({ message: 'Volunteer ID must be a valid UUID' }),
  dayOfWeek: z.number().int().min(0, { message: 'dayOfWeek must be between 0 and 6' }).max(6, { message: 'dayOfWeek must be between 0 and 6' }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be in HH:MM format' }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be in HH:MM format' }),
});

export const updateAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0, { message: 'dayOfWeek must be between 0 and 6' }).max(6, { message: 'dayOfWeek must be between 0 and 6' }).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'startTime must be in HH:MM format' }).optional(),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'endTime must be in HH:MM format' }).optional(),
});
