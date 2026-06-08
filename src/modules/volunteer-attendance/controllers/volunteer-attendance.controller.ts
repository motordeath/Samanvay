import { Request, Response } from "express";
import { VolunteerAttendanceService }
from "../services/volunteer-attendance.service";

export class VolunteerAttendanceController {
  private attendanceService =
    new VolunteerAttendanceService();

  checkIn = async (
    req: Request,
    res: Response
  ) => {
    const attendance =
      await this.attendanceService.checkIn(
        req.params.assignmentId
      );

    res.status(201).json(
      attendance
    );
  };

  checkOut = async (
    req: Request,
    res: Response
  ) => {
    const attendance =
      await this.attendanceService.checkOut(
        req.params.assignmentId
      );

    res.json(attendance);
  };

  getAttendance = async (
    req: Request,
    res: Response
  ) => {
    const attendance =
      await this.attendanceService.getAttendance(
        req.params.assignmentId
      );

    res.json(attendance);
  };
}