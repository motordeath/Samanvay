import { Request, Response } from "express";
import { VolunteerCertificationService }
from "../services/volunteer-certification.service";

export class VolunteerCertificationController {
  private service =
    new VolunteerCertificationService();

  assign = async (
    req: Request,
    res: Response
  ) => {
    const certification =
      await this.service.assign(
        req.body.volunteerId,
        req.body.certificationId,
        req.body.issuedAt
          ? new Date(req.body.issuedAt)
          : undefined,
        req.body.expiresAt
          ? new Date(req.body.expiresAt)
          : undefined
      );

    res.status(201).json(
      certification
    );
  };

  getVolunteerCertifications =
    async (
      req: Request,
      res: Response
    ) => {
      const certifications =
        await this.service
          .getVolunteerCertifications(
            req.params.volunteerId
          );

      res.json(certifications);
    };
}