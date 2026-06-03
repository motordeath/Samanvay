import { z } from 'zod';

export const createCertificationSchema = z.object({
  name: z.string().min(1, { message: 'Certification name is required' }),
});

export const associateCertificationSchema = z.object({
  certificationId: z.string().uuid({ message: 'Certification ID must be a valid UUID' }),
  issuedAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
});
