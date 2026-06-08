import { z } from "zod";

export const createVolunteerNeedSchema =
  z.object({
    organizationId: z.string().uuid(),

    eventId: z.string().uuid().optional(),

    title: z.string().min(3),

    description: z.string().optional(),

    requiredCount: z.number().min(1),

    location: z.string().optional(),

    startDate: z.string(),

    endDate: z.string(),
  });