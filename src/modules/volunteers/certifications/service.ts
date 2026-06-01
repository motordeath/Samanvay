import { ConflictError, NotFoundError } from '../shared/errors';
import { certificationRepository } from './repository';
import { volunteerRepository } from '../volunteer/repository';

export class CertificationService {
  async createCertification(name: string) {
    const existing = await certificationRepository.findByName(name);
    if (existing) {
      throw new ConflictError('Certification name already exists');
    }
    return await certificationRepository.create(name);
  }

  async getAllCertifications() {
    return await certificationRepository.findAll();
  }

  async addCertificationToVolunteer(
    volunteerId: string,
    certificationId: string,
    issuedAt?: Date | null,
    expiresAt?: Date | null
  ) {
    const volunteer = await volunteerRepository.findById(volunteerId);
    if (!volunteer) {
      throw new NotFoundError('Volunteer profile not found');
    }

    const certification = await certificationRepository.findById(certificationId);
    if (!certification) {
      throw new NotFoundError('Certification definition not found');
    }

    return await certificationRepository.associateToVolunteer(
      volunteerId,
      certificationId,
      issuedAt,
      expiresAt
    );
  }
}
export const certificationService = new CertificationService();
