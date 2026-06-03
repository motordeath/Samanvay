# Samanvay — System Handover Document

**Version:** 1.0  
**Status:** MVP Definition Complete  
**Date:** 2026-05-29

---

## 1. What Samanvay Is

Samanvay is a coordination operating system for the social sector. It enables NGOs, volunteers, donors, and partners to collaborate while maintaining ownership of their own resources.

> The platform does not own NGO resources. The platform owns the coordination infrastructure.

The north star for every design decision:
> *Does this help autonomous organizations coordinate better without taking away their ownership?*

---

## 2. The Three Ownership Domains

Every entity in the system — a resource, a volunteer, a fund — carries a `domain` field. This single field drives all access control.

| Domain | Owner | Rule |
|---|---|---|
| `private` | The NGO itself | No other NGO can read or write. Partners can see quantities (read-only) for coordination purposes. |
| `shared` | Samanvay platform | Any NGO can request access. Platform rules govern allocation. |
| `collaborative` | Both NGOs jointly | Temporary. Requires explicit approval from both parties. Expires when the event or campaign ends. |

**Build order:** Private first (foundation for all engines) → Collaborative (the USP) → Shared (needs platform governance, deferred).

---

## 3. MVP Scope

### 3.1 Foundation — minimal, just enough for engines to run on

| System | Core features (build now) | Deferred |
|---|---|---|
| Auth & profiles | Register NGO + users, roles (admin / coordinator / member), basic org profile, partnership links | SSO / OAuth, multi-org membership |
| NGO network | Org profile page, send / accept partnership, view partner list | Trust score algorithm, activity history feed |
| Event system | Create event, attach volunteers, attach resources, mark complete | Multi-NGO campaigns, public event page |

### 3.2 The Three Engines — the USP

These are what make Samanvay different from any single-NGO management tool. All three must ship with the MVP.

#### Engine 1 · Resource Coordination Engine

Handles inventory, needs, offers, and transfers across NGOs.

Core features:
- Resource catalog per NGO (with `domain` field)
- Post a resource need
- System discovers candidate NGOs / shared pools
- Offering NGO sends an offer
- Requesting NGO approves or rejects
- On approval: ownership transfers, inventory updated

Deferred: Reservation locks, expiry alerts, community resource pool.

**Key rule:** No NGO's inventory is ever touched automatically. Only after explicit approval.

#### Engine 2 · Volunteer Matching Engine

Handles volunteer profiles, needs, matching, assignment, and attendance.

Core features:
- Volunteer profile with skills, location, availability, `domain`
- Post a volunteer need for an event
- Engine matches by skill + location
- Assign volunteer → volunteer accepts or declines
- Mark attendance after event

Deferred: Trust-weighted ranking, global volunteer pool, certificates.

**Key rule:** Volunteer consent is always separate from the NGO's assignment decision.

#### Engine 3 · Fund Allocation Engine

Handles fund balances, event budgets, and expenditure tracking.

Core features:
- Fund balance per NGO (with `domain` field)
- Log contributions
- Create event budget (allocate from fund)
- Log expenditures against budget
- Remaining balance view and basic spend report

Deferred: Campaign fund, community fund, donor transparency dashboard.

**Key rule:** `FundEntry` is append-only — never updated or deleted. Balance is always computed from entries, never stored directly.

### 3.3 Deferred to Phase 2+

| System | Why deferred |
|---|---|
| Verification & trust scores | Needs behavioral data to compute — only meaningful after engines are live |
| Dispute resolution | Needs trust infrastructure first |
| Community fund & shared resource pool | Needs platform governance before safe to open |
| Impact ledger | Needs verified event completion data |
| Platform analytics & fraud detection | Needs usage volume |

---

## 4. Data Models

### Foundation

```
Organization
  id            uuid        PK
  name          string
  reg_number    string      legal registration
  type          enum        ngo | csr | govt | institution | community
  sector        string[]    health, education…
  location      geo
  verified      bool
  created_at    timestamp

User
  id            uuid        PK
  org_id        uuid        FK → Organization
  name          string
  email         string      unique
  role          enum        admin | coordinator | member
  password_hash string
  created_at    timestamp

Partnership
  id            uuid        PK
  org_a         uuid        FK → Organization
  org_b         uuid        FK → Organization
  status        enum        pending | active | ended
  initiated_by  uuid        FK → Organization
  created_at    timestamp
  accepted_at   timestamp?

Event
  id            uuid        PK
  org_id        uuid        FK → Organization
  title         string
  type          enum        medical | food | awareness | fundraiser | blood | emergency
  location      geo
  starts_at     timestamp
  ends_at       timestamp
  status        enum        draft | active | completed
```

### Engine 1 · Resource Coordination

```
Resource
  id            uuid        PK
  org_id        uuid        FK → Organization
  name          string
  category      enum        food | medicine | equipment | clothing | vehicle | other
  quantity      decimal
  unit          string      kg, units, litres…
  domain        enum        private | shared | collaborative
  updated_at    timestamp

  Rule: domain = private  → only org_id can write
        domain = collaborative → locked to active transfer, immutable until resolved

ResourceNeed
  id                uuid      PK
  requesting_org    uuid      FK → Organization
  event_id          uuid?     FK → Event
  resource_name     string
  quantity_needed   decimal
  unit              string
  status            enum      open | matched | fulfilled | cancelled
  needed_by         timestamp

ResourceOffer
  id                uuid      PK
  need_id           uuid      FK → ResourceNeed
  offering_org      uuid      FK → Organization
  resource_id       uuid      FK → Resource
  quantity_offered  decimal
  status            enum      pending | accepted | rejected | transferred
  transferred_at    timestamp?

  Rule: resource inventory is not touched until status = transferred
```

### Engine 2 · Volunteer Matching

```
Volunteer
  id            uuid        PK
  user_id       uuid        FK → User
  org_id        uuid?       FK → Organization  (null = global pool)
  skills        string[]
  location      geo
  availability  json        { days: [], time_ranges: [] }
  domain        enum        private | shared | collaborative

  Rule: domain = private  → matched only within org
        domain = shared   → global pool, any NGO can request

VolunteerNeed
  id                uuid      PK
  org_id            uuid      FK → Organization
  event_id          uuid      FK → Event
  skills_required   string[]
  count_needed      int
  location          geo
  date_range        daterange
  status            enum      open | partially_filled | filled

VolunteerAssignment
  id              uuid      PK
  need_id         uuid      FK → VolunteerNeed
  volunteer_id    uuid      FK → Volunteer
  assigned_by     uuid      FK → Organization
  status          enum      invited | accepted | declined | attended
  responded_at    timestamp?
  attended_at     timestamp?

  Rule: assigned_by is the NGO; volunteer consent (accept/decline) is always separate
```

### Engine 3 · Fund Allocation

```
Fund
  id            uuid        PK
  org_id        uuid?       FK → Organization  (null = platform/community fund)
  name          string      e.g. "NGO A Treasury", "Flood Relief Campaign"
  domain        enum        private | shared | collaborative
  balance       decimal     computed from FundEntry, never stored directly
  currency      string      INR default
  created_at    timestamp

  Rule: domain = private       → org treasury, org admin allocates only
        domain = collaborative → joint campaign fund, both orgs approve spends

Budget
  id            uuid        PK
  event_id      uuid        FK → Event
  fund_id       uuid        FK → Fund
  allocated     decimal     amount locked for this event
  spent         decimal     computed from FundEntry
  approved_by   uuid        FK → User
  created_at    timestamp

FundEntry
  id            uuid        PK
  fund_id       uuid        FK → Fund
  budget_id     uuid?       FK → Budget
  type          enum        contribution | allocation | expenditure
  amount        decimal
  note          string      what was spent on
  recorded_by   uuid        FK → User
  created_at    timestamp   immutable once written — no updates, no deletes
```

---

## 5. Access Control Rules (derived from `domain`)

| Entity | domain = private | domain = shared | domain = collaborative |
|---|---|---|---|
| Resource | Owner org only (rw). Partners read quantity only. | Any NGO can request via engine. Platform governs. | Locked to active offer. No writes until transfer approved. |
| Volunteer | Matched within org only. | Any NGO's engine can match. Volunteer consent still required. | Assigned to specific cross-NGO event. Ends with event. |
| Fund | Org admin allocates. Audit log internal. | Platform admin allocates to needs. | Both orgs approve expenditures. Remaining split on close. |

---

## 6. Engine Workflows

### Engine 1 — Resource Coordination Flow

```
NGO posts ResourceNeed
        ↓
Engine scans: partner inventories (private, read-only) + shared pool
        ↓
Candidates surfaced as suggestions (no inventory touched)
        ↓
Offering NGO reviews → sends ResourceOffer
        ↓
Requesting NGO approves or rejects
        ↓
  Approved → resource.domain set to collaborative
           → quantity deducted on transfer
           → ResourceOffer.status = transferred
  Rejected → offer closed, inventory unchanged
```

### Engine 2 — Volunteer Matching Flow

```
NGO posts VolunteerNeed (skills, location, dates)
        ↓
Engine matches Volunteers by: skills ∩ location ∩ availability ∩ domain
        ↓
Ranked candidate list returned (no assignment made yet)
        ↓
NGO selects → VolunteerAssignment created (status = invited)
        ↓
Volunteer accepts or declines
        ↓
  Accepted → status = accepted → appears on event roster
  Declined → NGO can select next candidate
        ↓
After event → coordinator marks status = attended
```

### Engine 3 — Fund Allocation Flow

```
Org admin creates Budget for Event
  (allocates amount from Fund → FundEntry type = allocation)
        ↓
Coordinator logs expenditures during / after event
  (each spend → FundEntry type = expenditure)
        ↓
budget.spent = sum of expenditure entries
budget.remaining = allocated − spent
        ↓
Event completes → spend report auto-generated from FundEntry log
        ↓
Unspent allocation returns to Fund (FundEntry type = contribution, negative)
```

---

## 7. What Does Not Exist Yet (Phase 2+)

- **Trust scores** — computed from fulfillment rate, response time, disputes, fund transparency. Cannot be computed until engines have run enough cycles.
- **Verification system** — document upload, verifier approval, OTP flows.
- **Community fund & shared resource pool** — requires platform governance layer and admin tooling.
- **Impact ledger** — immutable post-event record of beneficiaries, quantities, verification status.
- **Platform analytics** — NGO dashboards, platform-wide shortage detection.
- **Donor transparency** — public fund dashboards, contribution tracking.
- **Dispute resolution** — flagging, review, and resolution workflows between NGOs.

---

## 8. Open Design Questions

These need answers before implementation begins:

1. **Starting trust score** — what score does a newly onboarded NGO get? Zero blocks all coordination; a non-zero baseline needs justification.
2. **Collaborative fund split on close** — how is unspent balance divided? Equal split, proportional to contribution, or manually decided?
3. **Volunteer domain consent** — does a volunteer choose their `domain` on signup, or does the org assign it? Who can change it?
4. **Resource offer expiry** — if an offer is not accepted within N days, does it auto-cancel? What is N?
5. **Partial fulfillment** — can a `ResourceNeed` be fulfilled by multiple offers from different NGOs? Model supports it; workflow needs explicit design.

---

*This document reflects decisions made through architecture review on 2026-05-29. All deferred items are intentional scope decisions, not omissions.*
