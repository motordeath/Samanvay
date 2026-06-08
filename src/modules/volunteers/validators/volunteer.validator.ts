import { z } from "zod";

export const createVolunteerSchema = z.object({
  userId: z.string().uuid(),

  bio: z.string().optional(),

  location: z.string().optional(),

  experienceYears:
    z.number().min(0).optional(),
});