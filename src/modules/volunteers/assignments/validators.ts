import { z } from 'zod';

export const createAssignmentSchema = z.object({
  volunteerId: z.string().uuid({ message: 'Volunteer ID must be a valid UUID' }),
  needId: z.string().uuid({ message: 'Need ID must be a valid UUID' }),
});

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(['ASSIGNED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'], {
    errorMap: () => ({ message: 'Invalid AssignmentStatus' }),
  }),
});
