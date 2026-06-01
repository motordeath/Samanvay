import { ConflictError, NotFoundError } from '../shared/errors';
import { volunteerRepository } from './repository';
import { CreateVolunteerDTO, UpdateVolunteerDTO } from './types';
import { AuditService } from '../audit/AuditService';

export class VolunteerService {
  async register(data: CreateVolunteerDTO) {
    const existing = await volunteerRepository.findByUserId(data.userId);
    if (existing) {
      throw new ConflictError('Volunteer profile already exists for this user');
    }

    const volunteer = await volunteerRepository.create(data);

    await AuditService.log({
      action: 'VOLUNTEER_CREATED',
      volunteerId: volunteer.id,
      entityType: 'VOLUNTEER',
      entityId: volunteer.id,
      metadata: { userId: data.userId },
    });

    return volunteer;
  }

  async getById(id: string) {
    const volunteer = await volunteerRepository.findById(id);
    if (!volunteer) {
      throw new NotFoundError('Volunteer profile not found');
    }
    return volunteer;
  }

  async getByUserId(userId: string) {
    const volunteer = await volunteerRepository.findByUserId(userId);
    if (!volunteer) {
      throw new NotFoundError('Volunteer profile not found for user');
    }
    return volunteer;
  }

  async getAll() {
    return await volunteerRepository.findAll();
  }

  async update(id: string, data: UpdateVolunteerDTO) {
    await this.getById(id);
    return await volunteerRepository.update(id, data);
  }

  async deactivate(id: string) {
    await this.getById(id);
    const volunteer = await volunteerRepository.softDelete(id);

    await AuditService.log({
      action: 'VOLUNTEER_DEACTIVATED',
      volunteerId: volunteer.id,
      entityType: 'VOLUNTEER',
      entityId: volunteer.id,
    });

    return volunteer;
  }
}
export const volunteerService = new VolunteerService();
