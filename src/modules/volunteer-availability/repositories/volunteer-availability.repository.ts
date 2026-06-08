import { prisma } from "../../../prisma";

export class VolunteerAvailabilityRepository {
  async create(data: {
    volunteerId: string;
    dayOfWeek:
      | "MONDAY"
      | "TUESDAY"
      | "WEDNESDAY"
      | "THURSDAY"
      | "FRIDAY"
      | "SATURDAY"
      | "SUNDAY";
    startTime: Date;
    endTime: Date;
  }) {
    return prisma.volunteerAvailability.create({
      data,
    });
  }

  async findByVolunteer(
    volunteerId: string
  ) {
    return prisma.volunteerAvailability.findMany({
      where: {
        volunteerId,
      },
    });
  }

  async delete(id: string) {
    return prisma.volunteerAvailability.delete({
      where: {
        id,
      },
    });
  }
}