import { prisma } from '../../../prisma';

export class AvailabilityRepository {
  async create(data: { volunteerId: string; dayOfWeek: number; startTime: string; endTime: string }) {
    return await prisma.volunteerAvailability.create({
      data: {
        volunteerId: data.volunteerId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
  }

  async findById(id: string) {
    return await prisma.volunteerAvailability.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findByVolunteerId(volunteerId: string) {
    return await prisma.volunteerAvailability.findMany({
      where: { volunteerId, isDeleted: false },
    });
  }

  async update(id: string, data: { dayOfWeek?: number; startTime?: string; endTime?: string }) {
    return await prisma.volunteerAvailability.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return await prisma.volunteerAvailability.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
export const availabilityRepository = new AvailabilityRepository();
