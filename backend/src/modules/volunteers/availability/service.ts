import { ValidationError, NotFoundError } from '../shared/errors';
import { availabilityRepository } from './repository';
import { volunteerRepository } from '../volunteer/repository';

function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export class AvailabilityService {
  async addAvailability(data: { volunteerId: string; dayOfWeek: number; startTime: string; endTime: string }) {
    // Validate volunteer exists
    const volunteer = await volunteerRepository.findById(data.volunteerId);
    if (!volunteer) {
      throw new NotFoundError('Volunteer profile not found');
    }

    // Validate day of week
    if (data.dayOfWeek < 0 || data.dayOfWeek > 6) {
      throw new ValidationError('dayOfWeek must be between 0 and 6');
    }

    // Validate time range
    const start = parseTimeToMinutes(data.startTime);
    const end = parseTimeToMinutes(data.endTime);
    if (start >= end) {
      throw new ValidationError('startTime must be strictly before endTime');
    }

    return await availabilityRepository.create(data);
  }

  async getAvailabilityByVolunteer(volunteerId: string) {
    const volunteer = await volunteerRepository.findById(volunteerId);
    if (!volunteer) {
      throw new NotFoundError('Volunteer profile not found');
    }
    return await availabilityRepository.findByVolunteerId(volunteerId);
  }

  async updateAvailability(id: string, data: { dayOfWeek?: number; startTime?: string; endTime?: string }) {
    const existing = await availabilityRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Availability slot not found');
    }

    const dayOfWeek = data.dayOfWeek !== undefined ? data.dayOfWeek : existing.dayOfWeek;
    const startTime = data.startTime !== undefined ? data.startTime : existing.startTime;
    const endTime = data.endTime !== undefined ? data.endTime : existing.endTime;

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new ValidationError('dayOfWeek must be between 0 and 6');
    }

    const start = parseTimeToMinutes(startTime);
    const end = parseTimeToMinutes(endTime);
    if (start >= end) {
      throw new ValidationError('startTime must be strictly before endTime');
    }

    return await availabilityRepository.update(id, { dayOfWeek, startTime, endTime });
  }

  async removeAvailability(id: string) {
    const existing = await availabilityRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Availability slot not found');
    }
    return await availabilityRepository.softDelete(id);
  }
}
export const availabilityService = new AvailabilityService();
