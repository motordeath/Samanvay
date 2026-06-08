import{ prisma }  from "../prisma";

type EventRequirement = {
  requiredSkill: string;
  location: string;
  requiredCount: number;
};

export async function matchVolunteers(
  event: EventRequirement
) {
  const volunteers = await prisma.volunteer.findMany({
    where: {
     // skill: event.requiredSkill,
     isAvailable : true,
    },
  });

  const rankedVolunteers = volunteers
    .map((volunteer) => {
      let score = 0;

      // same location priority
      if (volunteer.location === event.location) {
        score += 20;
      }

      // experience score
      score += volunteer.experienceYears * 10;

      return {
        ...volunteer,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  return rankedVolunteers.slice(
    0,
    event.requiredCount
  );
}
