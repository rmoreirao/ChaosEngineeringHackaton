# Chaos Engineering Workshop — Hands-on Labs

## Overview

Three labs progressing from manual chaos to AI-driven experiments to resilience improvements. You'll break the **Oranje Markt** application running on AKS, observe what happens, and then fix it — all within ~3 hours.

The system is intentionally fragile. Your job is to find out exactly how fragile.

## Labs

| Lab | Topic | Description |
|-----|-------|----------|
| [Lab 1](lab1-manual-chaos/) | Manual Chaos Experiments |  Inject failures into Kubernetes microservices and observe results |
| [Lab 2](lab2-ai-driven-chaos/) | AI-Driven Chaos Experiments | Use AI tools to generate chaos experiments and diagnose failures |
| [Lab 3](lab3-ai-driven-resilience/) | AI-Driven Resilience Improvement | Use AI to analyze chaos findings, implement quick wins (replicas + PDB), and validate with before/after experiments |

Each lab follows the same structure:

```
lab<N>/
├── README.md              ← Challenge descriptions (start here)
└── solutions/
    ├── README.md          ← Step-by-step walkthroughs & discussion answers
    ├── manifests/         ← Ready-to-use YAML files (broken & fixed)
    └── scripts/           ← Helper scripts (Lab 3 only)
```

Start with the lab `README.md` and attempt the challenges on your own. If you get stuck, the `solutions/` subfolder has detailed walkthroughs, opinionated solution manifests, and example Copilot prompts with expected outputs.

## Prerequisites

- AZ CLI installed and authenticated (`az login`)
- `kubectl` connected to the cluster (`az aks get-credentials`)
- `kubelogin` configured (`kubelogin convert-kubeconfig -l azurecli`)
- GitHub Copilot extension installed in VS Code
- GitHub Copilot CLI installed 


## Application Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  AKS Cluster · Namespace: oranje-markt                                       │
│                                                                              │
│                              ┌──────────────┐                                │
│  ┌──────────────┐  internal  │   Backend    │     ┌──────────────┐           │
│  │   Frontend   │───────────►│  (Express)   │────►│  PostgreSQL  │           │
│  │   (Next.js)  │  HTTP      │   :4000      │     │   :5432      │           │
│  │   :3000      │◄───────────│  ClusterIP   │     │  StatefulSet │           │
│  └──────┬───────┘            └──────────────┘     └──────────────┘           │
│         │ LoadBalancer :80                                                    │
│         │ (only public IP)                                                   │
└─────────┼────────────────────────────────────────────────────────────────────┘
          │
          ▼
   ┌──────────────┐
   │   Browser    │   All traffic goes through the frontend.
   │  (end user)  │   The browser never talks to the backend directly.
   └──────────────┘
```

### Traffic Flow

The frontend is a **Next.js** app that acts as both the UI and a reverse proxy:

1. **Server-side rendering (SSR):** When a page loads, the frontend pod fetches data from the backend internally via `http://backend:4000` (Kubernetes DNS) and returns a fully rendered HTML page.
2. **Client-side API calls:** Browser requests to `/api/*` hit the frontend pod, which proxies them to the backend internally. The browser never contacts the backend directly.

This means **only the frontend needs a public IP**. The backend and database are `ClusterIP` services, accessible only within the cluster.

## Containers & Tech Stack

| Component | Tech | K8s Kind | Replicas | Port(s) | Details |
|-----------|------|----------|----------|---------|---------|
| **Frontend** | Next.js | Deployment | 1 | `:3000` (container), `:80` (service) | LoadBalancer service, namespace `oranje-markt` |
| **Backend** | Express + Prisma ORM | Deployment | 1 | `:4000` | Health endpoint at `/api/health`, init container runs DB migrations & seed |
| **Database** | PostgreSQL 16 Alpine | StatefulSet | 1 | `:5432` | PVC-backed (`1Gi`), credentials in `postgres-secret` |
| **Prometheus** | Prom/Prometheus | Deployment | 1 | `:9090` | Scrapes backend, frontend, postgres-exporter, and self |
| **Grafana** | Grafana/Grafana | Deployment | 1 | `:3001` | Pre-configured datasources (Prometheus + Loki) and dashboards |
| **Loki** | Grafana/Loki | Deployment | 1 | `:3100` | Log aggregation, TSDB schema |
| **Promtail** | Grafana/Promtail | DaemonSet | 1 per node | `:9080` | Collects container logs from `/var/log/pods`, pushes to Loki |
| **Postgres Exporter** | Prometheus Community | Deployment | 1 | `:9187` | Exposes PostgreSQL metrics for Prometheus |
| **Traffic Generator** | Playwright (Node.js) | Deployment | 1 | — | Simulates user scenarios (browse, search, register, checkout) |

## AKS Cluster Details

```
┌── Azure Subscription ──────────────────────────────────────────────────────────┐
│                                                                                │
│  Resource Group (rg-{team-name})                                               │
│  Location: germanywestcentral                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                          │   │
│  │  ┌────────────────────────────────────────────────────────────────────┐  │   │
│  │  │  Virtual Network ({team}-vnet) — 10.0.0.0/16                      │  │   │
│  │  │  ┌────────────────────────────────────────────────────────────┐    │  │   │
│  │  │  │  Subnet: snet-aks — 10.0.0.0/22 (1024 IPs)               │    │  │   │
│  │  │  │                                                            │    │  │   │
│  │  │  │  ┌──────────────────────────────────────────────────────┐  │    │  │   │
│  │  │  │  │  AKS Cluster ({team}-aks) — K8s 1.34                 │  │    │  │   │
│  │  │  │  │  Network: Azure CNI (pods get VNet IPs)              │  │    │  │   │
│  │  │  │  │  Auth: Entra ID RBAC enabled                         │  │    │  │   │
│  │  │  │  │  Identity: User-Assigned Managed Identity            │  │    │  │   │
│  │  │  │  │                                                      │  │    │  │   │
│  │  │  │  │  Node Pool: systempool                               │  │    │  │   │
│  │  │  │  │  ├── VM Size: Standard_D2s_v3 (2 vCPU, 8 GB RAM)   │  │    │  │   │
│  │  │  │  │  ├── Nodes: 2 (autoscale 1–5)                       │  │    │  │   │
│  │  │  │  │  └── OS: Linux                                       │  │    │  │   │
│  │  │  │  │                                                      │  │    │  │   │
│  │  │  │  │  ┌──────────────────────────────────────────────┐    │  │    │  │   │
│  │  │  │  │  │  Namespace: oranje-markt                      │    │  │    │  │   │
│  │  │  │  │  │                                               │    │  │    │  │   │
│  │  │  │  │  │  ┌─────────┐  ┌─────────┐  ┌────────────┐   │    │  │    │  │   │
│  │  │  │  │  │  │Frontend │─►│Backend  │─►│PostgreSQL  │   │    │  │    │  │   │
│  │  │  │  │  │  │:3000    │  │:4000    │  │:5432 (PVC) │   │    │  │    │  │   │
│  │  │  │  │  │  └─────────┘  └─────────┘  └────────────┘   │    │  │    │  │   │
│  │  │  │  │  │                                               │    │  │    │  │   │
│  │  │  │  │  │  Prometheus ◄── Grafana ◄── Loki ◄── Promtail│    │  │    │  │   │
│  │  │  │  │  │  :9090         :3001        :3100             │    │  │    │  │   │
│  │  │  │  │  │  Postgres-Exporter :9187                      │    │  │    │  │   │
│  │  │  │  │  └──────────────────────────────────────────────┘    │  │    │  │   │
│  │  │  │  └──────────────────────────────────────────────────────┘  │    │  │   │
│  │  │  └────────────────────────────────────────────────────────────┘    │  │   │
│  │  └────────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  ACR ({team}acr) — Basic SKU     │  │  Managed Identity           │  │   │
│  │  │  Stores frontend & backend images│  │  {team}-aks-identity        │  │   │
│  │  └──────────────────────────────────┘  └─────────────────────────────┘  │   │
│  │                                                                          │   │
│  │  AKS-Managed Resources (MC_ resource group):                            │   │
│  │  ├── VM Scale Set (2× Standard_D2s_v3)                                  │   │
│  │  ├── Load Balancer (Standard) + Public IP                               │   │
│  │  ├── Network Interfaces (on snet-aks)                                   │   │
│  │  ├── Network Security Group                                             │   │
│  │  └── Managed OS Disks                                                   │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

> Each team gets a **fully isolated** set of resources (Resource Group, VNet, Managed Identity, ACR, and AKS cluster). PostgreSQL and the observability stack run **in-cluster** — no Azure PaaS equivalents are used, by design.


## Quick Start

```bash
# 1. Login to Azure
az login

# 2. Set your subscription (if you have multiple)
az account set --subscription "<your-subscription-id>"

# 3. Get AKS credentials (replace with your team's resource group and cluster name)
az aks get-credentials --resource-group <rg-team-name> --name <aks-team-name>

# 4. Configure kubelogin for Entra ID authentication
kubelogin convert-kubeconfig -l azurecli

# 5. Verify cluster access
kubectl get nodes

# 6. Verify all pods are running
kubectl get pods -n oranje-markt

# 7. Check resource usage
kubectl top pods -n oranje-markt

# 8. Get the external IPs for accessing services
kubectl get svc -n oranje-markt
```

## Accessing the Application

The **frontend** is the only service with a public LoadBalancer IP. The browser connects to the frontend, which proxies all `/api/*` requests to the backend internally. All other services are `ClusterIP` and accessed via `kubectl port-forward`:

```bash
# Get the frontend external IP
kubectl get svc frontend -n oranje-markt
```

| Service | How to Access | Notes |
|---------|--------------|-------|
| **Frontend** | `http://<FRONTEND_EXTERNAL_IP>` | LoadBalancer on port 80 — browse products, add to cart, checkout |
| **Backend API** | `kubectl port-forward svc/backend -n oranje-markt 4000:4000` → `http://localhost:4000` | Direct access for debugging; try `/api/health` |
| **Grafana** | `kubectl port-forward svc/grafana -n oranje-markt 3001:3001` → `http://localhost:3001` | Dashboards for App, DB, Frontend, and Infra metrics (login: `admin`/`admin`) |
| **Prometheus** | `kubectl port-forward svc/prometheus -n oranje-markt 9090:9090` → `http://localhost:9090` | Query metrics directly |

> **Note:** Use `http://`, not `https://` — there is no TLS configured.

> **Important:** Each `kubectl port-forward` command is a **blocking process** that runs in the foreground — it occupies the terminal until you stop it (`Ctrl+C`). To port-forward multiple services simultaneously, you need to **open a separate terminal for each one**. For example, if you want Grafana and Prometheus available at the same time, run each command in its own terminal window/tab.

You're ready — start with **Lab 1!**

## Tips

- Always define your **steady state** before injecting chaos.
- Form a **hypothesis** before each experiment.
- Use Grafana dashboards to observe the impact.
- Don't forget to **restore the environment** between experiments.
