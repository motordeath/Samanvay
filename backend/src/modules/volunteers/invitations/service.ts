import { ConflictError, NotFoundError, ForbiddenError, ValidationError, ConcurrencyConflictError } from '../shared/errors';
import { invitationRepository } from './repository';
import { volunteerRepository } from '../volunteer/repository';
import { needRepository } from '../needs/repository';
import { AuditService } from '../audit/AuditService';
import { InvitationStatus } from '@prisma/client';
import { prisma } from '../../../prisma';

export class InvitationService {
  async lazyExpire(invitation: any) {
    if (!invitation) return invitation;

    if (
      invitation.status === 'PENDING' &&
      invitation.expiresAt &&
      invitation.expiresAt < new Date()
    ) {
      const updated = await invitationRepository.updateStatus(invitation.id, 'EXPIRED');
      
      await AuditService.log({
        action: 'INVITATION_EXPIRED',
        volunteerId: invitation.volunteerId,
        entityType: 'VOLUNTEER_INVITATION',
        entityId: invitation.id,
        metadata: { lazyExpired: true },
      });

      return updated;
    }

    return invitation;
  }

  async sendInvitation(
    data: { volunteerId: string; needId: string; expiresAt?: Date | null },
    userId: string,
    allowedOrganizationIds: string[]
  ) {
    // 1. Validate Volunteer
    const volunteer = await volunteerRepository.findById(data.volunteerId);
    if (!volunteer) {
      throw new NotFoundError('Volunteer profile not found');
    }

    // 2. Validate Need
    const need = await needRepository.findById(data.needId);
    if (!need) {
      throw new NotFoundError('Volunteer Need not found');
    }

    // 3. Validate Organization Ownership (Sender must belong to organization hosting the Need)
    if (!allowedOrganizationIds.includes(need.organizationId)) {
      throw new ForbiddenError('User is not authorized to send invitations for this organization');
    }

    // 4. Validate Composite Unique Constraint (No duplicates)
    const existing = await invitationRepository.findByVolunteerAndNeed(data.volunteerId, data.needId);
    if (existing) {
      const evaluated = await this.lazyExpire(existing);
      if (evaluated.status === 'PENDING' || evaluated.status === 'ACCEPTED') {
        throw new ConflictError('An active invitation already exists for this volunteer and need');
      }
    }

    const invitation = await invitationRepository.create({
      ...data,
      createdBy: userId,
    });

    await AuditService.log({
      action: 'INVITATION_SENT',
      volunteerId: data.volunteerId,
      entityType: 'VOLUNTEER_INVITATION',
      entityId: invitation.id,
      metadata: { needId: data.needId, createdBy: userId },
    });

    return invitation;
  }

  async getInvitationById(id: string) {
    const rawInvitation = await invitationRepository.findById(id);
    if (!rawInvitation) {
      throw new NotFoundError('Invitation not found');
    }
    const invitation = await this.lazyExpire(rawInvitation);
    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }
    return invitation;
  }

  async getAllInvitations() {
    const list = await invitationRepository.findAll();
    // Map list to lazy-expire each
    const results = [];
    for (const item of list) {
      const active = await this.lazyExpire(item);
      if (active) {
        results.push(active);
      }
    }
    return results;
  }

  async respondToInvitation(id: string, status: 'ACCEPTED' | 'DECLINED', userId: string) {
    const rawInvitation = await invitationRepository.findById(id);
    if (!rawInvitation) {
      throw new NotFoundError('Invitation not found');
    }

    // Lazy Expiry check first
    const invitation = await this.lazyExpire(rawInvitation);
    if (!invitation) {
      throw new NotFoundError('Invitation not found');
    }

    // Validate only PENDING can be responded to
    if (invitation.status !== 'PENDING') {
      throw new ValidationError(`Invitation cannot be responded to because it is ${invitation.status}`);
    }

    // Validate recipient (only the invited volunteer's userId can accept/decline)
    if (invitation.volunteer.userId !== userId) {
      throw new ForbiddenError('Only the invited volunteer may respond to this invitation');
    }

    const respondedAt = new Date();
    
    const updateResult = await prisma.volunteerInvitation.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: status as InvitationStatus, respondedAt }
    });

    if (updateResult.count === 0) {
      throw new ConcurrencyConflictError('Invitation is no longer pending or was concurrently modified');
    }

    const updated = await invitationRepository.findById(id);

    await AuditService.log({
      action: status === 'ACCEPTED' ? 'INVITATION_ACCEPTED' : 'INVITATION_DECLINED',
      volunteerId: invitation.volunteerId,
      entityType: 'VOLUNTEER_INVITATION',
      entityId: id,
      metadata: { userId },
    });

    return updated;
  }
}
export const invitationService = new InvitationService();

