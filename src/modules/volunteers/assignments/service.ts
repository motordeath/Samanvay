import { ConflictError, NotFoundError, StateTransitionError, ValidationError } from '../shared/errors';
import { assignmentRepository } from './repository';
import { invitationRepository } from '../invitations/repository';
import { invitationService } from '../invitations/service';
import { needRepository } from '../needs/repository';
import { AuditService } from '../audit/AuditService';
import { AssignmentStatus } from '@prisma/client';
import { prisma } from '../../../prisma';


export class AssignmentService {
  async createAssignment(data: { volunteerId: string; needId: string }, userId: string) {
    // 1. Fetch Need and count active assignments
    const need = await needRepository.findById(data.needId);
    if (!need) {
      throw new NotFoundError('Volunteer Need not found');
    }

    if (need.status === 'CLOSED') {
      throw new ValidationError('Cannot create assignments for a CLOSED need');
    }

    const currentCount = await assignmentRepository.countByNeed(data.needId);
    if (currentCount >= need.requiredCount) {
      throw new ConflictError('Need capacity has been reached');
    }

    // 2. Validate Duplication
    const existingAssignment = await assignmentRepository.findByVolunteerAndNeed(data.volunteerId, data.needId);
    if (existingAssignment) {
      throw new ConflictError('Volunteer is already assigned to this need');
    }

    // 3. Validate Invitation exists and is ACCEPTED (lazily expiring first)
    const invitation = await invitationRepository.findByVolunteerAndNeed(data.volunteerId, data.needId);
    if (!invitation) {
      throw new ConflictError('No invitation found for this volunteer and need');
    }

    const evaluatedInvitation = await invitationService.lazyExpire(invitation);
    if (evaluatedInvitation.status !== 'ACCEPTED') {
      throw new ConflictError(`Invitation is currently ${evaluatedInvitation.status}, not ACCEPTED`);
    }

    // 4. Create the Assignment
    const assignment = await assignmentRepository.create({
      ...data,
      createdBy: userId,
    });

    // 5. Status Auto-Sync (need -> FILLED if capacity reached)
    const newCount = currentCount + 1;
    if (newCount === need.requiredCount) {
      await needRepository.update(data.needId, { status: 'FILLED' });
      await AuditService.log({
        action: 'NEED_CLOSED', // It's closed to new assignments
        entityType: 'VOLUNTEER_NEED',
        entityId: data.needId,
        metadata: { status: 'FILLED' },
      });
    }

    await AuditService.log({
      action: 'ASSIGNMENT_CREATED',
      volunteerId: data.volunteerId,
      entityType: 'VOLUNTEER_ASSIGNMENT',
      entityId: assignment.id,
      metadata: { needId: data.needId, createdBy: userId },
    });

    return assignment;
  }

  async getAssignmentById(id: string) {
    const assignment = await assignmentRepository.findById(id);
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }
    return assignment;
  }

  async getAllAssignments() {
    return await assignmentRepository.findAll();
  }

  async updateAssignmentStatus(id: string, nextStatus: AssignmentStatus) {
    const assignment = await this.getAssignmentById(id);
    const currentStatus = assignment.status;

    // State Machine Guards
    if (currentStatus === nextStatus) {
      return assignment;
    }

    let isValid = false;
    if (currentStatus === 'ASSIGNED' && nextStatus === 'CHECKED_IN') {
      isValid = true;
    } else if (currentStatus === 'CHECKED_IN' && nextStatus === 'CHECKED_OUT') {
      isValid = true;
    } else if (currentStatus === 'CHECKED_OUT' && nextStatus === 'COMPLETED') {
      isValid = true;
    }

    if (!isValid) {
      throw new StateTransitionError(`Invalid assignment status transition: ${currentStatus} -> ${nextStatus}`);
    }

    const completedAt = nextStatus === 'COMPLETED' ? new Date() : null;
    const updated = await assignmentRepository.updateStatus(id, nextStatus, completedAt);

    await AuditService.log({
      action: nextStatus === 'COMPLETED' ? 'COMPLETED' : 'ASSIGNMENT_STATUS_CHANGED',
      volunteerId: assignment.volunteerId,
      entityType: 'VOLUNTEER_ASSIGNMENT',
      entityId: id,
      metadata: { from: currentStatus, to: nextStatus },
    });

    return updated;
  }

  async removeAssignment(id: string) {
    const assignment = await this.getAssignmentById(id);
    
    // Physical delete (onDelete: Restrict ensures DB safeguards are respected)
    await prisma.volunteerAssignment.delete({
      where: { id },
    });

    // Sync Need status back to OPEN if count falls below requiredCount
    const need = await needRepository.findById(assignment.needId);
    if (need && need.status === 'FILLED') {
      const activeCount = await assignmentRepository.countByNeed(assignment.needId);
      if (activeCount < need.requiredCount) {
        await needRepository.update(assignment.needId, { status: 'OPEN' });
        await AuditService.log({
          action: 'ASSIGNMENT_STATUS_CHANGED',
          volunteerId: assignment.volunteerId,
          entityType: 'VOLUNTEER_NEED',
          entityId: assignment.needId,
          metadata: { message: 'Need reverted to OPEN due to assignment removal' },
        });
      }
    }

    return assignment;
  }
}
export const assignmentService = new AssignmentService();
