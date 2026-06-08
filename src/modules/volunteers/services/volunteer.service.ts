import { VolunteerRepository } from "../repositories/volunteer.repository";

export class VolunteerService {
  private volunteerRepository =
    new VolunteerRepository();

  async createVolunteer(data: {
    userId: string;
    bio?: string;
    location?: string;
    experienceYears?: number;
  }) {
    return this.volunteerRepository.create(data);
  }

  async getVolunteers() {
    return this.volunteerRepository.findAll();
  }

  async getVolunteerById(id: string) {
    return this.volunteerRepository.findById(id);
  }
  async updateVolunteer(
  id: string,
  data: {
    bio?: string;
    location?: string;
    experienceYears?: number;
  }
) {
  return this.volunteerRepository.update(
    id,
    data
  );
}

async deleteVolunteer(id: string) {
  return this.volunteerRepository.delete(id);
}
async assignSkill(
  volunteerId: string,
  skillId: string,
  level:
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | "EXPERT"
) {
  return this.volunteerRepository.assignSkill(
    volunteerId,
    skillId,
    level
  );
}

async getVolunteerSkills(
  volunteerId: string
) {
  return this.volunteerRepository.getSkills(
    volunteerId
  );
}

async removeSkill(
  volunteerId: string,
  skillId: string
) {
  return this.volunteerRepository.removeSkill(
    volunteerId,
    skillId
  );
}
}