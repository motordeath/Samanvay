import { prisma } from "../../../prisma";

export class MatchingService {
  async matchVolunteers(
    needId: string
  ) {
    const need =
      await prisma.volunteerNeed.findUnique({
        where: { id: needId },
        include: {
          needSkills: {
            include: {
              skill: true,
            },
          },
        },
      });

    if (!need) {
      throw new Error(
        "Volunteer need not found"
      );
    }

    const volunteers =
      await prisma.volunteer.findMany({
        where: {
          isAvailable: true,
          isActive: true,
        },
        include: {
          volunteerSkills: {
            include: {
              skill: true,
            },
          },
        },
      });

    const matches = volunteers.map(
      (volunteer) => {
        let score = 0;

        for (const requiredSkill of need.needSkills) {
          const volunteerSkill =
            volunteer.volunteerSkills.find(
              (vs) =>
                vs.skillId ===
                requiredSkill.skillId
            );

          if (volunteerSkill) {
            score += 50;
          }
        }

        score +=
          volunteer.experienceYears * 5;

        return {
          volunteerId: volunteer.id,
          score,
          volunteer,
        };
      }
    );

    return matches.sort(
      (a, b) => b.score - a.score
    );
  }
}