import { Router } from "express";
import { VolunteerInvitationController } from "../controllers/volunteer-invitation.controller";

const router = Router();

const controller =
  new VolunteerInvitationController();

router.post(
  "/",
  controller.createInvitation
);

router.get(
  "/volunteer/:volunteerId",
  controller.getVolunteerInvitations
);

router.post(
  "/:id/accept",
  controller.acceptInvitation
);

router.post(
  "/:id/decline",
  controller.declineInvitation
);

export default router;