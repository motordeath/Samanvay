# GOVERNANCE & AUTHORIZATION AUDIT

## 1. Architecture of Authority
The primary gatekeeper is `authorization.service.ts`, providing helpers like `requireOrganizationAccess`, `requirePartnershipAccess`, and `requireTransferAccess`.

## 2. Validated Protections
- **Membership Status Enforcement:** Enforced! The helper checks `membership.status === 'ACTIVE'`. Inactive memberships immediately lose route access.
- **Organization Active Enforcement:** Enforced! Recently hardened, the helper explicitly checks `membership.organization.status === 'ACTIVE'`. Suspended organizations correctly lock out all users, bypassing membership status.

## 3. Detected Vulnerabilities & Stale Authority Risks

### Granular Role Bypass
- **Finding:** Most helpers (e.g. `requireTransferAccess`) verify *any* active membership (`role` agnostic). 
- **Risk:** A `VOLUNTEER` level member might technically possess enough authorization surface area to trigger a `Transfer` completion if the controller doesn't perform secondary Role checks. 
- **Recommendation:** Authorization helpers must accept an array of allowed roles: `requireOrganizationAccess(req, orgId, ['OWNER', 'ADMIN'])`.

### Partnership Status Bypass
- **Finding:** Partnerships between organizations have lifecycles. When `requirePartnershipAccess` checks the link, does it verify `partnership.status === 'ACTIVE'`?
- **Risk:** If partnerships can be paused or suspended, the auth layer MUST respect the partnership status, not just existence.

### Event Ownership Boundaries
- **Finding:** Event coordinators within an organization require `COORDINATOR` or `ADMIN` roles. If a coordinator creates an event, they are stamped as `createdById`.
- **Risk:** Can a different coordinator edit another coordinator's event within the same org? Or is it scoped to `orgId` globally?
- **Impact:** Typically manageable, but requires explicit business logic definition on peer-to-peer event modifications.

### Cross-Org Leakage
- **Status:** Safe. Multi-tenant partitioning relies heavily on `organizationId` matching on almost all entity fetches. As long as controllers strictly use the `req.user.organizationId` context provided by the auth middleware, IDOR (Insecure Direct Object Reference) is prevented.
