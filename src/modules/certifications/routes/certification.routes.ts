import { Router } from "express";
import { CertificationController } from "../controllers/certification.controller";
import { VolunteerCertificationController } from "../controllers/volunteer-certification.controller";

const router = Router();

const certificationController =
  new CertificationController();

const volunteerCertificationController =
  new VolunteerCertificationController();

router.post(
  "/",
  certificationController.create
);

router.get(
  "/",
  certificationController.findAll
);

router.post(
  "/assign",
  volunteerCertificationController.assign
);

router.get(
  "/volunteer/:volunteerId",
  volunteerCertificationController.getVolunteerCertifications
);

export default router;