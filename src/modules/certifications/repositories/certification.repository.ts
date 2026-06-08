import { prisma } from "../../../prisma";

export class CertificationRepository {
  async create(data: {
    name: string;
    description?: string;
  }) {
    return prisma.certification.create({
      data,
    });
  }

  async findAll() {
    return prisma.certification.findMany();
  }

  async findById(id: string) {
    return prisma.certification.findUnique({
      where: { id },
    });
  }
}