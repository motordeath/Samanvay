import { prisma } from '../../../prisma';
import { SkillLevel } from '@prisma/client';

export class SkillRepository {
  async create(name: string) {
    return await prisma.skill.create({
      data: { name },
    });
  }

  async findByName(name: string) {
    return await prisma.skill.findUnique({
      where: { name },
    });
  }

  async findById(id: string) {
    return await prisma.skill.findUnique({
      where: { id },
    });
  }

  async findAll() {
    return await prisma.skill.findMany();
  }

  async associateToVolunteer(volunteerId: string, skillId: string, level: SkillLevel) {
    return await prisma.volunteerSkill.upsert({
      where: {
        volunteerId_skillId: { volunteerId, skillId },
      },
      update: { level },
      create: { volunteerId, skillId, level },
    });
  }

  async getVolunteerSkills(volunteerId: string) {
    return await prisma.volunteerSkill.findMany({
      where: { volunteerId },
      include: { skill: true },
    });
  }
}
export const skillRepository = new SkillRepository();
