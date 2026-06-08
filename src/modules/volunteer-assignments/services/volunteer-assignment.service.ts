import { VolunteerAssignmentRepository }
from "../repositories/volunteer-assignment.repository";

export class VolunteerAssignmentService {
  private assignmentRepository =
    new VolunteerAssignmentRepository();

  async createAssignment(
    needId: string,
    volunteerId: string
  ) {
    return this.assignmentRepository.create(
      needId,
      volunteerId
    );
  }

  async getVolunteerAssignments(
    volunteerId: string
  ) {
    return this.assignmentRepository.getByVolunteer(
      volunteerId
    );
  }

  async completeAssignment(
    id: string
  ) {
    return this.assignmentRepository.updateStatus(
      id,
      "COMPLETED"
    );
  }

  async cancelAssignment(
    id: string
  ) {
    return this.assignmentRepository.updateStatus(
      id,
      "CANCELLED"
    );
  }
}