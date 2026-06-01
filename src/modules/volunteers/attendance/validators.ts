import { z } from 'zod';

export const checkInSchema = z.object({
  assignmentId: z.string().uuid({ message: 'Assignment ID must be a valid UUID' }),
  verificationMethod: z.string().optional().nullable(),
  verifiedBy: z.string().optional().nullable(),
});

export const checkOutSchema = z.object({
  assignmentId: z.string().uuid({ message: 'Assignment ID must be a valid UUID' }),
  verificationMethod: z.string().optional().nullable(),
  verifiedBy: z.string().optional().nullable(),
});
