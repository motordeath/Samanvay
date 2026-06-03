# API Surface

This document outlines the externally consumable REST endpoints and coordination interfaces.

## Important Route Consistency Rule

ALL externally consumable REST endpoints must follow:
```text
/api/*
```

Examples:
```text
/api/events
/api/resources
/api/users
/api/organizations
```

Avoid:
* mixed prefixes,
* nested inconsistent namespaces,
* route duplication.

This prevents frontend API fragmentation later.

---

## Backend Endpoints (Express)

Base URL: `http://localhost:3000/api`

### Auth & Users
* `POST /auth/login` - Authenticate and receive JWT
* `GET /users/:id` - Fetch user details
* `GET /organizations` - List organizations

### Events
* `GET /events` - List events
* `GET /events/:id` - Get event details
* `GET /events/:id/coordination-status` - Get event coordination status
* `GET /events/:id/readiness` - Get event readiness metrics

### Resources & Volunteers
* `GET /resources` - List resources
* `GET /volunteers` - List volunteers

*All backend endpoints require a valid JWT token in the `Authorization` header for protected routes.*

---

## Coordination Layer Endpoints (FastAPI)

Base URL: `http://localhost:8000`

### General
* `GET /health` - Service health check

### Dashboard Aggregation
* `GET /api/dashboard/event/:id` - Fetch aggregated event dashboard projection.
  * **Headers:** 
    * `Authorization`: Bearer `<token>`
    * `x-org-id`: `<organization_id>`
  * **Behavior:** Checks Redis cache. On miss, aggregates data from `/api/events/:id` and `/api/events/:id/readiness`.

*Note: Coordination layer endpoints act as an aggregation gateway and rely on the Backend for transactional integrity.*
