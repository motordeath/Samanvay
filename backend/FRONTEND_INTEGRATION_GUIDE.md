# Samanvay Frontend Integration Guide

This guide is for frontend developers consuming the Samanvay backend. The backend operates on strict deterministic, transactional orchestration.

## 1. Concurrency Management
**Expect `409 ConcurrencyConflictError`**
The backend enforces strict optimistic locking during critical transitions.
- **Frontend Action:** If a `409` is received, the frontend MUST re-fetch the latest state of the entity and prompt the user to re-apply their change if still applicable. Do NOT blindly retry the exact same mutation without re-hydrating the state.

## 2. Deriving UI State
**Use `GET /events/:id/coordination-status`**
Do not attempt to calculate "is this event ready?" manually on the frontend by downloading 500 volunteer assignments and 500 resource reservations.
- **Frontend Action:** Rely solely on the `overallStatus` (e.g., READY, AT_RISK, BLOCKED) provided by the `/coordination-status` endpoint.

## 3. Strict State Transitions
**Expect `422 StateTransitionError`**
You cannot jump from `CANCELLED` back to `PUBLISHED`, or `COMPLETED` back to `DRAFT`.
- **Frontend Action:** Ensure UI action buttons reflect valid next-states (e.g., Disable the "Publish" button if the event is already Cancelled).

## 4. Cascading Actions (Cross-Engine Propagation)
**Destructive actions carry weight.**
When an Event is updated to `CANCELLED`, all child volunteer needs and volunteer assignments are synchronously and immediately cancelled.
- **Frontend Action:** Display severe confirmation modals for any action that affects the top-level parent entity of a propagation chain.

## 5. Inventory and Resource Integrity
**Inventory is Derived, Not Settled.**
Do not build UI logic assuming "inventory = 50 means I can immediately use 50".
- **Frontend Action:** Always rely on the backend to validate Reservations. The backend uses the immutable `InventoryLedgerEntry` to dictate exactly what is reservable.

## 6. Financial Ledger
**The Ledger is Append-Only.**
Currently, there is no "Delete Transaction" API. If you need to revert a financial entry, a compensating entry must be submitted.
- **Frontend Action:** Design the UI to only show "Append/Adjust" operations. Never expose a destructive delete action for financial/audit data.
