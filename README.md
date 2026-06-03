# Samanvay

## Project Overview

Samanvay is a distributed humanitarian coordination platform designed for:
* event orchestration,
* volunteer coordination,
* resource logistics,
* readiness projections,
* operational aggregation.

---

## Architecture

```text
Frontend (Next.js)
    ↓
Coordination Layer (FastAPI)
    ↓
Backend Orchestration Engine (Express + Prisma)
    ↓
PostgreSQL / Redis
```

---

## Core Systems

* Event Coordination
* Volunteer Coordination
* Resource Coordination
* Transfer Management
* Audit Infrastructure
* Aggregation Gateway
* Readiness Projections

---

## Environment Configuration

Each subsystem maintains isolated environment configuration.

### backend/.env
Expected:
* DATABASE_URL
* JWT_SECRET
* PORT

### coordination-layer/.env
Expected:
* BACKEND_API_URL
* REDIS_URL
* API_PORT

### frontend/.env.local
Expected:
* NEXT_PUBLIC_API_URL
* NEXT_PUBLIC_WS_URL

---

## Redis Requirement

The coordination layer currently expects Redis at:
```text
redis://localhost:6379
```

If Redis is unavailable:
* cache reads fail,
* projections may bypass caching,
* websocket coordination may degrade.

---

## Recommended Startup Order

### 1. Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Redis
```bash
docker run -p 6379:6379 redis
```

### 3. Coordination Layer
```bash
cd coordination-layer
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Current Platform Status

Implemented:
* Event orchestration
* Resource coordination
* Volunteer coordination foundation
* Aggregation gateway
* JWT authentication
* Readiness projections
* Audit infrastructure

In Progress:
* Frontend operational dashboards
* Websocket coordination
* Advanced planning engine
* Real-time synchronization

Future:
* Deployment infrastructure
* Horizontal scaling
* Distributed orchestration
* AI-assisted coordination
