<p align="center">
  <img src="frontend/public/images/logo.png" alt="Oranje Markt" width="200" />
</p>

# Oranje Markt

A full-stack Dutch specialty e-commerce application built for the Chaos Engineering Hackathon. Browse authentic Dutch products — from Gouda cheese and stroopwafels to tulips and Delft Blue pottery — with a complete shopping experience including user authentication, shopping cart, checkout, and order history.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                                                        │
│  ┌──────────────┐     HTTP      ┌──────────────┐      │
│  │   Frontend   │◄────────────► │   Backend    │      │
│  │   (Next.js)  │               │  (Express)   │      │
│  │   :3000      │               │   :4000      │      │
│  └──────────────┘               └──────┬───────┘      │
│                                        │               │
│                                        ▼               │
│                                 ┌──────────────┐      │
│                                 │  PostgreSQL  │      │
│                                 │   :5432      │      │
│                                 └──────────────┘      │
└──────────────────────────────────────────────────────┘
```

**Frontend** — Server-rendered React app (Next.js 16) with Tailwind CSS 4.

**Backend** — REST API (Express.js + TypeScript) handling authentication, products, categories, and orders. Uses JWT tokens and Prisma ORM.

**Database** — PostgreSQL 16 storing users, products, categories, and orders. Auto-migrated and seeded on startup.

## Project Structure

```
├── frontend/            # Next.js frontend application
│   └── src/
│       ├── app/         # Pages and API routes
│       ├── components/  # React components
│       └── lib/         # Shared utilities
├── backend/             # Express.js REST API
│   └── src/
│       ├── middleware/   # HTTP metrics, auth, error handling
│       └── lib/         # Prisma client
├── infra/               # Infrastructure configs
│   └── docker-compose.yml
├── tests/               # Playwright E2E + load tests + traffic generator
└── labs/                # Chaos engineering labs
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
| **PostgreSQL**       | `localhost:5432`             | `oranje` / `oranje123` (db: `oranjedb`) |

### Quick Health Check

```bash
curl http://localhost:4000/api/health
```

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

## Tech Stack

| Layer           | Technology                                    |
|-----------------|-----------------------------------------------|
| Frontend        | Next.js 16, React 19, Tailwind CSS 4          |
| Backend         | Express.js 4, TypeScript 5                    |
| Database        | PostgreSQL 16, Prisma ORM 5                   |
| Authentication  | JWT (jsonwebtoken + bcryptjs)                 |
| Logging         | Pino (structured JSON logging)                |
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

## Traffic Generator

A containerized, continuously running traffic generator that uses the same Playwright scenario flows to produce realistic website traffic. Ideal for chaos engineering experiments — it generates steady-state traffic so faults can be injected and observed.

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
