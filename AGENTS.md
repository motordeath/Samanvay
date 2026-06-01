# AGENTS.md

## Architecture Overview

Backend architecture follows:

routes -> middleware -> controllers -> services -> prisma -> postgres

No repository layer exists currently.

## Core Domain Flow

ResourceNeed
-> ResourceOffer
-> Transfer

Important invariants:

* Offers do not reserve stock.
* Accepting offers reserves stock.
* Transfers restore stock on cancellation.
* Fulfillment recalculation must remain atomic.

## Authorization

Authorization is organization-scoped.

Role hierarchy:

OWNER > ADMIN > COORDINATOR > VOLUNTEER > VIEWER

## AI Agent Instructions

Before scanning files:

1. Read GRAPHIFY.md
2. Prefer targeted traversal over full-repo scans
3. Ignore:

   * node_modules
   * dist
   * coverage
   * package-lock.json

## Important Services

* resource-offer.service.ts
* transfer.service.ts
* authorization.service.ts
* audit.service.ts

## Concurrency Rules

Do not remove:

* row locks
* optimistic concurrency checks
* atomic inventory updates

without explicit review.
