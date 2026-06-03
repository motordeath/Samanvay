# RELATIONAL ORCHESTRATION GRAPH

## 1. Core Schema Topology
The Samanvay Prisma schema creates a robust relational graph mapping multi-tenant governance to operational workflows.

### Foundational Entities
- **User:** Global identity.
- **Organization:** Boundary context.
- **Resource / Skill:** Global taxonomies.

### Relational Anchors
- **Membership:** `[User, Organization]` -> Establishes Governance Authority.
- **Partnership:** `[Organization, Organization]` -> Establishes B2B Trust.
- **Volunteer:** `[User]` -> Establishes Global Operational Profile.

## 2. Foreign-Key Integrity Graph

### Event ↔ VolunteerNeed
- **Status:** Hardened.
- **Relation:** `eventId` is formally mapped to `Event` (`@relation`).
- **Integrity:** Database-enforced FK guarantees that a `VolunteerNeed` cannot point to a phantom event.

### Membership ↔ Assignments
- **Status:** Soft/Orchestrated.
- **Relation:** An assignment connects to a `VolunteerNeed` (which connects to `Organization`), and to a `Volunteer` (which connects to a `User`). 
- **Integrity:** `Membership` bridges `User` and `Organization`. The relational graph does not strictly enforce this bridge at the DB layer, relying entirely on application-layer orchestration (the recently added `updateMembershipStatus` propagation) to invalidate assignments when the membership breaks.

### ResourceNeed ↔ Transfers ↔ ResourceOffer
- **Status:** Hardened.
- **Relation:** Transfers strictly require valid `needId` and `offerId`. Offers strictly require `needId` and `resourceLotId`.
- **Integrity:** Highly constrained transactional pathways.

## 3. Detected Weak Points & Orphan Risks

### Global Volunteer vs Scoped Staffing
- **Risk:** Volunteers are global, but assignments are organization-scoped. If a user deletes their global volunteer profile, what happens to their historical assignments across 10 organizations? 
- **Current Mitigation:** `Volunteer.isActive` flag exists, but relational cascading is highly sensitive here.

### Invitation Lifecycles
- **Risk:** `VolunteerInvitation` connects a `Volunteer` to a `VolunteerNeed`. If the `VolunteerNeed` is closed via Event Cancellation propagation, the invitation remains `PENDING`.
- **Orphan State:** Pending invitations pointing to a `CLOSED` need.

### Event ↔ ResourceNeed Relational Integrity
- **Risk:** `ResourceNeed` has `eventId String?`. Is this formally modeled as a relation? 
- **Verification:** Yes, `event Event? @relation(fields: [eventId], references: [id])` exists.
- **Orphan State:** However, there is no lifecycle propagation yet for `Event CANCELLED` -> `ResourceNeed CANCELLED`. Resource Needs might remain `OPEN` for a cancelled event.
