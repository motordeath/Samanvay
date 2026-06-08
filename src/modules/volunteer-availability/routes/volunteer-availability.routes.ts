import { Router } from "express";
import { VolunteerAvailabilityController } from "../controllers/volunteer-availability.controller";

const router = Router();

const controller =
  new VolunteerAvailabilityController();

router.post(
  "/",
  controller.createAvailability
);

router.get(
  "/volunteer/:volunteerId",
  controller.getVolunteerAvailability
);

router.delete(
  "/:id",
  controller.deleteAvailability
);

export default router;