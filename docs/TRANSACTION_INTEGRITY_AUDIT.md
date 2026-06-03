# TRANSACTION INTEGRITY AUDIT

## 1. Overview
The orchestration graph depends entirely on the atomicity of multi-engine writes. If one engine updates state but fails to propagate to another, the platform suffers from *orchestration divergence*.

## 2. Protected Flows (Safe)
The following flows have been hardened and successfully operate inside `prisma.$transaction`:
- **Event Cancellation Propagation:** `Event` status and `VolunteerNeed` closures update synchronously.
- **Membership Invalidation Propagation:** `Membership` status, `VolunteerAssignment` cancellations, and `VolunteerAudit` traces update synchronously.
- **Resource Transfer Completions:** (Assuming standard implementation) Inventory deduplication usually happens transactionally to prevent double-spending.

## 3. High-Risk Divergence Areas (Unsafe / Unknown)

### Status Transition vs Audit Trace Isolation
- **Risk:** Some services (e.g., `assignmentService`) use `prisma.volunteerAssignment.update` and then separately call `AuditService.log(...)` WITHOUT a shared transaction block.
- **Impact:** If the Node process crashes between the DB update and the audit log, the system mutates operational truth but loses the historical trace permanently.
- **Resolution:** `AuditService` needs a transactional overload `AuditService.logWithTx(tx, ...)` to bind traces directly into the caller's transaction context.

### Capacity Counting (VolunteerNeed.filledCount vs Assignments)
- **Risk:** If `filledCount` on a `VolunteerNeed` is manually managed instead of being dynamically calculated `COUNT(assignments WHERE status IN (ASSIGNED, CHECKED_IN...))`, race conditions will occur during concurrent acceptances.
- **Impact:** Phantom capacity or over-staffing if two volunteers accept an invitation simultaneously.

### Partnership & Transfer Authority
- **Risk:** A partnership might be deleted or suspended while a `Transfer` is actively being processed.
- **Impact:** If the authorization guard checks the partnership at the start of the HTTP request, but the transfer logic doesn't execute inside a serializable transaction referencing the partnership state, a transfer can complete unauthorized.
