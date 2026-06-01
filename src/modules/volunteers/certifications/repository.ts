import { prisma } from '../../../prisma';

export class CertificationRepository {
  async create(name: string) {
    return await prisma.certification.create({
      data: { name },
    });
  }

  async findByName(name: string) {
    return await prisma.certification.findUnique({
      where: { name },
    });
  }

  async findById(id: string) {
    return await prisma.certification.findUnique({
      where: { id },
    });
  }

  async findAll() {
    return await prisma.certification.findMany();
  }

  async associateToVolunteer(
    volunteerId: string,
    certificationId: string,
    issuedAt?: Date | null,
    expiresAt?: Date | null
  ) {
    return await prisma.volunteerCertification.upsert({
      where: {
        volunteerId_certificationId: { volunteerId, certificationId },
      },
      update: {
        issuedAt: issuedAt ?? null,
        expiresAt: expiresAt ?? null,
      },
      create: {
        volunteerId,
        certificationId,
        issuedAt: issuedAt ?? null,
        expiresAt: expiresAt ?? null,
      },
    });
  }

  async getVolunteerCertifications(volunteerId: string) {
    return await prisma.volunteerCertification.findMany({
      where: { volunteerId },
      include: { certification: true },
    });
  }
}
export const certificationRepository = new CertificationRepository();
