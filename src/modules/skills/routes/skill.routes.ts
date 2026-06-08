import { Router } from "express";
import { SkillController } from "../controllers/skill.controller";

const router = Router();

const skillController =
  new SkillController();

router.post(
  "/",
  skillController.createSkill
);

router.get(
  "/",
  skillController.getSkills
);

router.get(
  "/:id",
  skillController.getSkillById
);

export default router;