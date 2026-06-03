# HISTORICAL INTEGRITY AUDIT

## 1. Overview
The platform must NEVER destroy operational truth. Cancellations, invalidations, and suspensions must respect historical reality. If a volunteer participated, that record is sacred.

## 2. Hardened Protections
- **Attendance Preservation:** The assignment cancellation propagation explicitly ignores `CHECKED_IN`, `CHECKED_OUT`, and `COMPLETED` assignments. If a membership is deactivated, the volunteer's past contributions remain intact on the organization's ledgers.
- **Audit Immutability:** Core operations emit traces to `AuditLog` and `VolunteerAudit`. By design, these logs are append-only.

## 3. Detected Vulnerabilities & Risks

### Destructive Deletes
- **Finding:** Needs review. Does `deleteEvent` or `deleteVolunteerNeed` use Prisma's `cascade` delete?
- **Risk:** If a controller exposes a "Delete Event" route, and Prisma cascades that delete down to `VolunteerNeed` -> `VolunteerAssignment` -> `VolunteerAttendance`, the operational truth of volunteers who worked that event is wiped from existence.
- **Recommendation:** Ban physical deletions for operational entities. Use `deletedAt` soft-deletes or `CANCELLED`/`ARCHIVED` terminal statuses.

### Historical State Mutation
- **Finding:** Re-activation logic. If a `VolunteerAssignment` is `CANCELLED`, can a coordinator manually edit it back to `ASSIGNED`?
- **Risk:** If a coordinator bypasses the governance constraint (e.g. they edit a cancelled assignment for a volunteer whose membership is still `INACTIVE`), the orchestration branches.
- **Recommendation:** Terminal states (`CANCELLED`, `COMPLETED`) should fundamentally lock the entity row from further mutations in the service layer.
