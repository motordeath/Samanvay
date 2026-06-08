import { VolunteerInvitationRepository } from "../repositories/volunteer-invitation.repository";

export class VolunteerInvitationService {
  private invitationRepository =
    new VolunteerInvitationRepository();

  async createInvitation(
    needId: string,
    volunteerId: string
  ) {
    return this.invitationRepository.create(
      needId,
      volunteerId
    );
  }

  async getVolunteerInvitations(
    volunteerId: string
  ) {
    return this.invitationRepository.findByVolunteer(
      volunteerId
    );
  }

  async acceptInvitation(id: string) {
    return this.invitationRepository.updateStatus(
      id,
      "ACCEPTED"
    );
  }

  async declineInvitation(id: string) {
    return this.invitationRepository.updateStatus(
      id,
      "DECLINED"
    );
  }
}