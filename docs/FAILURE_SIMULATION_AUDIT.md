# FAILURE SIMULATION AUDIT

## 1. Governance Failures

### Scenario: Membership deactivation during check-in
- **Failure:** A volunteer is actively clicking "Check In" at the exact moment their membership is transitioned to `INACTIVE`.
- **Engines Affected:** Governance Engine, Volunteer Engine.
- **Simulation:** 
  1. Transaction A starts checking in `Assignment` (checks governance, is valid).
  2. Transaction B turns `Membership` to `INACTIVE`, propagating `CANCELLED` to `Assignment`.
  3. Transaction A completes, updating `Assignment` to `CHECKED_IN`.
- **Risk:** Race condition resulting in an `INACTIVE` member having a `CHECKED_IN` assignment.
- **Existing Protections:** Depends on Prisma's internal locking and isolation level.
- **Weakness:** Without `SELECT ... FOR UPDATE` row locks, Transaction A might succeed.

## 2. Lifecycle Failures

### Scenario: Orphan Assignments
- **Failure:** An Event coordinator cancels an Event. The Needs transition to `CLOSED`. But what about the `ASSIGNED` assignments linked to those needs?
- **Engines Affected:** Event Engine, Volunteer Engine.
- **Simulation:** 
  1. Event CANCELLED.
  2. Need CLOSED.
  3. Assignments remain `ASSIGNED`.
- **Risk:** Volunteers show up for a cancelled event.
- **Unresolved Weakness:** Event cancellation propagation currently STOPS at `VolunteerNeed`. It does not propagate down to `VolunteerAssignment`.

## 3. Concurrency Failures

### Scenario: Simultaneous Transfer Acceptance
- **Failure:** Two admins from the target organization click "Accept Transfer" for the same material simultaneously.
- **Engines Affected:** Resource Engine.
- **Simulation:** 
  1. Admin A fetches `Transfer` (status `PENDING`).
  2. Admin B fetches `Transfer` (status `PENDING`).
  3. Admin A updates to `COMPLETED`, adds inventory.
  4. Admin B updates to `COMPLETED`, adds inventory.
- **Risk:** Double-counting inventory.
- **Unresolved Weakness:** A strict `where: { id: transferId, status: 'PENDING' }` clause is required on the update step to act as an optimistic lock.

## 4. Historical Integrity Failures

### Scenario: Cancellation after attendance
- **Failure:** Event coordinator attempts to cancel an assignment after a user has checked out.
- **Engines Affected:** Volunteer Engine.
- **Risk:** Deleting operational proof.
- **Existing Protections:** HARDENED. `assignmentService` explicitly throws a `StateTransitionError` if attempting to cancel a `CHECKED_IN`, `CHECKED_OUT`, or `COMPLETED` assignment.
