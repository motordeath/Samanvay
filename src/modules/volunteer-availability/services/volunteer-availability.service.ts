import { VolunteerAvailabilityRepository }
from "../repositories/volunteer-availability.repository";

export class VolunteerAvailabilityService {
  private repository =
    new VolunteerAvailabilityRepository();

  async create(data: any) {
    return this.repository.create(data);
  }

  async getVolunteerAvailability(
    volunteerId: string
  ) {
    return this.repository.findByVolunteer(
      volunteerId
    );
  }

  async delete(id: string) {
    return this.repository.delete(id);
  }
}