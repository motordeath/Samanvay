import { Router } from "express";
import { VolunteerAssignmentController }
from "../controllers/volunteer-assignment.controller";

const router = Router();

const controller =
  new VolunteerAssignmentController();

router.post(
  "/",
  controller.createAssignment
);

router.get(
  "/volunteer/:volunteerId",
  controller.getVolunteerAssignments
);

router.post(
  "/:id/complete",
  controller.completeAssignment
);

router.post(
  "/:id/cancel",
  controller.cancelAssignment
);

export default router;