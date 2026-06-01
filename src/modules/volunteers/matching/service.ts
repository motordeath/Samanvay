import { prisma } from '../../../prisma';
import { NotFoundError } from '../shared/errors';
import { SkillLevel } from '@prisma/client';

const SKILL_LEVEL_VALUES: Record<SkillLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

export class MatchingService {
  async getMatchesForNeed(needId: string) {
    // 1. Fetch the Need
    const need = await prisma.volunteerNeed.findUnique({
      where: { id: needId },
      include: {
        skills: { include: { skill: true } },
      },
    });

    if (!need) {
      throw new NotFoundError('Volunteer Need not found');
    }

    if (need.status === 'CLOSED') {
      return [];
    }

    // 2. Fetch all Active & Available Volunteers
    const volunteers = await prisma.volunteer.findMany({
      where: {
        isActive: true,
        isAvailable: true,
      },
      include: {
        skills: true,
        availability: { where: { isDeleted: false } },
        certifications: true,
        assignments: {
          where: { needId },
        },
      },
    });

    const eligibleVolunteers = volunteers.filter((vol) => {
      // Filter 1: Volunteers already assigned to the same need
      if (vol.assignments.length > 0) {
        return false;
      }

      // Filter 2: Volunteers with expired certifications
      const now = new Date();
      const hasExpiredCert = vol.certifications.some((cert) => {
        return cert.expiresAt && cert.expiresAt < now;
      });
      if (hasExpiredCert) {
        return false;
      }

      return true;
    });

    const results = eligibleVolunteers.map((vol) => {
      // A. Skill Match (40%)
      let skillScore = 0;
      if (need.skills.length === 0) {
        skillScore = 40;
      } else {
        let totalSkillPoints = 0;
        need.skills.forEach((reqSkill) => {
          const volSkill = vol.skills.find((vs) => vs.skillId === reqSkill.skillId);
          if (volSkill) {
            const volVal = SKILL_LEVEL_VALUES[volSkill.level] || 1;
            const reqVal = SKILL_LEVEL_VALUES[reqSkill.requiredLevel] || 1;
            if (volVal >= reqVal) {
              totalSkillPoints += 1.0;
            } else {
              totalSkillPoints += volVal / reqVal;
            }
          }
        });
        skillScore = (totalSkillPoints / need.skills.length) * 40;
      }

      // B. Availability Match (25%)
      let availabilityScore = 0;
      if (vol.availability.length === 0) {
        availabilityScore = 0;
      } else {
        // Calculate days of the week between startDate and endDate of the need
        const needDays = new Set<number>();
        const start = new Date(need.startDate);
        const end = new Date(need.endDate);
        
        // Loop through dates to get unique days of the week covered
        const tempDate = new Date(start);
        let safetyCounter = 0;
        while (tempDate <= end && safetyCounter < 7) {
          needDays.add(tempDate.getDay());
          tempDate.setDate(tempDate.getDate() + 1);
          safetyCounter++;
        }

        if (needDays.size === 0) {
          availabilityScore = 25;
        } else {
          let overlappingDays = 0;
          needDays.forEach((day) => {
            const hasSlot = vol.availability.some((slot) => slot.dayOfWeek === day);
            if (hasSlot) {
              overlappingDays++;
            }
          });
          availabilityScore = (overlappingDays / needDays.size) * 25;
        }
      }

      // C. Location Match (20%) - Exact string match only
      let locationScore = 0;
      if (need.location && vol.location) {
        if (need.location.trim().toLowerCase() === vol.location.trim().toLowerCase()) {
          locationScore = 20;
        }
      }

      // D. Experience Match (15%) - Proportional scaling up to 5 years default max
      let experienceScore = 0;
      if (vol.experienceYears) {
        experienceScore = Math.min(vol.experienceYears / 5, 1.0) * 15;
      }

      const totalScore = Math.round(skillScore + availabilityScore + locationScore + experienceScore);

      return {
        volunteerId: vol.id,
        score: totalScore,
      };
    });

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }
}
export const matchingService = new MatchingService();
