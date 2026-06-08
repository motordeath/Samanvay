import { prisma } from "../../../prisma";

export class VolunteerAttendanceRepository {
  async checkIn(
    assignmentId: string
  ) {
    return prisma.volunteerAttendance.create({
      data: {
        assignmentId,
        checkInTime: new Date(),
      },
    });
  }

  async checkOut(
    assignmentId: string
  ) {
    return prisma.volunteerAttendance.update({
      where: {
        assignmentId,
      },
      data: {
        checkOutTime: new Date(),
      },
    });
  }

  async getAttendance(
    assignmentId: string
  ) {
    return prisma.volunteerAttendance.findUnique({
      where: {
        assignmentId,
      },
    });
  }
}