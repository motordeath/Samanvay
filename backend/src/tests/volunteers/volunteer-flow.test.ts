import request from 'supertest';
import app from '../../app';
import { prisma } from '../../prisma';
import { randomUUID } from 'crypto';

async function clearVolunteerTables() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "VolunteerAudit",
      "VolunteerAttendance",
      "VolunteerAssignment",
      "VolunteerInvitation",
      "VolunteerNeedSkill",
      "VolunteerNeed",
      "VolunteerAvailability",
      "VolunteerCertification",
      "Certification",
      "VolunteerSkill",
      "Skill",
      "Volunteer",
      "User",
      "Organization"
    RESTART IDENTITY CASCADE
  `);
}

describe('Volunteer Coordination Engine E2E Flow', () => {
  let volunteerId: string;
  let userId: string;
  let needId: string;
  let organizationId: string;
  let skillId: string;
  let certId: string;

  const mockOrgId = randomUUID();
  const mockUserId = randomUUID();

  beforeEach(async () => {
    await clearVolunteerTables();

    // Seed basic User and Organization in database
    const org = await prisma.organization.create({
      data: {
        id: mockOrgId,
        name: 'Test Aid NGO',
        type: 'NGO',
        sector: 'Disaster Relief',
      },
    });
    organizationId = org.id;

    const user = await prisma.user.create({
      data: {
        id: mockUserId,
        name: 'Test Volunteer User',
        email: `volunteer-${randomUUID()}@example.com`,
        passwordHash: 'hashed_password',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await clearVolunteerTables();
  });

  describe('Volunteer Profile CRUD & Soft Delete', () => {
    it('creates, retrieves, updates, and soft deletes a volunteer profile', async () => {
      // 1. Create Profile
      const res = await request(app)
        .post('/api/volunteers')
        .send({
          userId,
          bio: 'Experienced first responder',
          location: 'Seattle',
          experienceYears: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      volunteerId = res.body.data.id;

      // 2. Conflict Check (Duplicate profile)
      const duplicateRes = await request(app)
        .post('/api/volunteers')
        .send({
          userId,
          bio: 'Duplicate profile',
        });
      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);

      // 3. Get profile
      const getRes = await request(app).get(`/api/volunteers/${volunteerId}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.bio).toBe('Experienced first responder');

      // 4. Update profile
      const updateRes = await request(app)
        .patch(`/api/volunteers/${volunteerId}`)
        .send({
          bio: 'Updated bio info',
          location: 'Tacoma',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.location).toBe('Tacoma');

      // 5. Soft Delete profile (deactivation)
      const deleteRes = await request(app).delete(`/api/volunteers/${volunteerId}`);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.isActive).toBe(false);

      // 6. Verify audit logging
      const audits = await prisma.volunteerAudit.findMany({
        where: { volunteerId },
      });
      const actions = audits.map((a) => a.action);
      expect(actions).toContain('VOLUNTEER_CREATED');
      expect(actions).toContain('VOLUNTEER_DEACTIVATED');
    });
  });

  describe('Skills & Certifications Associations', () => {
    beforeEach(async () => {
      // Setup an active volunteer profile
      const res = await request(app)
        .post('/api/volunteers')
        .send({
          userId,
          bio: 'Ready to help',
          location: 'Seattle',
          experienceYears: 3,
        });
      volunteerId = res.body.data.id;
    });

    it('creates global skills/certifications and links them to volunteer', async () => {
      // 1. Create global skill
      const skillRes = await request(app)
        .post('/api/skills')
        .send({ name: 'First Aid Rescue' });
      expect(skillRes.status).toBe(201);
      skillId = skillRes.body.data.id;

      // 2. Associate to volunteer
      const assocSkillRes = await request(app)
        .post(`/api/skills/volunteers/${volunteerId}`)
        .send({
          skillId,
          level: 'ADVANCED',
        });
      expect(assocSkillRes.status).toBe(200);
      expect(assocSkillRes.body.data.level).toBe('ADVANCED');

      // 3. Create global certification
      const certRes = await request(app)
        .post('/api/certifications')
        .send({ name: 'CPR Certified' });
      expect(certRes.status).toBe(201);
      certId = certRes.body.data.id;

      // 4. Associate certification to volunteer
      const assocCertRes = await request(app)
        .post(`/api/certifications/volunteers/${volunteerId}`)
        .send({
          certificationId: certId,
          expiresAt: new Date(Date.now() + 1000000), // active
        });
      expect(assocCertRes.status).toBe(200);
    });
  });

  describe('Volunteer Availability Constraints', () => {
    beforeEach(async () => {
      const res = await request(app)
        .post('/api/volunteers')
        .send({
          userId,
          location: 'Seattle',
        });
      volunteerId = res.body.data.id;
    });

    it('validates active day limits and time range orders', async () => {
      // 1. Invalid dayOfWeek (day is 7)
      const resDay = await request(app)
        .post('/api/availability')
        .send({
          volunteerId,
          dayOfWeek: 7,
          startTime: '09:00',
          endTime: '17:00',
        });
      expect(resDay.status).toBe(400);

      // 2. Invalid time range (start >= end)
      const resTime = await request(app)
        .post('/api/availability')
        .send({
          volunteerId,
          dayOfWeek: 1,
          startTime: '17:00',
          endTime: '09:00',
        });
      expect(resTime.status).toBe(400);

      // 3. Valid availability creation
      const resValid = await request(app)
        .post('/api/availability')
        .send({
          volunteerId,
          dayOfWeek: 2,
          startTime: '09:00',
          endTime: '17:00',
        });
      expect(resValid.status).toBe(201);
      const availId = resValid.body.data.id;

      // 4. Update validity test
      const resUpdateInvalid = await request(app)
        .patch(`/api/availability/${availId}`)
        .send({ startTime: '16:00', endTime: '15:00' });
      expect(resUpdateInvalid.status).toBe(400);

      // 5. Soft delete availability slot
      const resDel = await request(app).delete(`/api/availability/${availId}`);
      expect(resDel.status).toBe(200);
      expect(resDel.body.data.isDeleted).toBe(true);
    });
  });

  describe('Volunteer Needs & Ownership Verification', () => {
    it('verifies need creation validations and context-based ownership constraints', async () => {
      // 1. Missing header ownership context (throws ForbiddenError -> 403)
      const resUnauth = await request(app)
        .post('/api/volunteer-needs')
        .set('x-user-id', userId)
        .set('x-organization-ids', 'another-org-id')
        .send({
          organizationId,
          title: 'Shelter Coordinator',
          requiredCount: 2,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        });
      expect(resUnauth.status).toBe(403);

      // 2. Authorized need creation
      const resAuth = await request(app)
        .post('/api/volunteer-needs')
        .set('x-user-id', userId)
        .set('x-organization-ids', organizationId)
        .send({
          organizationId,
          title: 'Shelter Coordinator',
          requiredCount: 1,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
        });
      expect(resAuth.status).toBe(201);
      needId = resAuth.body.data.id;

      // 3. Soft Delete Need (status closes instead of physical delete)
      const resClose = await request(app)
        .delete(`/api/volunteer-needs/${needId}`)
        .set('x-user-id', userId)
        .set('x-organization-ids', organizationId);
      expect(resClose.status).toBe(200);
      expect(resClose.body.data.status).toBe('CLOSED');
    });
  });

  describe('Complete Workflows: Matching, Expirations, Capacity, & State Machine Guards', () => {
    let invitationId: string;
    let assignmentId: string;

    beforeEach(async () => {
      // Setup Volunteer Profile
      const volRes = await request(app)
        .post('/api/volunteers')
        .send({
          userId,
          location: 'Seattle',
          experienceYears: 5,
        });
      volunteerId = volRes.body.data.id;

      // Setup global skill
      const skillRes = await request(app).post('/api/skills').send({ name: 'Emergency Medical' });
      skillId = skillRes.body.data.id;

      // Link skill to volunteer
      await request(app)
        .post(`/api/skills/volunteers/${volunteerId}`)
        .send({ skillId, level: 'EXPERT' });

      // Setup Need
      const needRes = await request(app)
        .post('/api/volunteer-needs')
        .set('x-user-id', mockUserId)
        .set('x-organization-ids', organizationId)
        .send({
          organizationId,
          title: 'Disaster Relief Nurse',
          requiredCount: 1,
          location: 'Seattle',
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          skills: [{ skillId, requiredLevel: 'EXPERT' }],
        });
      needId = needRes.body.data.id;
    });

    it('runs matching calculations with correct scoring and filters', async () => {
      const matchRes = await request(app).post(`/api/matching/volunteer-needs/${needId}`);
      expect(matchRes.status).toBe(200);
      expect(matchRes.body.data).toHaveLength(1);
      expect(matchRes.body.data[0].volunteerId).toBe(volunteerId);
      // Perfect match should score high
      expect(matchRes.body.data[0].score).toBeGreaterThan(60);

      // Verify ineligible volunteers are filtered out
      // Deactivate profile
      await prisma.volunteer.update({
        where: { id: volunteerId },
        data: { isActive: false },
      });

      const matchResFiltered = await request(app).post(`/api/matching/volunteer-needs/${needId}`);
      expect(matchResFiltered.status).toBe(200);
      expect(matchResFiltered.body.data).toHaveLength(0);
    });

    it('processes lazy invitation expiry and protects accepting expired invites', async () => {
      // 1. Send invitation with past expiresAt (immediate expiry)
      const inviteRes = await request(app)
        .post('/api/invitations')
        .set('x-user-id', mockUserId)
        .set('x-organization-ids', organizationId)
        .send({
          volunteerId,
          needId,
          expiresAt: new Date(Date.now() - 100000), // 100s in the past
        });
      expect(inviteRes.status).toBe(201);
      invitationId = inviteRes.body.data.id;

      // 2. Try to respond ACCEPT (lazy expiry catches this -> updates status to EXPIRED -> throws ValidationError)
      const respondRes = await request(app)
        .patch(`/api/invitations/${invitationId}/respond`)
        .set('x-user-id', mockUserId)
        .send({ status: 'ACCEPTED' });

      expect(respondRes.status).toBe(400); // Validation error: cannot respond to EXPIRED
      expect(respondRes.body.success).toBe(false);
      
      const dbInvite = await prisma.volunteerInvitation.findUnique({
        where: { id: invitationId },
      });
      expect(dbInvite?.status).toBe('EXPIRED');
    });

    it('enforces state machine guards, capacity overflow, 1-to-1 attendance, and sync', async () => {
      // 1. Create a valid, active invitation
      const inviteRes = await request(app)
        .post('/api/invitations')
        .set('x-user-id', mockUserId)
        .set('x-organization-ids', organizationId)
        .send({
          volunteerId,
          needId,
          expiresAt: new Date(Date.now() + 1000000), // active
        });
      invitationId = inviteRes.body.data.id;

      // 2. Accept invitation (using the volunteer's resolved context x-user-id)
      const respondRes = await request(app)
        .patch(`/api/invitations/${invitationId}/respond`)
        .set('x-user-id', mockUserId) // volunteer userId matching mockUserId
        .send({ status: 'ACCEPTED' });
      expect(respondRes.status).toBe(200);

      // 3. Create Assignment
      const assignRes = await request(app)
        .post('/api/assignments')
        .set('x-user-id', mockUserId)
        .send({ volunteerId, needId });
      expect(assignRes.status).toBe(201);
      assignmentId = assignRes.body.data.id;

      // 4. Auto status sync (Need has requiredCount=1, so creating 1 active assignment marks it FILLED)
      const filledNeed = await prisma.volunteerNeed.findUnique({ where: { id: needId } });
      expect(filledNeed?.status).toBe('FILLED');

      // 5. Test Capacity Guard Overflow
      // Setup secondary volunteer profile
      const volRes2 = await prisma.volunteer.create({
        data: {
          userId: randomUUID(),
          bio: 'Second volunteer',
        },
      });
      // Setup accepted invitation
      const inviteRes2 = await prisma.volunteerInvitation.create({
        data: {
          volunteerId: volRes2.id,
          needId,
          status: 'ACCEPTED',
          createdBy: mockUserId,
        },
      });

      // Try creating 2nd assignment (should fail with 409 Conflict because capacity is reached)
      const overflowRes = await request(app)
        .post('/api/assignments')
        .set('x-user-id', mockUserId)
        .send({ volunteerId: volRes2.id, needId });
      expect(overflowRes.status).toBe(409);

      // 6. Test State Machine Transition Guards
      // Try invalid jump: ASSIGNED -> COMPLETED directly (should fail with 422 StateTransitionError)
      const invalidJump = await request(app)
        .patch(`/api/assignments/${assignmentId}/status`)
        .send({ status: 'COMPLETED' });
      expect(invalidJump.status).toBe(422);

      // Try invalid attendance check-out before check-in
      const invalidOut = await request(app)
        .post('/api/attendance/check-out')
        .send({ assignmentId, verificationMethod: 'MANUAL' });
      expect(invalidOut.status).toBe(422);

      // 7. Check In (transitions ASSIGNED -> CHECKED_IN, creates Attendance record)
      const checkInRes = await request(app)
        .post('/api/attendance/check-in')
        .send({ assignmentId, verificationMethod: 'QR', verifiedBy: mockUserId });
      expect(checkInRes.status).toBe(200);

      // Check one-to-one constraint: try another check-in (should fail with 409 Conflict)
      const duplicateCheckIn = await request(app)
        .post('/api/attendance/check-in')
        .send({ assignmentId, verificationMethod: 'QR' });
      expect(duplicateCheckIn.status).toBe(409);

      // 8. Check Out (transitions CHECKED_IN -> CHECKED_OUT)
      const checkOutRes = await request(app)
        .post('/api/attendance/check-out')
        .send({ assignmentId, verificationMethod: 'MANUAL' });
      expect(checkOutRes.status).toBe(200);

      // 9. Complete Assignment (transitions CHECKED_OUT -> COMPLETED)
      const completeRes = await request(app)
        .patch(`/api/assignments/${assignmentId}/status`)
        .send({ status: 'COMPLETED' });
      expect(completeRes.status).toBe(200);

      // 10. De-allocation / Removal sync (Reverts FILLED need to OPEN if active assignments count drops)
      await prisma.volunteerAttendance.delete({ where: { assignmentId } });
      const deleteAssignRes = await request(app).delete(`/api/assignments/${assignmentId}`);
      expect(deleteAssignRes.status).toBe(200);

      const revertedNeed = await prisma.volunteerNeed.findUnique({ where: { id: needId } });
      expect(revertedNeed?.status).toBe('OPEN');
    });
  });
});
