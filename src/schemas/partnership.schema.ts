import { z } from 'zod';

export const createPartnershipSchema = z.object({
  requestingOrganizationId: z.string().uuid(),
  targetOrganizationId: z.string().uuid(),
  requestedById: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'ENDED']).default('PENDING'),
});

export const updatePartnershipSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'ENDED']),
});
