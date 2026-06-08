import { Request, Response } from "express";
import { CertificationService } from "../services/certification.service";

export class CertificationController {
  private service =
    new CertificationService();

  create = async (
    req: Request,
    res: Response
  ) => {
    const certification =
      await this.service.create(
        req.body
      );

    res.status(201).json(
      certification
    );
  };

  findAll = async (
    req: Request,
    res: Response
  ) => {
    const certifications =
      await this.service.findAll();

    res.json(certifications);
  };
}