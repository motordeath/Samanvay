export interface AssignNeedSkillDTO {
  skillId: string;

  requiredLevel:
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | "EXPERT";

  priority?: number;
}
