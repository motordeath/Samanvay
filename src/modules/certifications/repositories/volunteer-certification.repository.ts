import { prisma } from "../../../prisma";

export class VolunteerCertificationRepository {
  async assign(
    volunteerId: string,
    certificationId: string,
    issuedAt?: Date,
    expiresAt?: Date
  ) {
    return prisma.volunteerCertification.create({
      data: {
        volunteerId,
        certificationId,
        issuedAt,
        expiresAt,
      },
    });
  }

  async getVolunteerCertifications(
    volunteerId: string
  ) {
    return prisma.volunteerCertification.findMany({
      where: {
        volunteerId,
      },
      include: {
        certification: true,
      },
    });
  }
}