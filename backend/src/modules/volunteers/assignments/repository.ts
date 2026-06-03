import { prisma } from '../../../prisma';
import { AssignmentStatus } from '@prisma/client';

export class AssignmentRepository {
  async create(data: { volunteerId: string; needId: string; createdBy: string }) {
    return await prisma.volunteerAssignment.create({
      data: {
        volunteerId: data.volunteerId,
        needId: data.needId,
        createdBy: data.createdBy,
        status: 'ASSIGNED',
      },
      include: { volunteer: true, need: true },
    });
  }

  async findById(id: string) {
    return await prisma.volunteerAssignment.findUnique({
      where: { id },
      include: { volunteer: true, need: true, attendance: true },
    });
  }

  async findByVolunteerAndNeed(volunteerId: string, needId: string) {
    return await prisma.volunteerAssignment.findUnique({
      where: {
        volunteerId_needId: { volunteerId, needId },
      },
      include: { volunteer: true, need: true },
    });
  }

  async countByNeed(needId: string) {
    return await prisma.volunteerAssignment.count({
      where: { needId },
    });
  }

  async findAll() {
    return await prisma.volunteerAssignment.findMany({
      include: { volunteer: true, need: true, attendance: true },
    });
  }

  async updateStatus(id: string, status: AssignmentStatus, completedAt?: Date | null) {
    return await prisma.volunteerAssignment.update({
      where: { id },
      data: {
        status,
        ...(completedAt !== undefined && { completedAt }),
      },
      include: { volunteer: true, need: true },
    });
  }
}
export const assignmentRepository = new AssignmentRepository();
