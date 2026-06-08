import { prisma } from "../../../prisma";

export class SkillRepository {
  async create(data: {
    name: string;
    description?: string;
  }) {
    return prisma.skill.create({
      data,
    });
  }

  async findAll() {
    return prisma.skill.findMany();
  }

  async findById(id: string) {
    return prisma.skill.findUnique({
      where: { id },
    });
  }
}