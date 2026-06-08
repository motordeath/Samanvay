import { Request, Response } from "express";
import { SkillService } from "../services/skill.service";
import { createSkillSchema } from "../validators/skill.validator";

export class SkillController {
  private skillService =
    new SkillService();

  createSkill = async (
    req: Request,
    res: Response
  ) => {
    try {
      const validatedData =
        createSkillSchema.parse(req.body);

      const skill =
        await this.skillService.createSkill(
          validatedData
        );

      res.status(201).json(skill);
    } catch (error) {
      res.status(400).json({
        message: "Invalid skill data",
        error,
      });
    }
  };

  getSkills = async (
    req: Request,
    res: Response
  ) => {
    try {
      const skills =
        await this.skillService.getSkills();

      res.json(skills);
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch skills",
      });
    }
  };

  getSkillById = async (
    req: Request,
    res: Response
  ) => {
    try {
      const skill =
        await this.skillService.getSkillById(
          req.params.id
        );

      res.json(skill);
    } catch (error) {
      res.status(500).json({
        message: "Failed to fetch skill",
      });
    }
  };
}