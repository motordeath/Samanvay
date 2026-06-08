import { SkillRepository } from "../repositories/skill.repository";

export class SkillService {
  private skillRepository =
    new SkillRepository();

  async createSkill(data: {
    name: string;
    description?: string;
  }) {
    return this.skillRepository.create(data);
  }

  async getSkills() {
    return this.skillRepository.findAll();
  }

  async getSkillById(id: string) {
    return this.skillRepository.findById(id);
  }
}