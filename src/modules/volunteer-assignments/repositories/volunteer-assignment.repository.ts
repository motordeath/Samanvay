import { prisma } from "../../../prisma";

export class VolunteerAssignmentRepository {
  async create(
    needId: string,
    volunteerId: string
  ) {
    return prisma.volunteerAssignment.create({
      data: {
        needId,
        volunteerId,
      },
    });
  }

  async getByVolunteer(
    volunteerId: string
  ) {
    return prisma.volunteerAssignment.findMany({
      where: {
        volunteerId,
      },
      include: {
        need: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status:
      | "CHECKED_IN"
      | "CHECKED_OUT"
      | "COMPLETED"
      | "CANCELLED"
  ) {
    return prisma.volunteerAssignment.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }
}