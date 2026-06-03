import { prisma } from '../../../prisma';
import { VolunteerNeedStatus, SkillLevel } from '@prisma/client';

export class NeedRepository {
  async create(data: {
    organizationId: string;
    eventId?: string | null;
    title: string;
    description?: string | null;
    requiredCount: number;
    location?: string | null;
    startDate: Date;
    endDate: Date;
    createdBy: string;
    skills?: { skillId: string; requiredLevel: SkillLevel }[];
  }) {
    return await prisma.$transaction(async (tx) => {
      const need = await tx.volunteerNeed.create({
        data: {
          organizationId: data.organizationId,
          eventId: data.eventId ?? null,
          title: data.title,
          description: data.description ?? null,
          requiredCount: data.requiredCount,
          location: data.location ?? null,
          startDate: data.startDate,
          endDate: data.endDate,
          createdBy: data.createdBy,
          status: 'OPEN',
        },
      });

      if (data.skills && data.skills.length > 0) {
        await tx.volunteerNeedSkill.createMany({
          data: data.skills.map((s) => ({
            needId: need.id,
            skillId: s.skillId,
            requiredLevel: s.requiredLevel,
          })),
        });
      }

      return await tx.volunteerNeed.findUnique({
        where: { id: need.id },
        include: { skills: { include: { skill: true } } },
      });
    });
  }

  async findById(id: string) {
    return await prisma.volunteerNeed.findUnique({
      where: { id },
      include: { skills: { include: { skill: true } } },
    });
  }

  async findAll() {
    return await prisma.volunteerNeed.findMany({
      where: { status: { not: 'CLOSED' } },
      include: { skills: { include: { skill: true } } },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      requiredCount?: number;
      location?: string | null;
      startDate?: Date;
      endDate?: Date;
      status?: VolunteerNeedStatus;
    }
  ) {
    return await prisma.volunteerNeed.update({
      where: { id },
      data,
      include: { skills: { include: { skill: true } } },
    });
  }

  async softDelete(id: string) {
    return await prisma.volunteerNeed.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: { skills: { include: { skill: true } } },
    });
  }
}
export const needRepository = new NeedRepository();
