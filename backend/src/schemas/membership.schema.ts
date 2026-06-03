import { z } from 'zod';

export const createMembershipSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  role: z.enum(['ADMIN', 'COORDINATOR', 'MEMBER']),
  status: z.enum(['INVITED', 'PENDING', 'ACTIVE', 'REMOVED']).default('PENDING'),
});
