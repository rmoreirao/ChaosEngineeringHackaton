# Chaos Engineering Workshop — Hands-on Labs

## Overview

Three labs progressing from manual chaos to AI-driven experiments to resilience improvements. You'll break the **Oranje Markt** application running on AKS, observe what happens, and then fix it — all within ~3 hours.

The system is intentionally fragile. Your job is to find out exactly how fragile.

## Labs

| Lab | Topic | Duration | Description |
|-----|-------|----------|-------------|
| [Lab 1](lab1-manual-chaos/) | Manual Chaos Experiments | ~60 min | Inject failures into Kubernetes microservices and observe results |
| [Lab 2](lab2-ai-driven-chaos/) | AI-Driven Chaos Experiments | ~45 min | Use AI tools to generate chaos experiments and diagnose failures |
| [Lab 3](lab3-ai-driven-resilience/) | AI-Driven Resilience Improvement | ~15 min | Use AI tools to investigate failures and improve resilience |

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

- AKS cluster deployed and running (see [`infra/azure/README.md`](../infra/azure/README.md))
- `kubectl` connected to the cluster (`az aks get-credentials`)
- `kubelogin` configured (`kubelogin convert-kubeconfig -l azurecli`)
- Oranje Markt application deployed (see [`infra/k8s/deploy.sh`](../infra/k8s/deploy.sh))
- Observability stack deployed — Prometheus, Grafana, Loki (see [`infra/k8s/observability/`](../infra/k8s/observability/))
- GitHub Copilot extension installed in VS Code
- GitHub Copilot CLI installed (`gh extension install github/gh-copilot`)
- Azure CLI (`az`) installed and authenticated

## Application Architecture

```
Users → LoadBalancer → Frontend (Next.js :3000) → Backend (Express :4000) → PostgreSQL (:5432)
                                                                        ↓
                                                Observability: Prometheus, Grafana, Loki
```

| Component | Details |
|-----------|---------|
| **Frontend** | Next.js, 1 replica, namespace `oranje-markt` |
| **Backend** | Express + Prisma ORM, 1 replica, namespace `oranje-markt` |
| **Database** | PostgreSQL 16, StatefulSet, 1 replica, PVC-backed |
| **Observability** | Prometheus, Grafana (`:3001`), Loki + Promtail |

All components have basic health probes configured.

## Intentional Weaknesses (Your Targets!)

| Weakness | Impact | Chaos Experiment Target |
|----------|--------|------------------------|
| Single replicas | Pod kill = service down | Lab 1 |
| In-cluster PostgreSQL | No replication, single point of failure | Lab 1 |
| No Pod Disruption Budgets | Node drain kills everything | Lab 1, Lab 3 |
| No autoscaling | Load spikes cause OOM/crashes | Lab 1, Lab 3 |
| No network policies | Lateral movement possible | Lab 3 |
| Basic health probes | Slow failure detection | Lab 3 |
| Observability in-cluster | Lose monitoring during cluster issues | Lab 1 |

## Quick Start

```bash
# 1. Verify cluster access
kubectl get nodes

# 2. Verify the app is running
kubectl get pods -n oranje-markt

# 3. Get the frontend URL
kubectl get svc -n oranje-markt

# 4. Access Grafana (port-forward)
kubectl port-forward svc/grafana -n oranje-markt 3001:3001

# 5. Start Lab 1!
```

## Tips

- Always define your **steady state** before injecting chaos.
- Form a **hypothesis** before each experiment.
- Use Grafana dashboards to observe the impact.
- Don't forget to **restore the environment** between experiments.
- Use `kubectl get events -n oranje-markt --sort-by='.lastTimestamp'` to track changes.
- GitHub Copilot CLI: `gh copilot suggest` and `gh copilot explain` are your friends.
