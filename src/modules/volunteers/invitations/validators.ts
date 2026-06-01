import { z } from 'zod';

export const createInvitationSchema = z.object({
  volunteerId: z.string().uuid({ message: 'Volunteer ID must be a valid UUID' }),
  needId: z.string().uuid({ message: 'Need ID must be a valid UUID' }),
  expiresAt: z.coerce.date().optional().nullable(),
});

export const respondInvitationSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED'], {
    errorMap: () => ({ message: 'Status must be ACCEPTED or DECLINED' }),
  }),
});
