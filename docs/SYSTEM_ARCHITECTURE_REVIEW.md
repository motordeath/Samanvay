# SYSTEM ARCHITECTURE REVIEW

## 1. Orchestration Maturity
**Rating: High-Intermediate (Level 3/5)**
The platform has evolved from a simple CRUD API into a reactive orchestration system. Governance boundaries (Memberships, Organizations) accurately dictate operational footprints (Assignments). The usage of `prisma.$transaction` for propagation ensures robust baseline safety.

## 2. Architectural Strengths
- **Transactional Discipline:** Cross-engine mutations (e.g. Event -> Need closure, Membership -> Assignment cancellation) are securely wrapped in transactions, preventing partial state corruption.
- **Immutable Operations History:** The recent hardening correctly locked attendance and completed assignments from destructive lifecycle overrides.
- **Governance First:** Treating Organizations and Memberships as the primary gatekeeper for workflows respects enterprise-grade B2B boundaries.

## 3. Critical Risks & Weaknesses
- **Cascading Deletions:** The Prisma schema requires a thorough review to remove `@relation(onDelete: Cascade)` from any entity representing operational truth (e.g. Assignments, Attendance, Audits).
- **Missing Propagation Vectors:**
  - Event Cancellation must propagate deeper: `Event CANCELLED` -> `Needs CLOSED` -> `Assignments CANCELLED`.
  - Organization Invalidation must propagate deeper: `Org INACTIVE` -> `Memberships INACTIVE` (which then triggers assignment cascades).
- **Audit Logging Isolation:** Audit logs are sometimes written outside the domain transaction, risking trace loss during unexpected Node.js crashes.

## 4. Scalability Readiness
- **Bottlenecks:** Centralized lifecycle propagations querying many rows (e.g. `VolunteerAssignment.findMany` in a loop) will severely impact DB connection limits and block the main thread. Bulk `updateMany` combined with optimized bulk-audit inserts are strictly necessary for production scale.
- **Coordination Maturity:** The system currently relies heavily on imperative, inline propagation. As rules grow, an Event-Bus or Queue-based architecture (e.g. Kafka / RabbitMQ / SQS) will be required to handle asynchronous orchestration safely.
