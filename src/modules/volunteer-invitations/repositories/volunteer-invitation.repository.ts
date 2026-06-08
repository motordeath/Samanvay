import { prisma } from "../../../prisma";

export class VolunteerInvitationRepository {
  async create(
    needId: string,
    volunteerId: string
  ) {
    return prisma.volunteerInvitation.create({
      data: {
        needId,
        volunteerId,
      },
    });
  }

  async findByVolunteer(
    volunteerId: string
  ) {
    return prisma.volunteerInvitation.findMany({
      where: {
        volunteerId,
      },
      include: {
        need: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status:
      | "ACCEPTED"
      | "DECLINED"
      | "EXPIRED"
  ) {
    return prisma.volunteerInvitation.update({
      where: { id },

      data: {
        status,
        respondedAt: new Date(),
      },
    });
  }
}

