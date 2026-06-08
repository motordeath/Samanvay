export interface AssignSkillDTO {
  skillId: string;
  level:
    | "BEGINNER"
    | "INTERMEDIATE"
    | "ADVANCED"
    | "EXPERT";
}