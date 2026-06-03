# NEXT PHASE COORDINATION REPORT

## 1. Current Architecture State
Samanvay operates as a distributed operational orchestration system. It heavily relies on synchronous transactional propagation to maintain state across Governance, Event, Resource, and Volunteer engines.

- **Stable Foundations (Do NOT Refactor):**
  - Membership `ACTIVE/INACTIVE` scoping.
  - Organization boundaries (`ACTIVE/SUSPENDED`).
  - Assignment terminal protections (cannot cancel post-check-in).
  - Transactional wrapper patterns (`prisma.$transaction`).

- **High-Risk Areas:**
  - Missing cascading propagations (Event -> Assignments, Org -> Memberships).
  - Inline loop-based updates causing potential DB locks at scale.
  - Audit logging outside transaction boundaries.

## 2. Recommended Next Development Phases (Strict Order)

### Phase A: Complete the Event Cancellation Propagation Chain
- **Goal:** When an Event is `CANCELLED`, not only do `OPEN` needs become `CLOSED`, but all `ASSIGNED` Volunteer Assignments for those needs must become `CANCELLED`.
- **Reason:** Prevents ghost staffing for aborted events.

### Phase B: Resource Logistics Propagation
- **Goal:** Propagate `Event CANCELLED` to `ResourceNeed CANCELLED` and handle any `PENDING` Resource Offers.
- **Reason:** Prevents phantom material demand from draining organizational inventory.

### Phase C: Granular Governance Hardening
- **Goal:** Refactor Authorization helpers to accept specific roles (e.g., `['OWNER', 'ADMIN']`), preventing `VOLUNTEER` accounts from triggering high-stakes logistics operations.
- **Reason:** Currently, authorization helpers only verify active membership, not the functional role level.

### Phase D: Concurrency Hardening (Optimistic Locking)
- **Goal:** Implement strict `where: { status: 'PENDING' }` style optimistic locking across all `VolunteerAssignment`, `Transfer`, and `VolunteerNeed` acceptance routes.
- **Reason:** Blocks race conditions from double-counting inventory or over-staffing a need.

### Phase E: Audit Transaction Binding
- **Goal:** Bind all `AuditService` calls to the local Prisma transaction client (`tx`) rather than the global `prisma` client.
- **Reason:** Guarantees complete orchestration traceability even during unexpected partial failures or server restarts.

## 3. AI Coordination Context
*For future LLMs and AI Agents interacting with this codebase:*

- **Topological Rule:** Do NOT implement features in silos. If you change a lifecycle state (e.g. `Event.status`), you MUST recursively consider downstream consequences (Needs, Assignments, Offers).
- **Execution Rule:** All multi-engine mutations MUST occur within `prisma.$transaction(async tx => {})`. Use the `tx` variable explicitly.
- **Historical Rule:** You are forbidden from writing Prisma queries that delete `VolunteerAssignment`, `VolunteerAttendance`, `VolunteerAudit`, or `AuditLog` rows. Use terminal states (`CANCELLED`, `COMPLETED`).
- **Governance Rule:** Rely on `authorization.service.ts` for route protection. Assume all internal service endpoints must double-check boundaries (e.g. matching `organizationId`).
