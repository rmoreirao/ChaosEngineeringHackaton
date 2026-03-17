# Azure Architecture — Oranje Markt (Chaos Engineering Hackathon)

This document describes the proposed Azure architecture for deploying the Oranje Markt application to **Azure Kubernetes Service (AKS)**. The architecture is intentionally kept simple and **not fully resilient** — it serves as a starting point for the Chaos Engineering Hackathon, giving teams clear areas to improve.

## Architecture Overview

```
                        ┌──────────────────────────────────────────────────────┐
                        │              Azure Resource Group                    │
                        │              (rg-devai-hackathon)                    │
                        │                                                      │
  Users ──► Internet    │  ┌────────────────────────────────────────────────┐  │
       │                │  │         AKS Cluster (single node pool)         │  │
       │                │  │         Namespace: oranje-markt                │  │
       │                │  │                                                │  │
       │   LoadBalancer │  │  ┌────────────┐  HTTP   ┌────────────┐        │  │
       └───────────────►│  │  │  Frontend  │◄──────►│  Backend   │        │  │
                        │  │  │  (Next.js) │        │ (Express)  │        │  │
                        │  │  │  :3000     │        │  :4000     │        │  │
                        │  │  └────────────┘        └─────┬──────┘        │  │
                        │  │                              │               │  │
                        │  │                              ▼               │  │
                        │  │                       ┌────────────┐         │  │
                        │  │                       │ PostgreSQL │         │  │
                        │  │                       │ StatefulSet│         │  │
                        │  │                       │  :5432     │         │  │
                        │  │                       └────────────┘         │  │
                        │  │                                                │  │
                        │  │  ┌──────────────────────────────────────────┐ │  │
                        │  │  │           Observability (in-cluster)     │ │  │
                        │  │  │  Prometheus (:9090)  → Grafana (:3001)  │ │  │
                        │  │  │  Loki (:3100)        → Promtail (DS)    │ │  │
                        │  │  │  Postgres-Exporter (:9187)              │ │  │
                        │  │  └──────────────────────────────────────────┘ │  │
                        │  └────────────────────────────────────────────────┘  │
                        │                                                      │
                        │  ┌──────────────┐   ┌───────────────────────┐       │
                        │  │    VNet       │   │   Managed Identity    │       │
                        │  │  10.0.0.0/16 │   │   (AKS ↔ Azure)      │       │
                        │  └──────────────┘   └───────────────────────┘       │
                        │                                                      │
                        │  ┌──────────────┐                                    │
                        │  │     ACR       │                                    │
                        │  │ (Container   │                                    │
                        │  │  Registry)   │                                    │
                        │  └──────────────┘                                    │
                        └──────────────────────────────────────────────────────┘
```

## Azure Resources

### Already deployed by Bicep (`main.bicep`)

| Resource | Module | Purpose |
|----------|--------|---------|
| **Resource Group** | `main.bicep` | Container for all resources |
| **Virtual Network** | `modules/network.bicep` | VNet (10.0.0.0/16) with AKS subnet (10.0.0.0/22) |
| **Managed Identity** | `modules/identity.bicep` | User-assigned identity for AKS to interact with Azure |
| **AKS Cluster** | `modules/aks.bicep` | Kubernetes cluster — 3× Standard_D2s_v3 nodes, Azure CNI, RBAC |

### To add manually

| Resource | Purpose | How |
|----------|---------|-----|
| **Azure Container Registry (ACR)** | Store Docker images for frontend & backend | `az acr create` (see deployment steps below) |

> **Why no Azure Database for PostgreSQL?** Intentionally omitted. PostgreSQL runs as an in-cluster StatefulSet — this is fragile by design, making it a great target for chaos experiments.

## Deployment Steps

### Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and authenticated (`az login`)
- `kubectl` installed (`az aks install-cli`)
- Docker installed (for building images)

### 1. Deploy Azure infrastructure (Bicep)

```bash
# Deploy from the infra/azure directory
az deployment sub create \
  --location westeurope \
  --template-file main.bicep \
  --parameters main.bicepparam
```

This creates: Resource Group, VNet, Managed Identity, and AKS Cluster.

### 2. Create Azure Container Registry

```bash
# Create ACR (Basic SKU — cheapest option)
az acr create \
  --resource-group rg-devai-hackathon \
  --name devaiHackathonAcr \
  --sku Basic

# Attach ACR to AKS (grants AKS pull permissions)
az aks update \
  --resource-group rg-devai-hackathon \
  --name devai-hackathon-aks \
  --attach-acr devaiHackathonAcr
```

### 3. Build and push Docker images

```bash
# Build and push backend
az acr build \
  --registry devaiHackathonAcr \
  --image oranje-markt-backend:latest \
  --file backend/Dockerfile \
  backend/

# Build and push frontend
az acr build \
  --registry devaiHackathonAcr \
  --image oranje-markt-frontend:latest \
  --file frontend/Dockerfile \
  frontend/
```

### 4. Get AKS credentials

```bash
az aks get-credentials \
  --resource-group rg-devai-hackathon \
  --name devai-hackathon-aks
```

### 5. Deploy application to AKS

Before applying, update the image references in the K8s manifests to use your ACR:

```bash
# Replace local image references with ACR references
# In infra/k8s/backend/deployment.yaml:  image: devaiHackathonAcr.azurecr.io/oranje-markt-backend:latest
# In infra/k8s/frontend/deployment.yaml: image: devaiHackathonAcr.azurecr.io/oranje-markt-frontend:latest
```

Then apply the manifests:

```bash
# Create namespace
kubectl apply -f infra/k8s/namespace.yaml

# Deploy PostgreSQL (in-cluster)
kubectl apply -f infra/k8s/postgres/

# Deploy backend
kubectl apply -f infra/k8s/backend/

# Deploy frontend
kubectl apply -f infra/k8s/frontend/

# Deploy observability stack
kubectl apply -f infra/k8s/observability/prometheus/
kubectl apply -f infra/k8s/observability/grafana/
kubectl apply -f infra/k8s/observability/loki/
kubectl apply -f infra/k8s/observability/promtail/
kubectl apply -f infra/k8s/observability/postgres-exporter/
```

### 6. Expose the frontend

```bash
# Expose frontend via Azure Load Balancer
kubectl expose deployment frontend \
  --type=LoadBalancer \
  --port=80 \
  --target-port=3000 \
  --name=frontend-lb \
  -n oranje-markt

# Get the external IP (may take 1-2 minutes)
kubectl get svc frontend-lb -n oranje-markt -w
```

## Intentional Weaknesses (Chaos Engineering Targets)

This architecture has several deliberate weaknesses that make it ideal for chaos engineering experiments:

| Weakness | Impact | Chaos Experiment |
|----------|--------|------------------|
| **In-cluster PostgreSQL** | Single pod, no replication, data on PVC | Kill the postgres pod → total data loss, app downtime |
| **Single replicas** | Frontend and backend each run 1 pod | Kill any pod → service unavailable until restart |
| **No health-check tuning** | Default probe timings may be slow | Slow responses → cascading failures not detected fast |
| **No pod disruption budgets** | Node drain removes all pods at once | Drain a node → all services go down simultaneously |
| **No resource quotas** | Pods can consume unlimited cluster resources | Memory leak → one pod evicts others (noisy neighbor) |
| **No network policies** | All pods can talk to all pods | Compromise one pod → lateral movement across namespace |
| **No auto-scaling** | Fixed 3 nodes, fixed replica count | Traffic spike → pods OOMKilled, requests dropped |
| **No zone redundancy** | All nodes in the same availability zone | Zone failure → entire cluster unavailable |
| **No backup / DR** | No PostgreSQL backups, no PV snapshots | Data corruption → no recovery path |
| **LoadBalancer only** | No rate limiting, no WAF, no circuit breaker | DDoS or bad request flood → backend overwhelmed |
| **Observability in-cluster** | Prometheus & Grafana run in same cluster | Cluster crash → lose monitoring when you need it most |

## Evolution Roadmap

As teams complete chaos experiments, they can harden the architecture:

### Phase 1 — Basic Resilience
- [ ] Increase frontend and backend to **2+ replicas**
- [ ] Add **PodDisruptionBudgets** to prevent full outages during node drains
- [ ] Tune **liveness/readiness probes** (faster failure detection)
- [ ] Set **resource requests and limits** on all pods

### Phase 2 — Data Resilience
- [ ] Migrate PostgreSQL to **Azure Database for PostgreSQL Flexible Server**
- [ ] Enable **automated backups** and point-in-time restore
- [ ] Add **connection pooling** (PgBouncer sidecar or built-in)

### Phase 3 — Network & Security
- [ ] Add **Kubernetes NetworkPolicies** (restrict pod-to-pod traffic)
- [ ] Deploy **NGINX Ingress Controller** with rate limiting
- [ ] Enable **Azure Private Endpoints** for ACR and PostgreSQL
- [ ] Add **Azure Key Vault** for secrets management

### Phase 4 — Scalability & Availability
- [ ] Enable **Horizontal Pod Autoscaler** (HPA) on frontend and backend
- [ ] Enable **Cluster Autoscaler** on the AKS node pool
- [ ] Spread nodes across **Availability Zones**
- [ ] Add a **user node pool** to separate workloads from system pods

### Phase 5 — Enterprise Observability
- [ ] Move monitoring to **Azure Monitor + Container Insights**
- [ ] Use **Azure Managed Grafana** (managed, always-available dashboards)
- [ ] Ship logs to **Azure Log Analytics** instead of in-cluster Loki

## Costs & Cleanup

### Estimated monthly cost (minimal config)

| Resource | SKU | Approx. Cost |
|----------|-----|-------------|
| AKS (3× Standard_D2s_v3) | Pay-as-you-go | ~€280/mo |
| ACR | Basic | ~€5/mo |
| VNet / Load Balancer | Standard | ~€20/mo |
| **Total** | | **~€305/mo** |

> **Tip**: Scale down to 1 node (`az aks scale --node-count 1 ...`) when not actively using the cluster.

### Cleanup

```bash
# Delete everything (Resource Group + all resources inside)
az group delete --name rg-devai-hackathon --yes --no-wait
```

## Multi-Team Deployment (Hackathon)

For the hackathon, each team gets a fully independent environment. Use the automated scripts to deploy and tear down all teams at once.

### Configuration

Edit `teams.json` to define teams and shared defaults:

```json
{
  "teams": [
    { "name": "team-alpha" },
    { "name": "team-bravo" },
    { "name": "team-charlie" }
  ],
  "defaults": {
    "location": "germanywestcentral",
    "kubernetesVersion": "1.34",
    "systemNodeVmSize": "Standard_D2s_v3",
    "systemNodeCount": 3
  }
}
```

Each team name generates isolated Azure resources:

| Resource | Naming Pattern | Example (`team-alpha`) |
|----------|---------------|------------------------|
| Resource Group | `rg-{name}` | `rg-team-alpha` |
| AKS Cluster | `{name}-aks` | `team-alpha-aks` |
| ACR | `{name}acr` (no hyphens) | `teamalphaacr` |
| VNet | `{name}-vnet` | `team-alpha-vnet` |
| Managed Identity | `{name}-aks-identity` | `team-alpha-aks-identity` |

### Deploy all teams

```powershell
cd infra/azure
.\deploy-teams.ps1
```

Deploy a single team:

```powershell
.\deploy-teams.ps1 -TeamName "team-alpha"
```

The script outputs a summary table with each team's frontend URL and saves it to `deployment-summary.json`.

### Tear down all teams

```powershell
.\teardown-teams.ps1           # prompts for confirmation
.\teardown-teams.ps1 -Force    # skip confirmation
.\teardown-teams.ps1 -TeamName "team-alpha"  # single team
```

## File Reference

```
infra/azure/
├── README.md              ← this file
├── teams.json             ← team definitions for multi-team deploy
├── deploy-teams.ps1       ← deploy all teams (PowerShell)
├── teardown-teams.ps1     ← tear down all teams (PowerShell)
├── main.bicep             ← orchestrator (subscription-level deployment)
├── main.bicepparam        ← parameter values (single-team reference)
├── main.json              ← compiled ARM template
└── modules/
    ├── acr.bicep          ← Azure Container Registry
    ├── aks.bicep          ← AKS cluster + system node pool
    ├── identity.bicep     ← user-assigned managed identity
    └── network.bicep      ← VNet + AKS subnet
```
