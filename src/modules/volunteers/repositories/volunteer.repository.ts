import { prisma } from "../../../prisma";

export class VolunteerRepository {
  async create(data: {
    userId: string;
    bio?: string;
    location?: string;
    experienceYears?: number;
  }) {
    return prisma.volunteer.create({
      data: {
        userId: data.userId,
        bio: data.bio,
        location: data.location,
        experienceYears: data.experienceYears ?? 0,
      },
    });
  }

  async findAll() {
    return prisma.volunteer.findMany({
      include: {
        user: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.volunteer.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  } 
  async update(
  id: string,
  data: {
    bio?: string;
    location?: string;
    experienceYears?: number;
  }
) {
  return prisma.volunteer.update({
    where: { id },
    data,
  });
}

async delete(id: string) {
  return prisma.volunteer.delete({
    where: { id },
  });
}
async assignSkill(
  volunteerId: string,
  skillId: string,
  level:
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | "EXPERT"
) {
  return prisma.volunteerSkill.create({
    data: {
      volunteerId,
      skillId,
      level,
    },
  });
}

async getSkills(
  volunteerId: string
) {
  return prisma.volunteerSkill.findMany({
    where: {
      volunteerId,
    },
    include: {
      skill: true,
    },
  });
}

async removeSkill(
  volunteerId: string,
  skillId: string
) {
  return prisma.volunteerSkill.deleteMany({
    where: {
      volunteerId,
      skillId,
    },
  });
}
}