import { Request, Response } from "express";
import { VolunteerAssignmentService }
from "../services/volunteer-assignment.service";

export class VolunteerAssignmentController {
  private assignmentService =
    new VolunteerAssignmentService();

  createAssignment = async (
    req: Request,
    res: Response
  ) => {
    try {
      const assignment =
        await this.assignmentService
          .createAssignment(
            req.body.needId,
            req.body.volunteerId
          );

      res.status(201).json(
        assignment
      );
    } catch (error) {
      res.status(400).json(error);
    }
  };

  getVolunteerAssignments =
    async (
      req: Request,
      res: Response
    ) => {
      const assignments =
        await this.assignmentService
          .getVolunteerAssignments(
            req.params.volunteerId
          );

      res.json(assignments);
    };

  completeAssignment =
    async (
      req: Request,
      res: Response
    ) => {
      const assignment =
        await this.assignmentService
          .completeAssignment(
            req.params.id
          );

      res.json(assignment);
    };

  cancelAssignment =
    async (
      req: Request,
      res: Response
    ) => {
      const assignment =
        await this.assignmentService
          .cancelAssignment(
            req.params.id
          );

      res.json(assignment);
    };
}
