# Lab 3 — AI-Driven Resilience Improvement: Solutions Walkthrough

> **App:** Oranje Markt on AKS · **Namespace:** `oranje-markt`
>
> | Component  | Tech        | Deployment/StatefulSet | Port  | Health          |
> |------------|-------------|------------------------|-------|-----------------|
> | Backend    | Express     | `backend`              | :4000 | `/api/health`   |
> | Frontend   | Next.js     | `frontend`             | :3000 | —               |
> | PostgreSQL | PostgreSQL  | `postgres` (SS)        | :5432 | —               |
>
> **Starting state:** single replicas, no PDBs, no HPA, basic probes only.
>
> **AI tools used:** GitHub Copilot (Chat / Agent Mode) with the repo as context.

---

## Solution 1 — From Experiments to Improvements: AI Resilience Analysis

**Goal:** Feed experiment findings + the full repo to AI → get a prioritized cross-layer resilience roadmap.

### Step 1: Open the repo with Copilot

Everything the AI needs is in the repository — no need to export YAMLs from the cluster:

- **Kubernetes manifests:** `infra/k8s/` (backend, frontend, postgres deployments, services, observability stack)
- **Backend source code:** `backend/src/` (Express server, routes, middleware, Prisma client, health endpoint)
- **Frontend source code:** `frontend/src/` (Next.js app, API client, components)
- **Infrastructure-as-Code:** `infra/azure/` (Bicep templates for AKS, networking, ACR)
- **Observability config:** `infra/observability/` (Prometheus scrape config, Grafana dashboards, Loki setup)
- **Database schema:** `backend/prisma/schema.prisma`

### Step 2: Prompt Copilot for a cross-layer resilience assessment

Use **Agent Mode** or **Copilot Chat** with the repo open. Combine repo context with experiment findings:

```text
Look at this repository — it contains a 3-tier application (Next.js frontend, Express backend, PostgreSQL) deployed on AKS.
Review the Kubernetes manifests in infra/k8s/, the backend code in backend/src/, the frontend code in frontend/src/, and the observability setup in infra/observability/.

We ran chaos experiments and found these issues:
1. Killing a backend pod causes ~30s downtime (single replica)
2. Killing the database pod causes cascading failure — backend's liveness probe restarts it too
3. Node drain evicts all pods simultaneously (no PDBs)
4. Load test with 5 clients saturates backend CPU at 500m limit

Based on the actual source code and infrastructure config, what are the top resilience improvements?
Organize by layer: Kubernetes, Infrastructure, Observability, and Application Code.
Prioritize by impact and effort.
```

### Expected AI output

The AI should produce a structured roadmap like this (your results may vary):

| Layer | Improvement | Impact | Effort |
|-------|-------------|--------|--------|
| **Kubernetes** | Increase replicas to 3 + add PodDisruptionBudget | High — eliminates single-pod downtime | Low |
| **Kubernetes** | Add HorizontalPodAutoscaler | High — handles load spikes automatically | Low |
| **Kubernetes** | Add topology spread constraints | Medium — distributes pods across nodes | Low |
| **Infrastructure** | Database backup CronJob | High — enables data recovery | Medium |
| **Observability** | Add Prometheus alerting rules for error rate & pod restarts | High — proactive failure detection | Medium |
| **Observability** | Persistent storage for Prometheus/Loki (PVC instead of EmptyDir) | Medium — retain metrics across restarts | Medium |
| **Code** | Add retry logic with backoff to database queries | High — handles transient failures | Medium |
| **Code** | Separate liveness from readiness probe (don't check DB in liveness) | High — prevents cascading restart | Low |
| **Code** | Add graceful shutdown handler (SIGTERM) | Medium — drain in-flight requests | Low |

### Key insight

The AI identifies improvements across **all layers** — K8s (replicas, PDB), infrastructure (backups), observability (alerting), and code (retries, circuit breakers). Resilience is a cross-cutting concern.

### Discussion Answer

How to prioritize: start with **high impact + low effort** items (replicas, PDB, topology spread) — these are K8s-only changes that don't require code changes or new infrastructure. Then move to **high impact + medium effort** (alerting rules, backups, retry logic). The AI's prioritization should roughly match engineering intuition from running the experiments.

---

## Solution 2 — Implement Quick Wins with AI

**Goal:** Pick 1-2 improvements and use AI to generate & apply them.

### Option A: Replicas + PDB (Recommended First Pick)

This is the highest-impact, lowest-effort improvement.

#### Prompt Copilot:

```text
Look at the backend deployment in infra/k8s/backend/ and improve it:
1. Increase to 3 replicas
2. Add topology spread constraints to distribute across nodes
3. Add a PodDisruptionBudget with minAvailable: 1
4. Add a startup probe (the init container db-migrate adds ~20s delay)
5. Create a HorizontalPodAutoscaler with min 2, max 5 replicas targeting 70% CPU
```

**Expected:** Copilot generates a multi-document YAML with the Deployment, PDB, and HPA. The reference solution is in [`manifests/01-backend-hardened.yaml`](manifests/01-backend-hardened.yaml).

#### Apply the hardened backend:

```bash
kubectl apply -f labs/lab3-ai-driven-resilience/solutions/manifests/01-backend-hardened.yaml
```

#### Repeat for the frontend:

Use the same approach, or apply the reference solution directly:

```bash
kubectl apply -f labs/lab3-ai-driven-resilience/solutions/manifests/02-frontend-hardened.yaml
```

#### Verify:

```bash
kubectl get pods -n oranje-markt -o wide         # 3 backend + 3 frontend pods, spread across nodes
kubectl get pdb -n oranje-markt                   # PDBs showing ALLOWED DISRUPTIONS: 2
kubectl get hpa -n oranje-markt                   # HPAs showing CPU targets
```

### Option B: Harden the Database (PDB + Backup CronJob)

#### Prompt Copilot:

```text
Look at the PostgreSQL StatefulSet in infra/k8s/postgres/ and the database schema in backend/prisma/schema.prisma.
This is a single-pod database with no replication. Please provide:
1. A PodDisruptionBudget to prevent accidental eviction during node drains
2. A CronJob that runs pg_dump every hour for backups
```

**Expected:** Copilot generates a PDB + CronJob. The reference solution is in [`manifests/03-postgres-pdb.yaml`](manifests/03-postgres-pdb.yaml).

#### Apply and verify:

```bash
kubectl apply -f labs/lab3-ai-driven-resilience/solutions/manifests/03-postgres-pdb.yaml
kubectl get pdb -n oranje-markt    # postgres-pdb: ALLOWED DISRUPTIONS: 0 (fully protected)

# Test the backup
kubectl create job --from=cronjob/postgres-backup manual-backup -n oranje-markt
kubectl logs -n oranje-markt -l job-name=manual-backup    # "Backup completed: ..."
kubectl delete job manual-backup -n oranje-markt
```

**Note:** The PDB on a single-replica StatefulSet shows `ALLOWED DISRUPTIONS: 0` — this means node drains will **block**, protecting your database from accidental eviction.

### Option C: Prometheus Alerting Rules

#### Prompt Copilot:

```text
Based on these chaos experiment findings [pod failures, DB cascading failure, CPU saturation],
generate Prometheus alerting rules that would detect these issues.
Look at the metrics middleware in backend/src/middleware/metrics.ts and the Prometheus config
in infra/observability/ to understand what metrics are available.
```

**Expected:** Copilot generates alerting rules for high error rate, pod restart loops, CPU saturation, and database connection failures using the actual metric names from the codebase (`http_requests_total`, `http_request_duration_seconds`, `db_query_duration_seconds`).

### Option D: Code-Level Improvements (Advanced)

#### Prompt Copilot:

```text
Look at the Prisma database client in backend/src/lib/prisma.ts.
Add retry logic with exponential backoff for transient database failures.
```

Or:

```text
Look at the health endpoint in backend/src/server.ts — it's used for both liveness and readiness
probes, and it queries the database. When the database is down, Kubernetes kills the backend pod
too (cascading failure). How should I separate liveness from readiness to prevent this?
```

**Expected:** For the health endpoint separation, Copilot should suggest:
- **Readiness probe** → `/api/health` (checks DB connectivity — gates traffic)
- **Liveness probe** → `/api/livez` (simple 200 OK — only checks process is alive, does NOT check DB)

This prevents the cascading restart discovered in Lab 2: when the DB is down, backend stays alive (liveness passes) but stops receiving traffic (readiness fails).

---

## Solution 3 — Validate: Re-run Chaos Experiments

**Goal:** Prove improvements work by re-running Lab 1 experiments and comparing before/after.

### Validate replicas + PDB (if Option A was implemented)

#### Test 1: Kill a backend pod

```bash
# Before (Lab 1): single pod → ~30s full outage
# After (Lab 3): 3 replicas → expect zero downtime

kubectl delete pod -n oranje-markt -l app=backend --wait=false
kubectl get pods -n oranje-markt -l app=backend -w
```

**Expected:** With 3 replicas, killing 1 pod leaves 2 still running — **zero downtime**. The deleted pod is automatically replaced by the ReplicaSet controller.

#### Test 2: Drain a node

```powershell
$NODE = kubectl get pods -n oranje-markt -l app=backend -o jsonpath='{.items[0].spec.nodeName}'
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data
```

**Expected:** The PDB prevents all backend pods from being evicted simultaneously. The drain proceeds one pod at a time, maintaining availability.

```bash
kubectl uncordon $NODE
```

#### Test 3: PDB blocks database eviction (if Option B was implemented)

```powershell
$NODE = kubectl get pod postgres-0 -n oranje-markt -o jsonpath='{.spec.nodeName}'
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --timeout=30s
```

**Expected:** The drain **blocks** — evicting `postgres-0` would violate the PDB (`minAvailable: 1` with only 1 pod).

```bash
kubectl uncordon $NODE
```

### Compare before/after

Ask Copilot to help summarize:

```text
Compare these two chaos experiment results:
Before (1 replica, no PDB): Killing backend pod → 30s complete outage, 0 pods serving traffic during recovery
After (3 replicas, PDB): Killing backend pod → [paste your observations]
Produce a brief before/after comparison.
```

### Expected comparison table

| Experiment | Before (Lab 1) | After (Lab 3) | Improvement |
|-----------|----------------|---------------|-------------|
| Kill backend pod | ~30s full outage | Zero downtime (2 pods still serve) | ✅ Eliminated |
| Drain a node | All pods evicted simultaneously | PDB ensures 1+ pod always available | ✅ Protected |
| Kill postgres-0 | Cascading backend restart | PDB blocks drain; backend stays up (if health separated) | ✅ Protected |
| Load test (5 clients) | CPU saturates at 500m | HPA scales to handle load | ✅ Auto-scaled |

---

## Solution 4 — Cleanup & Final State

### Option A: Keep the hardened state (recommended for review)

```bash
kubectl get deployments -n oranje-markt
kubectl get pdb -n oranje-markt
kubectl get hpa -n oranje-markt
```

### Option B: Restore to original (fragile) state

```bash
kubectl apply -f infra/k8s/backend/deployment.yaml
kubectl apply -f infra/k8s/frontend/deployment.yaml
kubectl delete pdb -n oranje-markt --all
kubectl delete hpa -n oranje-markt --all
kubectl delete cronjob postgres-backup -n oranje-markt --ignore-not-found
kubectl delete pdb postgres-pdb -n oranje-markt --ignore-not-found
```

### Final Comparison Table

| Aspect | Before (Lab 1) | After (Lab 3) |
|--------|----------------|---------------|
| Backend replicas | 1 | 3 (HPA: 2–5) |
| Frontend replicas | 1 | 3 (HPA: 2–5) |
| Pod Disruption Budgets | None | Backend, Frontend, PostgreSQL |
| Probes | Readiness + Liveness only | Startup + Readiness + Liveness |
| Topology spread | None | Across nodes |
| Database backups | None | Hourly `pg_dump` CronJob |
| Pod kill downtime | ~30s full outage | Zero downtime |
| Node drain safety | All pods evicted | PDB-protected eviction |

---

## Reference Files

The `manifests/` and `scripts/` directories contain ready-to-use reference solutions:

| File | Description |
|------|-------------|
| [`manifests/01-backend-hardened.yaml`](manifests/01-backend-hardened.yaml) | Backend: 3 replicas, topology spread, PDB, HPA, all probes |
| [`manifests/02-frontend-hardened.yaml`](manifests/02-frontend-hardened.yaml) | Frontend: 3 replicas, topology spread, PDB, HPA, all probes |
| [`manifests/03-postgres-pdb.yaml`](manifests/03-postgres-pdb.yaml) | PostgreSQL PDB + hourly backup CronJob |
| [`scripts/detect-anomalies.sh`](scripts/detect-anomalies.sh) | Bash script for automated anomaly detection (5 checks) |
| [`scripts/runbook.md`](scripts/runbook.md) | Resilience runbook for 5 failure scenarios |

> **Note:** The detection script and runbook are included as bonus reference material. They demonstrate additional improvements the AI roadmap might suggest beyond K8s manifests.

### Key Takeaways

1. **AI + repo context = comprehensive analysis** — Pointing Copilot at the full repo (code, manifests, observability config) produces better recommendations than pasting individual YAMLs.
2. **Start with quick wins** — Replicas + PDB eliminates the most common failure mode (single-pod outage) with minimal effort and zero code changes.
3. **All layers matter** — The AI roadmap shows resilience spans K8s, infrastructure, observability, and code — but you don't have to fix everything at once.
4. **Validate with chaos** — Re-running Lab 1 experiments after hardening produces measurable before/after proof.
5. **The loop closes** — Chaos engineering: break → learn → improve → validate → repeat.
