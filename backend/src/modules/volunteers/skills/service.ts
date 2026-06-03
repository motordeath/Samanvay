import { ConflictError, NotFoundError } from '../shared/errors';
import { skillRepository } from './repository';
import { volunteerRepository } from '../volunteer/repository';
import { SkillLevel } from '@prisma/client';

export class SkillService {
  async createSkill(name: string) {
    const existing = await skillRepository.findByName(name);
    if (existing) {
      throw new ConflictError('Skill name already exists');
    }
    return await skillRepository.create(name);
  }

  async getAllSkills() {
    return await skillRepository.findAll();
  }

  async addSkillToVolunteer(volunteerId: string, skillId: string, level: SkillLevel) {
    const volunteer = await volunteerRepository.findById(volunteerId);
    if (!volunteer) {
      throw new NotFoundError('Volunteer profile not found');
    }

    const skill = await skillRepository.findById(skillId);
    if (!skill) {
      throw new NotFoundError('Skill definition not found');
    }

    return await skillRepository.associateToVolunteer(volunteerId, skillId, level);
  }
}
export const skillService = new SkillService();
