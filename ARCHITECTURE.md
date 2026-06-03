# Architecture

Samanvay is designed with a clear separation of concerns across its three primary layers.

## Monorepo Responsibility Boundaries

### backend/
Responsible for:
* orchestration,
* transactional integrity,
* domain lifecycle rules,
* authorization enforcement,
* Prisma persistence,
* audit logging.

### coordination-layer/
Responsible for:
* aggregation,
* shallow projections,
* websocket coordination,
* caching,
* request shaping,
* operational summaries.

### frontend/
Responsible for:
* UI rendering,
* interaction flows,
* dashboard state,
* operational visualization,
* websocket consumption.

---

## Auth Propagation

Authentication originates at the Frontend layer and propagates down to the Backend.
* The Frontend includes a JWT in the `Authorization` header.
* The Coordination Layer receives this token and validates basic structural integrity or forwards it.
* The Backend performs full validation of the JWT and extracts user/organization context to enforce authorization policies.
* The Coordination Layer also forwards custom headers like `x-org-id` to the backend.

---

## Aggregation Strategy

The Coordination Layer acts as an Aggregation Gateway. 
Instead of the frontend making numerous calls to individual backend services (e.g., fetching events, then fetching resources, then fetching volunteer data), the frontend makes a single call to an aggregation endpoint in the Coordination Layer.

The Coordination Layer:
1. Checks Redis cache for a pre-computed projection.
2. If cache miss, performs concurrent shallow fetches to the Backend REST APIs.
3. Shapes the responses into a cohesive projection payload optimized for the specific UI view.
4. Caches the resulting projection in Redis.
5. Returns the aggregated response to the frontend.

---

## Infrastructure Evolution Policy

Current architecture intentionally uses a monorepo for:
* rapid iteration,
* integration stability,
* simplified orchestration development.

Repository splitting should NOT occur until:
* APIs stabilize,
* deployment boundaries become independent,
* scaling requirements justify separation.

---

## Repository Quality Goal

Samanvay aims to evolve into:
```text
Operational Coordination Platform
```
NOT:
* isolated CRUD services,
* disconnected microservices,
* purely administrative dashboards.

The architecture prioritizes:
* coordination,
* orchestration,
* operational visibility,
* humanitarian logistics workflows.
