# Samanvay Backend Invariants Registry

This document lists the core, unbreakable constraints and invariants of the Samanvay backend architecture. Any PR or feature expansion that violates these invariants MUST be rejected.

## 1. Inventory Truth
**Invariant:** Physical inventory MUST NOT be stored as a mutable balance.
**Rule:** `ResourceLot.availableQuantity` is a strictly computed projection. The absolute source of truth is the immutable summation of all `InventoryLedgerEntry` records.

## 2. Optimistic Concurrency
**Invariant:** Shared multi-actor resources MUST prevent silent overwrites.
**Rule:** Any lifecycle state change on `Event`, `Membership`, `Reservation`, `Transfer`, or `VolunteerAssignment` MUST use optimistic locking (e.g. `updateMany` checking the expected current `status` + validating `count === 1`).

## 3. Transaction-Coupled Auditing
**Invariant:** Orchestration truth equals audit truth.
**Rule:** Audit logs (`AuditLog`, `VolunteerAudit`) MUST be appended using the exact same Prisma `tx` client as the mutation they are documenting. If the transaction rolls back, the audit log MUST roll back.

## 4. Derived Operational Coordination
**Invariant:** Readiness state MUST NOT become stale.
**Rule:** The `PlanningService` strictly computes `READY`, `AT_RISK`, `BLOCKED` states dynamically on the fly. These states MUST NEVER be written directly to the database.

## 5. Cross-Engine Invalidation
**Invariant:** Inactive states MUST propagate synchronously.
**Rule:** 
- If an `Event` transitions to `CANCELLED`, all open `VolunteerNeed` records and associated `VolunteerAssignment` records MUST be closed/cancelled immediately.
- If a `Membership` becomes `INACTIVE`, all `VolunteerAssignment` records currently assigned under that organization's context MUST be cancelled immediately.

## 6. Ledger Immutability
**Invariant:** Financial and Inventory Ledgers MUST be append-only.
**Rule:** No `UPDATE` or `DELETE` statements are permitted on `InventoryLedgerEntry` or `FinancialLedgerEntry`. Errors must be fixed exclusively via compensating entries.

## 7. Event Referencing
**Invariant:** No dual-source orchestration truth.
**Rule:** `Transfer` records MUST inherit event scoping through a strictly directional hierarchy (e.g., Transfer -> Reservation -> Event). `Transfer` records MUST NOT hold a direct `eventId` foreign key if the flow originated through a reservation, to prevent synchronization drift.
