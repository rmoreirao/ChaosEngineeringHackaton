<p align="center">
  <img src="frontend/public/images/logo.png" alt="Oranje Markt" width="200" />
</p>

# Oranje Markt

A full-stack Dutch specialty e-commerce application built for the Chaos Engineering Hackathon. Browse authentic Dutch products — from Gouda cheese and stroopwafels to tulips and Delft Blue pottery — with a complete shopping experience including user authentication, shopping cart, checkout, and order history.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose                           │
│                                                                 │
│  ┌──────────────┐     HTTP      ┌──────────────┐               │
│  │   Frontend   │◄────────────► │   Backend    │               │
│  │   (Next.js)  │               │  (Express)   │               │
│  │   :3000      │               │   :4000      │               │
│  └──────────────┘               └──────┬───────┘               │
│                                        │                        │
│                                        ▼                        │
│                                 ┌──────────────┐               │
│                                 │  PostgreSQL  │               │
│                                 │   :5432      │               │
│                                 └──────────────┘               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Observability                          │  │
│  │  Prometheus (:9090)  →  Grafana (:3001)                  │  │
│  │  Loki (:3100)        →  Promtail (log collector)         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Frontend** — Server-rendered React app (Next.js) with Tailwind CSS. Provides the shopping UI with SSR for SEO and fast page loads.

**Backend** — REST API (Express.js + TypeScript) handling authentication, products, categories, and orders. Uses JWT tokens and Prisma ORM.

**Database** — PostgreSQL 16 storing users, products, categories, and orders. Auto-migrated and seeded on startup.

**Observability** — Full monitoring stack: Prometheus scrapes backend metrics, Grafana for dashboards, Loki + Promtail for centralized log collection.

## Project Structure

```
├── frontend/        # Next.js frontend application
├── backend/         # Express.js REST API
├── infra/           # Docker Compose + observability configs
│   ├── docker-compose.yml
│   └── observability/
│       ├── grafana/
│       ├── prometheus/
│       ├── loki/
│       └── promtail/
├── docs/            # Documentation and screenshots
└── archive/         # Archived/deprecated materials
```

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js 20+](https://nodejs.org/) (only for local development)

### Run with Docker (recommended)

Start all services with a single command:

```bash
cd infra
docker compose up --build -d
```

This will:
1. Start PostgreSQL and wait for it to be healthy
2. Build and start the backend (runs database migrations and seeds automatically)
3. Build and start the frontend
4. Start the observability stack (Prometheus, Grafana, Loki, Promtail)

To stop all services:

```bash
cd infra
docker compose down
```

### Local Development

If you prefer running services individually for development:

**1. Start the database:**

```bash
cd infra
docker compose up db -d
```

**2. Start the backend:**

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

**3. Start the frontend:**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Accessing the Services

| Service        | URL                          | Credentials              |
|----------------|------------------------------|--------------------------|
| **Frontend**   | http://localhost:3000         | Register a new account   |
| **Backend API**| http://localhost:4000         | —                        |
| **Grafana**    | http://localhost:3001         | `admin` / `admin`        |
| **Prometheus** | http://localhost:9090         | —                        |
| **Loki**       | http://localhost:3100         | —                        |
| **PostgreSQL** | `localhost:5432`             | `oranje` / `oranje123` (db: `oranjedb`) |

### Quick Health Check

```bash
# Backend health
curl http://localhost:4000/api/health

# Backend metrics (Prometheus format)
curl http://localhost:4000/api/metrics

# Frontend metrics (Prometheus format)
curl http://localhost:3000/api/metrics
```

## Observability

Full-stack observability with metrics, logs, and dashboards across all three tiers.

### Metrics Pipeline

```
┌─────────────┐     /api/metrics      ┌────────────┐     scrape      ┌────────────┐
│   Frontend   │ ◄──────────────────── │ Prometheus │ ──────────────► │  Grafana   │
│  (prom-client)│                      │            │                 │ 4 dashboards│
├─────────────┤     /api/metrics      │            │                 └────────────┘
│   Backend    │ ◄──────────────────── │            │
│  (prom-client)│                      │            │
├─────────────┤     :9187/metrics     │            │
│  PostgreSQL  │ ◄──────────────────── │            │
│  (pg-exporter)│                      └────────────┘
└─────────────┘

┌─────────────┐     Web Vitals        ┌────────────┐
│   Browser    │ ──────────────────►   │  Frontend  │  (bridges client metrics
│  (client JS) │   /api/report-metrics │  server    │   into Prometheus)
└─────────────┘                        └────────────┘
```

### What's Collected

| Source | Metrics | How |
|--------|---------|-----|
| **Backend** | HTTP request rate/latency, error rate, orders total, cart operations, DB query duration by operation | `prom-client` + Prisma middleware |
| **Frontend (SSR)** | SSR request count/duration, Node.js process metrics (CPU, memory, event loop, GC) | `prom-client` + Next.js middleware |
| **Frontend (Browser)** | Web Vitals (LCP, FID, CLS, TTFB), page views, client JS errors, cart operations | PerformanceObserver → `/api/report-metrics` bridge |
| **PostgreSQL** | Connections, transactions/sec, cache hit ratio, row operations, table sizes, locks | `postgres-exporter` |
| **Logs** | Structured JSON logs from all containers | Promtail → Loki → Grafana |

### Grafana Dashboards

| Dashboard | What It Shows |
|-----------|---------------|
| **Application** | HTTP rates, latency p50/p95/p99, error rate, orders, cart ops, response codes, app logs |
| **Database** | Active connections, TPS, cache hit ratio, rows fetched, table sizes, locks, DB logs |
| **Frontend** | SSR request rate/latency, Web Vitals (LCP/FID/CLS/TTFB), client errors, page views |
| **Infrastructure** | CPU usage, memory (RSS), event loop lag, active handles, GC duration for backend + frontend |

Access Grafana at http://localhost:3001 (admin/admin).

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Description                                  | Default                |
|----------------|----------------------------------------------|------------------------|
| `DATABASE_URL` | PostgreSQL connection string                 | `postgresql://oranje:oranje123@localhost:5432/oranjedb` |
| `JWT_SECRET`   | Secret key for JWT token signing             | *(change in production)* |
| `CORS_ORIGIN`  | Allowed CORS origin                          | `http://localhost:3000` |
| `PORT`         | Backend server port                          | `4000`                 |
| `LOG_LEVEL`    | Log level (debug, info, warn, error)         | `info`                 |

### Frontend (`frontend/.env`)

| Variable                  | Description                              | Default                |
|---------------------------|------------------------------------------|------------------------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend URL for browser requests         | `http://localhost:4000` |
| `BACKEND_URL`             | Backend URL for server-side requests     | `http://localhost:4000` |

## Run with Kubernetes (Codespaces / k3d)

You can run the entire app in a lightweight Kubernetes cluster using [k3d](https://k3d.io/) (K3s in Docker). This works great in **GitHub Codespaces** or any Linux environment with Docker.

### Prerequisites

- Docker installed and running
- k3d, kubectl (auto-installed when using Codespaces via `.devcontainer`)

### Quick Start (Codespaces)

1. Open this repo in a GitHub Codespace (4-core / 8GB recommended)
2. Wait for the devcontainer to finish setup (installs k3d + kubectl)
3. Deploy everything:

```bash
bash infra/k8s/deploy.sh
```

This will:
1. Create a k3d cluster named `oranje-markt`
2. Build the backend and frontend Docker images
3. Import images into the k3d cluster
4. Deploy PostgreSQL, Backend, Frontend, and the full observability stack
5. Set up port-forwarding so services are accessible on localhost

### Quick Start (Local with k3d)

```bash
# Install k3d if not present
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Deploy
bash infra/k8s/deploy.sh
```

### Teardown

```bash
bash infra/k8s/teardown.sh
```

### K8s Useful Commands

```bash
# View all pods
kubectl get pods -n oranje-markt

# Watch pod status
kubectl get pods -n oranje-markt -w

# View backend logs
kubectl logs -f deployment/backend -n oranje-markt

# View frontend logs
kubectl logs -f deployment/frontend -n oranje-markt

# Restart a deployment
kubectl rollout restart deployment/backend -n oranje-markt

# Describe a failing pod
kubectl describe pod <pod-name> -n oranje-markt
```

### K8s Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     k3d Cluster (oranje-markt)                     │
│                     Namespace: oranje-markt                        │
│                                                                    │
│  ┌──────────────┐     HTTP      ┌──────────────┐                  │
│  │  Frontend     │◄────────────►│   Backend    │                  │
│  │  Deployment   │              │  Deployment  │                  │
│  │  :3000        │              │   :4000      │                  │
│  └──────────────┘              └──────┬───────┘                  │
│                                       │                           │
│                                       ▼                           │
│                                ┌──────────────┐                  │
│                                │  PostgreSQL  │                  │
│                                │ StatefulSet  │                  │
│                                │   :5432      │                  │
│                                └──────────────┘                  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Observability                              │ │
│  │  Prometheus (:9090)  →  Grafana (:3001)                      │ │
│  │  Loki (:3100)        →  Promtail (DaemonSet)                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer           | Technology                                    |
|-----------------|-----------------------------------------------|
| Frontend        | Next.js 16, React 19, Tailwind CSS 4          |
| Backend         | Express.js 4, TypeScript 5                    |
| Database        | PostgreSQL 16, Prisma ORM 5                   |
| Authentication  | JWT (jsonwebtoken + bcryptjs)                 |
| Logging         | Pino (structured JSON logging)                |
| Metrics         | prom-client (Prometheus format)               |
| Monitoring      | Prometheus, Grafana, Loki, Promtail           |
| Containerization| Docker, Docker Compose                        |
| Testing         | Playwright (E2E + Load)                       |

## Testing

The project includes Playwright-based E2E tests and a load testing runner under `tests/`.

### Prerequisites

- Frontend running on `http://localhost:3000`
- Backend running on `http://localhost:4000`
- Database seeded with test data

### Setup

```bash
cd tests
npm install
npx playwright install chromium
```

### E2E Tests

Run all 5 scenario tests:

```bash
cd tests
npx playwright test
```

| Scenario | Description |
|----------|-------------|
| 01 - Browse Products | Homepage → category → product detail |
| 02 - Search Products | Search and verify results |
| 03 - Register & Login | Register, logout, login |
| 04 - Cart & Checkout | Full purchase flow (add to cart → checkout → verify order) |
| 05 - Unauth Redirect | Protected pages require login |

Other useful commands:

```bash
npx playwright test --headed          # Watch tests in browser
npx playwright test --debug           # Step-through debugger
npx playwright test e2e/01-browse-products.spec.ts  # Run a single scenario
```

### Load Tests

The load runner spawns N concurrent browser contexts running the same scenario flows used by E2E tests.

```bash
cd tests
npx tsx load/load-test.ts --scenario=browse --users=5 --duration=60
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--scenario` | `browse` | Scenario to run: `browse`, `search`, `register`, `checkout`, `unauth` |
| `--users` | `5` | Number of concurrent browser contexts |
| `--duration` | `60` | Test duration in seconds |

**Recommended load mix:**
- 60% browsing (`browse` + `search`) — read-only, safe at high concurrency
- 10% registration (`register`) — creates users, use unique emails per run
- 25% purchase (`checkout`) — full purchase funnel, measures end-to-end latency
- 5% auth redirect (`unauth`) — lightweight auth middleware check
