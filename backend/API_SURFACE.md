# Samanvay Backend API Surface

This document highlights the stabilized core API surface intended for frontend consumption. It focuses on the heavily orchestrated flows ensuring the frontend respects the transactional nature of the backend.

## Coordination & Projections
The primary operational state tree for any event.

### `GET /events/:id/coordination-status`
* **Response Shape:**
  ```json
  {
    "staffing": { "required": 10, "assigned": 5, "status": "AT_RISK" },
    "resources": { "required": 100, "reserved": 100, "status": "READY" },
    "transfers": { "pending": 2 },
    "overallStatus": "AT_RISK"
  }
  ```
* **Purpose:** Acts as the frontend orchestration root state. Derived and computed dynamically.

## Resource Engine
Authoritative API for cross-organization resource flows.

### `POST /resources/transfers`
* **Purpose:** Creates a resource transfer request between organizations to fulfill an event's resource need.
* **Flow Context:** Will create deterministic transfer states and eventually update reservation allocations upon dispatch.

### `POST /resources/reservations`
* **Purpose:** Locks physical inventory (Pessimistic allocation).
* **Flow Context:** Generates deterministic `InventoryLedgerEntry` logs to ensure no resources are double-booked.

### `GET /resources/inventory`
* **Purpose:** Retrieves the current computed stock projection of resources.
* **Flow Context:** Exclusively read-optimized. To change inventory, operations must issue stock adjustments resulting in ledger entries.

## Volunteer Engine
Authoritative API for human capital.

### `POST /volunteers/assignments`
* **Purpose:** Finalizes an assignment of a global volunteer to a specific event need.
* **Constraint:** Validated against volunteer availability, active membership standing, and current assignment conflicts.

### `PATCH /volunteers/assignments/:id/status`
* **Purpose:** Transitions the volunteer lifecycle (e.g., ASSIGNED -> CHECKED_IN).
* **Constraint:** Strictly enforced via `AssignmentStatus` enum. Invalid transitions are rejected natively.

## Event Management
### `PATCH /events/:id`
* **Purpose:** Modifies event details including `status`.
* **Constraint:** Updating an event to `CANCELLED` will synchronously invalidate and propagate cancellations down to all associated Volunteer Needs and Assignments.

## Error Handling
All API responses map to standardized error types:
* `400 ValidationError`: Bad input data.
* `403 ForbiddenError`: Missing organizational or access role.
* `404 NotFoundError`: Resource unavailable.
* `409 ConcurrencyConflictError`: Optimistic locking failure (e.g., another user updated the entity exactly at the same time).
* `422 StateTransitionError`: Invalid workflow transition (e.g., CANCELLED -> PUBLISHED).
