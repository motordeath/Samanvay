import { z } from "zod";

export const assignNeedSkillSchema =
  z.object({
    skillId: z.string().uuid(),

    requiredLevel: z.enum([
      "BEGINNER",
      "INTERMEDIATE",
      "ADVANCED",
      "EXPERT",
    ]),

    priority: z.number().min(1).optional(),
  });
