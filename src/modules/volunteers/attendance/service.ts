import { ConflictError, NotFoundError, StateTransitionError, ValidationError } from '../shared/errors';
import { attendanceRepository } from './repository';
import { assignmentService } from '../assignments/service';
import { AuditService } from '../audit/AuditService';

export class AttendanceService {
  async checkIn(data: {
    assignmentId: string;
    verifiedBy?: string | null;
    verificationMethod?: string | null;
  }) {
    // 1. Validate one-to-one constraint (ensure no duplicate attendance record)
    const existing = await attendanceRepository.findByAssignmentId(data.assignmentId);
    if (existing) {
      throw new ConflictError('Attendance record already exists for this assignment');
    }

    // 2. Fetch assignment and validate status
    const assignment = await assignmentService.getAssignmentById(data.assignmentId);
    if (assignment.status !== 'ASSIGNED') {
      throw new StateTransitionError(`Cannot check in. Assignment status is ${assignment.status}, must be ASSIGNED.`);
    }


    const checkInTime = new Date();
    
    // Create attendance record
    const attendance = await attendanceRepository.createCheckIn({
      assignmentId: data.assignmentId,
      checkInTime,
      verifiedBy: data.verifiedBy,
      verificationMethod: data.verificationMethod,
    });

    // Transition Assignment status to CHECKED_IN
    await assignmentService.updateAssignmentStatus(data.assignmentId, 'CHECKED_IN');

    await AuditService.log({
      action: 'CHECK_IN',
      volunteerId: assignment.volunteerId,
      entityType: 'VOLUNTEER_ATTENDANCE',
      entityId: attendance.id,
      metadata: { assignmentId: data.assignmentId, checkInTime },
    });

    return attendance;
  }

  async checkOut(data: {
    assignmentId: string;
    verifiedBy?: string | null;
    verificationMethod?: string | null;
  }) {
    // 1. Fetch assignment and validate status
    const assignment = await assignmentService.getAssignmentById(data.assignmentId);
    if (assignment.status !== 'CHECKED_IN') {
      throw new StateTransitionError(`Cannot check out. Assignment status is ${assignment.status}, must be CHECKED_IN.`);
    }

    // 2. Retrieve existing attendance record
    const existing = await attendanceRepository.findByAssignmentId(data.assignmentId);
    if (!existing) {
      throw new NotFoundError('Attendance record not found for check-in');
    }

    const checkOutTime = new Date();

    // Update checkout
    const attendance = await attendanceRepository.updateCheckOut(data.assignmentId, {
      checkOutTime,
      verifiedBy: data.verifiedBy,
      verificationMethod: data.verificationMethod,
    });

    // Transition Assignment status to CHECKED_OUT
    await assignmentService.updateAssignmentStatus(data.assignmentId, 'CHECKED_OUT');

    await AuditService.log({
      action: 'CHECK_OUT',
      volunteerId: assignment.volunteerId,
      entityType: 'VOLUNTEER_ATTENDANCE',
      entityId: attendance.id,
      metadata: { assignmentId: data.assignmentId, checkOutTime },
    });

    return attendance;
  }

  async getAttendanceByAssignment(assignmentId: string) {
    const record = await attendanceRepository.findByAssignmentId(assignmentId);
    if (!record) {
      throw new NotFoundError('Attendance record not found');
    }
    return record;
  }
}
export const attendanceService = new AttendanceService();
