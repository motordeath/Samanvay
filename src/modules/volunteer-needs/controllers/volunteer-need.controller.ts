import { Request, Response } from "express";
import { VolunteerNeedService } from "../services/volunteer-need.service";
import { createVolunteerNeedSchema } from "../validators/volunteer-need.validator";
import { assignNeedSkillSchema } from "../validators/volunteer-need-skill.validator";
export class VolunteerNeedController {
  private volunteerNeedService =
    new VolunteerNeedService();

  createVolunteerNeed = async (
    req: Request,
    res: Response
  ) => {
    try {
      const data =
        createVolunteerNeedSchema.parse(
          req.body
        );

      const need =
        await this.volunteerNeedService
          .createVolunteerNeed(data);

      res.status(201).json(need);
    } catch (error) {
      res.status(400).json({
        message:
          "Invalid volunteer need data",
        error,
      });
    }
  };

  getVolunteerNeeds = async (
    req: Request,
    res: Response
  ) => {
    try {
      const needs =
        await this.volunteerNeedService
          .getVolunteerNeeds();

      res.json(needs);
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to fetch volunteer needs",
      });
    }
  };

  getVolunteerNeedById = async (
    req: Request,
    res: Response
  ) => {
    try {
      const need =
        await this.volunteerNeedService
          .getVolunteerNeedById(
            req.params.id
          );

      res.json(need);
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to fetch volunteer need",
      });
    }
  };
  assignSkill = async (
  req: Request,
  res: Response
) => {
  try {
    const data =
      assignNeedSkillSchema.parse(
        req.body
      );

    const result =
      await this.volunteerNeedService.assignSkill(
        req.params.id,
        data.skillId,
        data.requiredLevel,
        data.priority ?? 1
      );

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      message:
        "Invalid need skill data",
      error,
    });
  }
};
getNeedSkills = async (
  req: Request,
  res: Response
) => {
  try {
    const skills =
      await this.volunteerNeedService
        .getNeedSkills(
          req.params.id
        );

    res.json(skills);
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to fetch need skills",
    });
  }
};

removeSkill = async (
  req: Request,
  res: Response
) => {
  try {
    await this.volunteerNeedService
      .removeSkill(
        req.params.id,
        req.params.skillId
      );

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to remove need skill",
    });
  }
};

}