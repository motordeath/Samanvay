# LIFECYCLE STATE MACHINE AUDIT

## 1. AssignmentStatus
**Enum:** `ASSIGNED`, `CHECKED_IN`, `CHECKED_OUT`, `COMPLETED`, `CANCELLED`

| Validation | Status | Notes |
| :--- | :--- | :--- |
| **Allowed Transitions** | `ASSIGNED` -> `CHECKED_IN`, `CHECKED_IN` -> `CHECKED_OUT`, `CHECKED_OUT` -> `COMPLETED`, `ASSIGNED` -> `CANCELLED` | Strictly enforced in `assignmentService`. |
| **Forbidden Transitions** | `CHECKED_IN` -> `CANCELLED`, `COMPLETED` -> `CANCELLED` | Safely prevents historical destruction. |
| **Terminal States** | `COMPLETED`, `CANCELLED` | Correctly modeled. |
| **Missing States** | `NO_SHOW` | Currently missing. A volunteer who doesn't show up remains `ASSIGNED` indefinitely or must be manually `CANCELLED`, which blurs the line between pre-operation cancellation and post-operation failure. |

## 2. VolunteerNeedStatus
**Enum:** `OPEN`, `FILLED`, `CLOSED`

| Validation | Status | Notes |
| :--- | :--- | :--- |
| **Allowed Transitions** | `OPEN` -> `FILLED` (Auto-sync), `FILLED` -> `OPEN` (Auto-revert), `OPEN` -> `CLOSED` (Event Propagation) | Enforced. |
| **Forbidden Transitions** | `CLOSED` -> `FILLED` | Assumed correct, though explicit state machine guards in need service must be validated. |
| **Missing States** | `CANCELLED` | If an event is cancelled, the need goes to `CLOSED`. But `CLOSED` usually implies "successfully completed". A `CANCELLED` state would mathematically separate successfully concluded operations from aborted operations. |

## 3. InvitationStatus
**Enum:** `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`

| Validation | Status | Notes |
| :--- | :--- | :--- |
| **Allowed Transitions** | `PENDING` -> `ACCEPTED` / `DECLINED` / `EXPIRED` | Includes lazy expiration. |
| **Orphan Risk** | Event/Need Closure | When a need closes, pending invitations do not auto-transition to `EXPIRED` or `CANCELLED`. |

## 4. Event Status (String)
**Values:** `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED` (inferred)
*Note: Event status relies on raw strings rather than a Prisma Enum.*

| Validation | Status | Notes |
| :--- | :--- | :--- |
| **Unsafe Transitions** | `CANCELLED` -> `PUBLISHED` | Because it uses a raw string, there is a risk of a controller explicitly updating a cancelled event back to published, which would NOT reverse the propagated closures of VolunteerNeeds. |
| **Recommendation** | Convert to Enum | Hardening required. |

## 5. Membership Status (String)
**Values:** `PENDING`, `ACTIVE`, `INACTIVE`

| Validation | Status | Notes |
| :--- | :--- | :--- |
| **Historical Preservation**| `INACTIVE` | Safely preserves the record rather than deleting it. |
| **Unsafe Transitions** | `INACTIVE` -> `ACTIVE` | If re-activated, assignments that were automatically `CANCELLED` are NOT un-cancelled. This is structurally correct (cancellations are final), but user experience must reflect this. |
