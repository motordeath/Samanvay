import { Request, Response } from "express";
import { VolunteerInvitationService } from "../services/volunteer-invitation.service";

export class VolunteerInvitationController {
  private invitationService =
    new VolunteerInvitationService();

  createInvitation = async (
    req: Request,
    res: Response
  ) => {
    try {
      const invitation =
        await this.invitationService
          .createInvitation(
            req.body.needId,
            req.body.volunteerId
          );

      res.status(201).json(invitation);
    } catch (error) {
      res.status(400).json(error);
    }
  };

  getVolunteerInvitations = async (
    req: Request,
    res: Response
  ) => {
    const invitations =
      await this.invitationService
        .getVolunteerInvitations(
          req.params.volunteerId
        );

    res.json(invitations);
  };

  acceptInvitation = async (
    req: Request,
    res: Response
  ) => {
    const invitation =
      await this.invitationService
        .acceptInvitation(
          req.params.id
        );

    res.json(invitation);
  };

  declineInvitation = async (
    req: Request,
    res: Response
  ) => {
    const invitation =
      await this.invitationService
        .declineInvitation(
          req.params.id
        );

    res.json(invitation);
  };
}