# PROPAGATION CHAIN AUDIT

## 1. Event CANCELLED → OPEN needs CLOSED
**Trigger:** `updateEvent` in `event.service.ts` where status becomes `CANCELLED`.
**Action:** Selects all `VolunteerNeed` records linked to `eventId` with status `OPEN` and updates them to `CLOSED`.

| Validation | Status | Assessment |
| :--- | :--- | :--- |
| **Transactional Safety** | ✅ YES | Uses `prisma.$transaction`. Updates event and needs atomically. |
| **Organization Scoping** | ✅ YES | Safely contained because `VolunteerNeed` is inherently hard-linked to the `eventId`. |
| **Historical Preservation** | ✅ YES | Does not delete needs. Existing `FILLED` or `CLOSED` needs remain unaffected. |
| **Partial Failure Resistance** | ✅ YES | Atomic bound guarantees event cancellation rolls back if needs fail to update. |
| **Missing Protections** | ⚠️ RISK | Resource Needs are NOT currently propagated. If an event is cancelled, `ResourceNeed` records remain unaffected, causing phantom material demand. |

## 2. Membership INACTIVE → ASSIGNED assignments CANCELLED
**Trigger:** `updateMembershipStatus` in `membership.service.ts` where status becomes `INACTIVE`.
**Action:** Finds volunteer profile. Queries `VolunteerAssignment` where `status == ASSIGNED` AND `need.organizationId == membership.organizationId`. Updates to `CANCELLED`. Audits to `VolunteerAudit`.

| Validation | Status | Assessment |
| :--- | :--- | :--- |
| **Transactional Safety** | ✅ YES | Encapsulated entirely in `prisma.$transaction(async (tx) => ...)`. |
| **Organization Scoping** | ✅ YES | Crucial `need: { organizationId: membership.organizationId }` filter prevents global cross-org profile corruption. |
| **Historical Preservation** | ✅ YES | Safely skips `CHECKED_IN`, `CHECKED_OUT`, `COMPLETED` assignments. Modifies only pre-operation assignments. |
| **Partial Failure Resistance** | ✅ YES | Bound to the same `tx` context as the membership update and audit log creation. |
| **Cross-Engine Corruption Risk**| ⚠️ RISK | If this transaction takes too long for a user with thousands of assignments, it might block the DB. Bulk `updateMany` could be faster, but per-assignment audit loops require iterative execution. |

## 3. Orphan Propagation Chains (Missing Rules)
The audit identified several flows that *should* propagate but currently do not:
1. **Organization INACTIVE → Memberships INACTIVE:** If an org is suspended, its memberships remain active. (Though authorization checks org status dynamically, the lifecycle states drift).
2. **Event CANCELLED → Pending Invitations EXPIRED:** Pending volunteer invitations remain active for cancelled events.
3. **Event CANCELLED → ResourceNeeds CLOSED:** Phantom logistics demand.
4. **Volunteer Profile Inactivated → Assignments CANCELLED:** If a user globally deactivates their volunteer profile, their assignments are not safely cancelled across organizations.
