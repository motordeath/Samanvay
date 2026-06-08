import { VolunteerCertificationRepository }
from "../repositories/volunteer-certification.repository";

export class VolunteerCertificationService {
  private repository =
    new VolunteerCertificationRepository();

  async assign(
    volunteerId: string,
    certificationId: string,
    issuedAt?: Date,
    expiresAt?: Date
  ) {
    return this.repository.assign(
      volunteerId,
      certificationId,
      issuedAt,
      expiresAt
    );
  }

  async getVolunteerCertifications(
    volunteerId: string
  ) {
    return this.repository.getVolunteerCertifications(
      volunteerId
    );
  }
}