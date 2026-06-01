import { prisma } from '../../../prisma';
import { CreateVolunteerDTO, UpdateVolunteerDTO } from './types';

export class VolunteerRepository {
  async create(data: CreateVolunteerDTO) {
    return await prisma.volunteer.create({
      data: {
        userId: data.userId,
        bio: data.bio ?? null,
        location: data.location ?? null,
        experienceYears: data.experienceYears ?? null,
      },
    });
  }

  async findById(id: string) {
    return await prisma.volunteer.findUnique({
      where: { id },
      include: {
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        availability: true,
      },
    });
  }

  async findByUserId(userId: string) {
    return await prisma.volunteer.findUnique({
      where: { userId },
      include: {
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        availability: true,
      },
    });
  }

  async findAll() {
    return await prisma.volunteer.findMany({
      where: { isActive: true },
      include: {
        skills: { include: { skill: true } },
        certifications: { include: { certification: true } },
        availability: true,
      },
    });
  }

  async update(id: string, data: UpdateVolunteerDTO) {
    return await prisma.volunteer.update({
      where: { id },
      data: {
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.experienceYears !== undefined && { experienceYears: data.experienceYears }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      },
    });
  }

  async softDelete(id: string) {
    return await prisma.volunteer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
export const volunteerRepository = new VolunteerRepository();
