import { z } from "zod";

export const assignSkillSchema = z.object({
  skillId: z.string().uuid(),

  level: z.enum([
    "BEGINNER",
    "INTERMEDIATE",
    "ADVANCED",
    "EXPERT",
  ]),
});