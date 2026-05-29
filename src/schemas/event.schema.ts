import { z } from 'zod';

export const createEventSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().max(200),
  type: z.string(),
  description: z.string().max(5000).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  createdById: z.string().uuid(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
});
