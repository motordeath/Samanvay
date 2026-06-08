import { Request, Response } from "express";
import { VolunteerAvailabilityService } from "../services/volunteer-availability.service";

export class VolunteerAvailabilityController {
  private service =
    new VolunteerAvailabilityService();

  createAvailability = async (
    req: Request,
    res: Response
  ) => {
    const availability =
      await this.service.create(req.body);

    res.status(201).json(
      availability
    );
  };

  getVolunteerAvailability =
    async (
      req: Request,
      res: Response
    ) => {
      const availability =
        await this.service.getVolunteerAvailability(
          req.params.volunteerId
        );

      res.json(availability);
    };

  deleteAvailability = async (
    req: Request,
    res: Response
  ) => {
    const availability =
      await this.service.delete(
        req.params.id
      );

    res.json(availability);
  };
}