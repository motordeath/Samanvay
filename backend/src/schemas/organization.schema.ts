import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().max(200),
  type: z.enum(['NGO', 'CSR', 'GOVERNMENT', 'INSTITUTION', 'COMMUNITY']),
  sector: z.string(),
  description: z.string().max(2000).optional(),
  location: z.string().optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial().extend({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'ARCHIVED']).optional(),
});
