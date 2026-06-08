import { Router } from "express";
import { VolunteerAttendanceController }
from "../controllers/volunteer-attendance.controller";

const router = Router();

const controller =
  new VolunteerAttendanceController();

router.post(
  "/:assignmentId/check-in",
  controller.checkIn
);

router.post(
  "/:assignmentId/check-out",
  controller.checkOut
);

router.get(
  "/:assignmentId",
  controller.getAttendance
);

export default router;