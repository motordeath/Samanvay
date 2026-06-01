import { prisma } from '../../../prisma';
import { InvitationStatus } from '@prisma/client';

export class InvitationRepository {
  async create(data: { volunteerId: string; needId: string; expiresAt?: Date | null; createdBy: string }) {
    return await prisma.volunteerInvitation.create({
      data: {
        volunteerId: data.volunteerId,
        needId: data.needId,
        expiresAt: data.expiresAt ?? null,
        createdBy: data.createdBy,
        status: 'PENDING',
      },
    });
  }

  async findById(id: string) {
    return await prisma.volunteerInvitation.findUnique({
      where: { id },
      include: { volunteer: true, need: true },
    });
  }

  async findByVolunteerAndNeed(volunteerId: string, needId: string) {
    return await prisma.volunteerInvitation.findUnique({
      where: {
        volunteerId_needId: { volunteerId, needId },
      },
      include: { volunteer: true, need: true },
    });
  }

  async findAll() {
    return await prisma.volunteerInvitation.findMany({
      include: { volunteer: true, need: true },
    });
  }

  async updateStatus(id: string, status: InvitationStatus, respondedAt?: Date | null) {
    return await prisma.volunteerInvitation.update({
      where: { id },
      data: {
        status,
        ...(respondedAt !== undefined && { respondedAt }),
      },
      include: { volunteer: true, need: true },
    });
  }
}
export const invitationRepository = new InvitationRepository();
