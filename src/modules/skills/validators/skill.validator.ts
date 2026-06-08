import { z } from "zod";

export const createSkillSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});