import { Router } from "express";
import { VolunteerController }
from "../controllers/volunteer.controller";

const router = Router();

const volunteerController =
  new VolunteerController();

router.post(
  "/",
  volunteerController.createVolunteer
);

router.get(
  "/",
  volunteerController.getVolunteers
);

router.get(
  "/:id",
  volunteerController.getVolunteerById
);

router.put(
  "/:id",
  volunteerController.updateVolunteer
);

router.delete(
  "/:id",
  volunteerController.deleteVolunteer
);

router.post(
  "/:id/skills",
  volunteerController.assignSkill
);

router.get(
  "/:id/skills",
  volunteerController.getVolunteerSkills
);

router.delete(
  "/:id/skills/:skillId",
  volunteerController.removeSkill
);

export default router;