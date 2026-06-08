import { Request, Response } from "express";
import { VolunteerService } from "../services/volunteer.service";
import { createVolunteerSchema }from "../validators/volunteer.validator";
import { assignSkillSchema }from "../validators/volunteer-skill.validator";


export class VolunteerController {
  private volunteerService =
    new VolunteerService();

 createVolunteer = async (
  req: Request,
  res: Response
) => {
  try {
    const validatedData =
      createVolunteerSchema.parse(
        req.body
      );

    const volunteer =
      await this.volunteerService
        .createVolunteer(
          validatedData
        );

    res.status(201).json(volunteer);
  } catch (error) {
    res.status(400).json({
      message:
        "Invalid volunteer data",
      error,
    });
  }
}; 
    

  getVolunteers = async (
    req: Request,
    res: Response
  ) => {
    try {
      const volunteers =
        await this.volunteerService.getVolunteers();

      res.json(volunteers);
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to fetch volunteers",
      });
    }
  };

  getVolunteerById = async (
    req: Request,
    res: Response
  ) => {
    try {
      const volunteer =
        await this.volunteerService.getVolunteerById(
          req.params.id
        );

      res.json(volunteer);
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to fetch volunteer",
      });
    }

  };
  updateVolunteer = async (
  req: Request,
  res: Response
) => {
  try {
    const volunteer =
      await this.volunteerService.updateVolunteer(
        req.params.id,
        req.body
      );

    res.json(volunteer);
  } catch (error) {
    res.status(500).json({
      message: "Failed to update volunteer",
    });
  }
};
deleteVolunteer = async (
  req: Request,
  res: Response
) => {
  try {
    await this.volunteerService.deleteVolunteer(
      req.params.id
    );

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete volunteer",
    });
  }
};
assignSkill = async (
  req: Request,
  res: Response
) => {
  try {
    const data =
      assignSkillSchema.parse(req.body);

    const result =
      await this.volunteerService.assignSkill(
        req.params.id,
        data.skillId,
        data.level
      );

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      message: "Invalid skill assignment",
      error,
    });
  }
};

getVolunteerSkills = async (
  req: Request,
  res: Response
) => {
  try {
    const skills =
      await this.volunteerService
        .getVolunteerSkills(
          req.params.id
        );

    res.json(skills);
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to fetch volunteer skills",
    });
  }
};

removeSkill = async (
  req: Request,
  res: Response
) => {
  try {
    await this.volunteerService.removeSkill(
      req.params.id,
      req.params.skillId
    );

    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to remove skill",
    });
  }
};
}