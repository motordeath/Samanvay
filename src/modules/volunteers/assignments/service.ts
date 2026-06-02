import { ConflictError, NotFoundError, StateTransitionError, ValidationError, ConcurrencyConflictError } from '../shared/errors';
import { assignmentRepository } from './repository';
import { invitationRepository } from '../invitations/repository';
import { invitationService } from '../invitations/service';
import { needRepository } from '../needs/repository';
import { AuditService } from '../audit/AuditService';
import { AssignmentStatus } from '@prisma/client';
import { prisma } from '../../../prisma';


export class AssignmentService {
  async createAssignment(data: { volunteerId: string; needId: string }, userId: string) {
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

    const existingAssignment = await assignmentRepository.findByVolunteerAndNeed(data.volunteerId, data.needId);
    if (existingAssignment) {
      throw new ConflictError('Volunteer is already assigned to this need');
    }

    const invitation = await invitationRepository.findByVolunteerAndNeed(data.volunteerId, data.needId);
    if (!invitation) {
      throw new ConflictError('No invitation found for this volunteer and need');
    }

    const evaluatedInvitation = await invitationService.lazyExpire(invitation);
    if (evaluatedInvitation.status !== 'ACCEPTED') {
      throw new ConflictError(`Invitation is currently ${evaluatedInvitation.status}, not ACCEPTED`);
    }

    return await prisma.$transaction(async (tx) => {
      const assignment = await tx.volunteerAssignment.create({
        data: {
          volunteerId: data.volunteerId,
          needId: data.needId,
          status: 'ASSIGNED',
          createdBy: userId,
        },
        include: { volunteer: true, need: true }
      });

      const newCount = currentCount + 1;
      if (newCount === need.requiredCount) {
        const updateResult = await tx.volunteerNeed.updateMany({
          where: { id: data.needId, status: 'OPEN' },
          data: { status: 'FILLED' }
        });
        
        if (updateResult.count === 0) {
          throw new ConcurrencyConflictError('Need capacity has been reached or need is no longer open');
        }

        await AuditService.log({
          action: 'NEED_CLOSED',
          entityType: 'VOLUNTEER_NEED',
          entityId: data.needId,
          metadata: { status: 'FILLED' },
          tx
        });
      }

      await AuditService.log({
        action: 'ASSIGNMENT_CREATED',
        volunteerId: data.volunteerId,
        entityType: 'VOLUNTEER_ASSIGNMENT',
        entityId: assignment.id,
        metadata: { needId: data.needId, createdBy: userId },
        tx
      });

      return assignment;
    });
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
    } else if (currentStatus === 'ASSIGNED' && nextStatus === 'CANCELLED') {
      isValid = true;
    }

    if (!isValid) {
      throw new StateTransitionError(`Invalid assignment status transition: ${currentStatus} -> ${nextStatus}`);
    }

    return await prisma.$transaction(async (tx) => {
      const completedAt = nextStatus === 'COMPLETED' ? new Date() : null;
      const updated = await tx.volunteerAssignment.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(completedAt !== null && { completedAt }),
        },
        include: { volunteer: true, need: true }
      });

      let actionName = 'ASSIGNMENT_STATUS_CHANGED';
      if (nextStatus === 'COMPLETED') {
        actionName = 'COMPLETED';
      } else if (nextStatus === 'CANCELLED') {
        actionName = 'ASSIGNMENT_CANCELLED';
      }

      await AuditService.log({
        action: actionName,
        volunteerId: assignment.volunteerId,
        entityType: 'VOLUNTEER_ASSIGNMENT',
        entityId: id,
        metadata: { from: currentStatus, to: nextStatus },
        tx
      });

      return updated;
    });
  }

  async removeAssignment(id: string) {
    const assignment = await this.getAssignmentById(id);
    
    return await prisma.$transaction(async (tx) => {
      await tx.volunteerAssignment.delete({
        where: { id },
      });

      const need = await tx.volunteerNeed.findUnique({ where: { id: assignment.needId } });
      if (need && need.status === 'FILLED') {
        const activeCount = await tx.volunteerAssignment.count({ where: { needId: assignment.needId } });
        if (activeCount < need.requiredCount) {
          await tx.volunteerNeed.update({ where: { id: assignment.needId }, data: { status: 'OPEN' } });
          await AuditService.log({
            action: 'ASSIGNMENT_STATUS_CHANGED',
            volunteerId: assignment.volunteerId,
            entityType: 'VOLUNTEER_NEED',
            entityId: assignment.needId,
            metadata: { message: 'Need reverted to OPEN due to assignment removal' },
            tx
          });
        }
      }

      return assignment;
    });
  }
}
export const assignmentService = new AssignmentService();
