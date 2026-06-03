import { prisma } from '../../../prisma';

export class AttendanceRepository {
  async createCheckIn(data: {
    assignmentId: string;
    checkInTime: Date;
    verifiedBy?: string | null;
    verificationMethod?: string | null;
  }) {
    return await prisma.volunteerAttendance.create({
      data: {
        assignmentId: data.assignmentId,
        checkInTime: data.checkInTime,
        verifiedBy: data.verifiedBy ?? null,
        verificationMethod: data.verificationMethod ?? null,
      },
    });
  }

  async updateCheckOut(
    assignmentId: string,
    data: {
      checkOutTime: Date;
      verifiedBy?: string | null;
      verificationMethod?: string | null;
    }
  ) {
    return await prisma.volunteerAttendance.update({
      where: { assignmentId },
      data: {
        checkOutTime: data.checkOutTime,
        ...(data.verifiedBy !== undefined && { verifiedBy: data.verifiedBy }),
        ...(data.verificationMethod !== undefined && { verificationMethod: data.verificationMethod }),
      },
    });
  }

  async findByAssignmentId(assignmentId: string) {
    return await prisma.volunteerAttendance.findUnique({
      where: { assignmentId },
    });
  }
}
export const attendanceRepository = new AttendanceRepository();
