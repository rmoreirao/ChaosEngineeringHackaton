<p align="center">
  <img src="frontend/public/images/logo.png" alt="Oranje Markt" width="200" />
</p>

# Oranje Markt

A full-stack Dutch specialty e-commerce application built for the Chaos Engineering Hackathon. Browse authentic Dutch products — from Gouda cheese and stroopwafels to tulips and Delft Blue pottery — with a complete shopping experience including user authentication, shopping cart, checkout, and order history.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                                                                          │
│  ┌──────────────┐     HTTP      ┌──────────────┐                        │
│  │   Frontend   │◄────────────► │   Backend    │                        │
│  │   (Next.js)  │               │  (Express)   │                        │
│  │   :3000      │               │   :4000      │                        │
│  └──────┬───────┘               └──────┬───────┘                        │
│         ▲                              │                                 │
│         │ Web Vitals (POST)            ▼                                 │
│         │ /api/report-metrics   ┌──────────────┐                        │
│  ┌──────┴───────┐               │  PostgreSQL  │                        │
│  │   Browser    │               │   :5432      │                        │
│  │  (end user)  │               └──────┬───────┘                        │
│  └──────────────┘                      │                                 │
│                                        │                                 │
│  ┌──────────────────────────────────────┴─────────────────────────────┐  │
│  │                       Observability                                │  │
│  │  Prometheus (:9090) ◄── Backend :4000/api/metrics                  │  │
│  │                     ◄── Frontend :3000/api/metrics                  │  │
│  │                     ◄── Postgres-Exporter :9187/metrics             │  │
│  │  Grafana (:3001)    ◄── 4 dashboards (App, DB, Frontend, Infra)    │  │
│  │  Loki (:3100)       ◄── Promtail (container log collector)         │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Frontend** — Server-rendered React app (Next.js 16) with Tailwind CSS 4. Provides the shopping UI with SSR, plus client-side Web Vitals tracking (LCP, FID, CLS, TTFB) and cart operation metrics.

**Backend** — REST API (Express.js + TypeScript) handling authentication, products, categories, and orders. Uses JWT tokens, Prisma ORM with query-level performance instrumentation, and prom-client for Prometheus metrics.

**Database** — PostgreSQL 16 storing users, products, categories, and orders. Auto-migrated and seeded on startup. Monitored via postgres-exporter for connection, transaction, and cache metrics.

**Observability** — Full three-tier monitoring: Prometheus scrapes metrics from backend, frontend, and postgres-exporter. Grafana provides 4 pre-built dashboards. Loki + Promtail for centralized structured log collection.

## Project Structure

```
├── .devcontainer/       # Codespaces config (k3d + kubectl)
├── frontend/            # Next.js frontend application
│   └── src/
│       ├── app/api/     # /api/metrics + /api/report-metrics endpoints
│       ├── components/  # WebVitalsReporter, CartProvider (instrumented)
│       └── lib/         # prom-client metrics registry
├── backend/             # Express.js REST API
│   └── src/
│       ├── middleware/   # HTTP metrics, auth, error handling
│       └── lib/         # Prisma client (with query duration middleware)
├── infra/               # Infrastructure configs
│   ├── docker-compose.yml
│   ├── k8s/             # Kubernetes manifests for k3d/Codespaces
│   │   ├── deploy.sh    # One-command k3d deploy
│   │   ├── teardown.sh
│   │   ├── postgres/    # StatefulSet, PVC, Secret, Service
│   │   ├── backend/     # Deployment, ConfigMap, Service
│   │   ├── frontend/    # Deployment, Service
│   │   ├── traffic-generator/ # Deployment, ConfigMap (continuous traffic gen)
│   │   └── observability/
│   │       ├── prometheus/
│   │       ├── grafana/
│   │       ├── loki/
│   │       ├── promtail/
│   │       └── postgres-exporter/
│   └── observability/   # Docker Compose observability configs
│       ├── grafana/     # Datasources + 4 dashboard JSONs
│       ├── prometheus/  # Scrape config (backend, frontend, pg-exporter)
│       ├── loki/
│       └── promtail/
├── tests/               # Playwright E2E + load tests + traffic generator
│   ├── Dockerfile       # Traffic generator container image
│   └── scripts/         # traffic-gen.sh entrypoint
├── docs/                # Documentation and screenshots
└── archive/             # Archived/deprecated materials
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
3. Build and start the frontend (with SSR metrics + Web Vitals tracking)
4. Start the observability stack (Prometheus, Grafana, Loki, Promtail, Postgres-Exporter)

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

| Service              | URL                          | Credentials              |
|----------------------|------------------------------|--------------------------|
| **Frontend**         | http://localhost:3000         | Register a new account   |
| **Backend API**      | http://localhost:4000         | —                        |
| **Grafana**          | http://localhost:3001         | `admin` / `admin`        |
| **Prometheus**       | http://localhost:9090         | —                        |
| **Loki**             | http://localhost:3100         | —                        |
| **Postgres Exporter**| http://localhost:9187/metrics | —                        |
| **PostgreSQL**       | `localhost:5432`             | `oranje` / `oranje123` (db: `oranjedb`) |

### Quick Health Check

```bash
# Backend health
curl http://localhost:4000/api/health

# Backend metrics (Prometheus format)
curl http://localhost:4000/api/metrics

# Frontend metrics (Prometheus format)
curl http://localhost:3000/api/metrics

# Postgres exporter metrics
curl http://localhost:9187/metrics
```

## Observability

Full-stack observability with metrics, logs, and dashboards across all three tiers.

### Metrics Pipeline

```
                          ┌─────────────┐
  ┌────────────────────── │ Prometheus  │ ──────────────────┐
  │   scrape /api/metrics │   :9090     │ scrape :9187      │
  ▼                       └──────┬──────┘                   ▼
┌─────────────┐                  │ scrape           ┌────────────────┐
│   Backend   │                  │ /api/metrics     │  Postgres      │
│   :4000     │                  ▼                  │  Exporter      │
│ prom-client │           ┌─────────────┐           │  :9187         │
└─────────────┘           │  Frontend   │           └────────────────┘
                          │   :3000     │
┌─────────────┐           │ prom-client │           ┌────────────────┐
│   Browser   │ ────────► │             │           │   Grafana      │
│  Web Vitals │  POST     └─────────────┘           │   :3001        │
│  Cart ops   │  /api/report-metrics                │ 4 dashboards   │
│  Errors     │                                     └────────────────┘
└─────────────┘
                          ┌─────────────┐           ┌────────────────┐
                          │  Promtail   │ ────────► │   Loki         │
                          │ log shipper │           │   :3100        │
                          └─────────────┘           └────────────────┘
```

### What's Collected

| Source | Metrics | How |
|--------|---------|-----|
| **Backend** | HTTP request rate/latency/errors, orders total, cart checkout operations, DB query duration per Prisma model+action | `prom-client` + Prisma `$use` middleware |
| **Frontend (SSR)** | SSR request count, Node.js process metrics (CPU, memory, event loop lag, GC) | `prom-client` + Next.js instrumentation hook |
| **Frontend (Browser)** | Web Vitals (LCP, FID, CLS, TTFB) as histograms, page views by route, client JS errors, cart operations (add/remove/update/clear) | PerformanceObserver → `/api/report-metrics` bridge |
| **PostgreSQL** | Active/idle connections, transactions/sec, cache hit ratio, rows fetched/returned, table sizes, locks | `postgres-exporter` scraping `pg_stat_*` views |
| **Logs** | Structured JSON logs from all containers | Promtail → Loki → Grafana |

### Grafana Dashboards

| Dashboard | What It Shows |
|-----------|---------------|
| **Application** | HTTP request rate by route/method/status, error rate %, orders total, latency p50/p95/p99, cart operations (backend + frontend), DB query latency by Prisma operation, response status code breakdown, application logs |
| **Database** | Active connections (by state), transactions/sec, cache hit ratio %, rows fetched vs returned, table sizes, lock activity, database logs |
| **Frontend** | SSR request rate by route, SSR latency p95, Web Vitals p75/p95 (LCP/FID/CLS/TTFB), client-side JS errors, page views by route |
| **Infrastructure** | Backend + frontend CPU usage, memory (RSS), event loop lag, active handles, GC duration |

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
2. Build the backend, frontend, and traffic-generator Docker images
3. Import images into the k3d cluster
4. Deploy PostgreSQL, Backend, Frontend, Traffic Generator, and the full observability stack (Prometheus, Grafana, Loki, Promtail, Postgres-Exporter)
5. Configure Traefik ingress so services are reachable directly on the forwarded DevContainer ports

### Quick Start (Local with k3d)

```bash
# Install k3d if not present
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

# Deploy
bash infra/k8s/deploy.sh
```

The deployment no longer relies on background `kubectl port-forward` processes; Traefik exposes the app and observability services directly through the k3d load balancer.

### Teardown

```bash
bash infra/k8s/teardown.sh
```

### K8s Useful Commands

```bash
# View all pods
kubectl get pods -n oranje-markt

# View ingress routes
kubectl get ingress -n oranje-markt

# Watch pod status
kubectl get pods -n oranje-markt -w

# View backend logs
kubectl logs -f deployment/backend -n oranje-markt

# View frontend logs
kubectl logs -f deployment/frontend -n oranje-markt

# View traffic generator logs
kubectl logs -f deployment/traffic-generator -n oranje-markt

# Restart a deployment
kubectl rollout restart deployment/backend -n oranje-markt

# Describe a failing pod
kubectl describe pod <pod-name> -n oranje-markt
```

### K8s Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                      k3d Cluster (oranje-markt)                        │
│                      Namespace: oranje-markt                           │
│                                                                        │
│  ┌──────────────┐     HTTP      ┌──────────────┐                      │
│  │  Frontend     │◄────────────►│   Backend    │                      │
│  │  Deployment   │              │  Deployment  │                      │
│  │  :3000        │              │   :4000      │                      │
│  └──────┬───────┘              └──────┬───────┘                      │
│         ▲                             │                               │
│         │ Playwright traffic          ▼                               │
│  ┌──────┴───────┐              ┌──────────────┐                      │
│  │   Traffic    │              │  PostgreSQL  │                      │
│  │  Generator   │              │ StatefulSet  │                      │
│  │  Deployment  │              │   :5432      │                      │
│  └──────────────┘              └──────────────┘                      │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    Observability                                  │ │
│  │  Prometheus (:9090)       →  Grafana (:3001)                     │ │
│  │  Loki (:3100)             →  Promtail (DaemonSet)                │ │
│  │  Postgres-Exporter (:9187)                                       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
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
| DB Monitoring   | postgres-exporter (PostgreSQL metrics)        |
| Monitoring      | Prometheus, Grafana, Loki, Promtail           |
| Containerization| Docker, Docker Compose, k3d (Kubernetes)      |
| Testing         | Playwright (E2E + Load)                       |
| Traffic Gen     | Playwright-based continuous traffic generator  |

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

## Traffic Generator

A containerized, continuously running traffic generator that uses the same Playwright scenario flows to produce realistic website traffic. Ideal for chaos engineering experiments — it generates steady-state traffic so faults can be injected and observed through the observability stack.

### How It Works

The traffic generator runs in an infinite loop:
1. Cycles through each configured scenario (browse → search → register → checkout → unauth)
2. For each scenario, spawns N concurrent browser contexts running for a configurable duration
3. Sleeps between rounds, then repeats

### Configuration (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `SCENARIOS` | `browse,search,register,checkout,unauth` | Comma-separated list of scenarios to run |
| `USERS` | `3` | Number of concurrent browser contexts per scenario |
| `DURATION` | `30` | Duration in seconds for each scenario run |
| `BASE_URL` | `http://localhost:3000` | Target frontend URL |
| `SLEEP_BETWEEN_RUNS` | `30` | Seconds to sleep between rounds |

### Run with Docker Compose

The traffic generator is included in `docker-compose.yml` and starts automatically:

```bash
cd infra
docker compose up --build -d
```

To view traffic generator logs:

```bash
docker logs -f oranje-markt-traffic-generator
```

### Run with Kubernetes

The traffic generator is deployed as a Deployment (1 replica) in the `oranje-markt` namespace. Configuration is managed via the `traffic-generator-config` ConfigMap.

```bash
# View traffic generator logs
kubectl logs -f deployment/traffic-generator -n oranje-markt

# Adjust configuration
kubectl edit configmap traffic-generator-config -n oranje-markt
kubectl rollout restart deployment/traffic-generator -n oranje-markt

# Stop traffic generation
kubectl scale deployment/traffic-generator --replicas=0 -n oranje-markt

# Resume traffic generation
kubectl scale deployment/traffic-generator --replicas=1 -n oranje-markt
```
