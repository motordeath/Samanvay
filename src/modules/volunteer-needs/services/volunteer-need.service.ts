import { VolunteerNeedRepository } from "../repositories/volunteer-need.repository";

export class VolunteerNeedService {
  private volunteerNeedRepository =
    new VolunteerNeedRepository();

  async createVolunteerNeed(data: {
    organizationId: string;
    eventId?: string;

    title: string;
    description?: string;

    requiredCount: number;

    location?: string;

    startDate: string;
    endDate: string;
  }) {
    return this.volunteerNeedRepository.create(
      data
    );
  }

  async getVolunteerNeeds() {
    return this.volunteerNeedRepository.findAll();
  }

  async getVolunteerNeedById(id: string) {
    return this.volunteerNeedRepository.findById(
      id
    );
  }
  async assignSkill(
  needId: string,
  skillId: string,
  requiredLevel:
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | "EXPERT",
  priority: number = 1
) {
  return this.volunteerNeedRepository.assignSkill(
    needId,
    skillId,
    requiredLevel,
    priority
  );
}

async getNeedSkills(
  needId: string
) {
  return this.volunteerNeedRepository.getSkills(
    needId
  );
}

async removeSkill(
  needId: string,
  skillId: string
) {
  return this.volunteerNeedRepository.removeSkill(
    needId,
    skillId
  );
}
}