import { prisma } from "../../../prisma";

export class VolunteerNeedRepository {
  async create(data: {
    organizationId: string;
    eventId?: string;

    title: string;
    description?: string;

    requiredCount: number;

    location?: string;

    startDate: string;
    endDate: string;
  }) {
    return prisma.volunteerNeed.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  }

  async findAll() {
    return prisma.volunteerNeed.findMany();
  }

  async findById(id: string) {
    return prisma.volunteerNeed.findUnique({
      where: { id },
    });
  }
  async assignSkill(
  needId: string,
  skillId: string,
  requiredLevel:
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | "EXPERT",
  priority: number
) {
  return prisma.volunteerNeedSkill.create({
    data: {
      needId,
      skillId,
      requiredLevel,
      priority,
    },
  });
}
async getSkills(
  needId: string
) {
  return prisma.volunteerNeedSkill.findMany({
    where: {
      needId,
    },
    include: {
      skill: true,
    },
  });
}

  async removeSkill(
  needId: string,
  skillId: string
) {
  return prisma.volunteerNeedSkill.deleteMany({
    where: {
      needId,
      skillId,
    },
  });
}
}