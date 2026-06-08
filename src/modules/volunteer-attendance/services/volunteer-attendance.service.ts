import { VolunteerAttendanceRepository }
from "../repositories/volunteer-attendance.repository";

export class VolunteerAttendanceService {
  private attendanceRepository =
    new VolunteerAttendanceRepository();

  async checkIn(
    assignmentId: string
  ) {
    return this.attendanceRepository.checkIn(
      assignmentId
    );
  }

  async checkOut(
    assignmentId: string
  ) {
    return this.attendanceRepository.checkOut(
      assignmentId
    );
  }

  async getAttendance(
    assignmentId: string
  ) {
    return this.attendanceRepository.getAttendance(
      assignmentId
    );
  }
}