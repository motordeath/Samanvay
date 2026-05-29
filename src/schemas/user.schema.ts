import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().max(120),
  email: z.string().email(),
  password: z.string().min(8), // We'll hash this in service
});
