import { Router } from "express";
import { VolunteerNeedController } from "../controllers/volunteer-need.controller";
import { MatchingService } from "../services/matching.service";

console.log("Volunteer Need Routes Loaded");

const router = Router();

const volunteerNeedController =
  new VolunteerNeedController();

const matchingService =
  new MatchingService();  

router.post(
  "/",
  volunteerNeedController.createVolunteerNeed
);

router.get(
  "/",
  volunteerNeedController.getVolunteerNeeds
);

router.get(
  "/:id",
  volunteerNeedController.getVolunteerNeedById
);

router.post(
  "/:id/skills",
  volunteerNeedController.assignSkill
);

router.get(
  "/:id/skills",
  volunteerNeedController.getNeedSkills
);

router.delete(
  "/:id/skills/:skillId",
  volunteerNeedController.removeSkill
);

router.post(
  "/:id/match",
  async (req, res) => {
    const result =
      await matchingService.matchVolunteers(
        req.params.id
      );

    res.json(result);
  }
);

router.get("/ping", (req, res) => {
  res.json({ message: "volunteer need route working" });
});

export default router;