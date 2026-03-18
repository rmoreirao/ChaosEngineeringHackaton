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
> **AI tools used:** GitHub Copilot (Chat) and GitHub Copilot CLI (`gh copilot suggest / explain`).

---

## Solution 1 — Generate Resilience Improvements with AI

**Goal:** Use Copilot to transform a fragile single-replica deployment into a production-ready setup with replicas, probes, PDBs, and autoscaling.

### Step 1: Export the current deployment YAML

```bash
kubectl get deployment backend -n oranje-markt -o yaml > backend-current.yaml
```

### Step 2: Ask Copilot to harden the deployment

Paste the YAML into **Copilot Chat** and use this prompt:

```text
I have this backend deployment running 1 replica on AKS. Please:
1. Increase to 3 replicas
2. Add topology spread constraints to distribute across nodes
3. Add a PodDisruptionBudget with minAvailable: 1
4. Add a startup probe (the app needs ~15s to start)
5. Create a HorizontalPodAutoscaler with min 2, max 5 replicas targeting 70% CPU
```

**Expected response:** Copilot generates a multi-document YAML containing:

- A **Deployment** with `replicas: 3`, `topologySpreadConstraints`, and all three probe types (startup, readiness, liveness).
- A **PodDisruptionBudget** with `minAvailable: 1`.
- A **HorizontalPodAutoscaler** with `minReplicas: 2`, `maxReplicas: 5`, and `targetCPUUtilizationPercentage: 70`.

The reference solution is in `labs/lab3-ai-driven-resilience/solutions/manifests/01-backend-hardened.yaml`.

### Step 3: Apply the hardened backend

```bash
kubectl apply -f labs/lab3-ai-driven-resilience/solutions/manifests/01-backend-hardened.yaml
```

### Step 4: Apply the hardened frontend

Repeat the same Copilot approach for the frontend, or use the provided solution directly:

```bash
kubectl apply -f labs/lab3-ai-driven-resilience/solutions/manifests/02-frontend-hardened.yaml
```

### Step 5: Verify the new state

```bash
kubectl get pods -n oranje-markt -o wide
kubectl get pdb -n oranje-markt
kubectl get hpa -n oranje-markt
```

**Expected output:**

- 3 backend pods and 3 frontend pods spread across different nodes.
- PDBs showing `ALLOWED DISRUPTIONS: 2` (3 pods − minAvailable 1 = 2 allowed).
- HPAs showing CPU targets and current utilization.

### Step 6: Validate — re-run Lab 1 Challenge 2 (kill a pod)

```bash
kubectl delete pod -n oranje-markt -l app=backend --wait=false
kubectl get pods -n oranje-markt -l app=backend -w
```

**Expected:** With 3 replicas, killing 1 pod leaves 2 still running — **zero downtime**. The deleted pod is automatically replaced by the ReplicaSet controller.

### Step 7: Validate — re-run Lab 1 Challenge 5 (drain a node)

```powershell
$NODE = kubectl get pods -n oranje-markt -l app=backend -o jsonpath='{.items[0].spec.nodeName}'
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data
```

**Expected:** The PDB prevents all backend pods from being evicted simultaneously. The drain proceeds one pod at a time, maintaining availability.

```bash
kubectl uncordon $NODE
```

### Discussion Answer

A minimum production deployment should include:

| Aspect | Requirement |
|--------|-------------|
| Replicas | 2+ (never run a single replica in production) |
| PDB | `minAvailable` or `maxUnavailable` to survive drains/upgrades |
| Probes | All 3 types: **startup** (slow init), **readiness** (traffic gating), **liveness** (deadlock recovery) |
| Resources | Both `requests` (scheduling) and `limits` (protection) |
| Topology | `topologySpreadConstraints` to spread across nodes/zones |

**`minAvailable` vs `maxUnavailable`:**

- `minAvailable: 2` → "always keep at least 2 pods running" (good when you know minimum capacity).
- `maxUnavailable: 1` → "allow at most 1 pod to be down" (good for percentage-based rules).
- For 3 replicas: `minAvailable: 2` ≡ `maxUnavailable: 1`.

---

## Solution 2 — Harden the Database

**Goal:** Protect the PostgreSQL StatefulSet from accidental disruption and add backup capability.

### Step 1: Export the current PostgreSQL spec

```bash
kubectl get statefulset postgres -n oranje-markt -o yaml > postgres-current.yaml
```

### Step 2: Ask Copilot for database hardening advice

Prompt:

```text
I have a PostgreSQL StatefulSet running as a single pod with a PVC on AKS.
How can I make it more resilient? Please provide:
1. A PodDisruptionBudget to prevent accidental eviction during node drains
2. A CronJob that runs pg_dump every hour for backups
3. A discussion of when to migrate to Azure Database for PostgreSQL
```

**Expected response:** Copilot generates a PDB with `minAvailable: 1` and a CronJob that mounts the same PVC or connects to the postgres service to run `pg_dump`.

### Step 3: Apply the PDB + backup CronJob

```bash
kubectl apply -f labs/lab3-ai-driven-resilience/solutions/manifests/03-postgres-pdb.yaml
```

### Step 4: Verify the PDB

```bash
kubectl get pdb -n oranje-markt
```

**Expected:** `postgres-pdb` shows `MIN AVAILABLE: 1` and `ALLOWED DISRUPTIONS: 0` (only 1 pod exists, so zero disruptions are permitted — the database is fully protected).

### Step 5: Test the PDB — try to drain the postgres node

```powershell
$NODE = kubectl get pod postgres-0 -n oranje-markt -o jsonpath='{.spec.nodeName}'
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --timeout=30s
```

**Expected:** The drain **blocks** because evicting `postgres-0` would violate the PDB (`minAvailable: 1` with only 1 pod). This protects your database from accidental eviction!

```bash
kubectl uncordon $NODE
```

### Step 6: Test the backup CronJob

```bash
# Trigger a manual backup run
kubectl create job --from=cronjob/postgres-backup manual-backup -n oranje-markt

# Watch the job complete
kubectl get jobs -n oranje-markt -w

# Check the backup log
kubectl logs -n oranje-markt -l job-name=manual-backup
```

**Expected output:** `Backup completed: /backups/oranjedb-YYYYMMDD-HHMMSS.sql`

### Step 7: Clean up the test job

```bash
kubectl delete job manual-backup -n oranje-markt
```

### Discussion Answer

**Kubernetes DB vs. Managed Service trade-offs:**

| Aspect | In-Cluster (StatefulSet) | Managed (Azure DB for PostgreSQL) |
|--------|--------------------------|-----------------------------------|
| HA | Manual (replicas, failover) | Built-in (zone-redundant) |
| Backups | Manual (CronJob / Velero) | Automated + point-in-time recovery |
| Patching | Your responsibility | Automated |
| Cost | Lower compute cost | Higher, but less operational burden |
| Control | Full control | Limited to service configuration |
| Latency | In-cluster (fast) | Network hop (slightly higher) |

**Recommendation:** For **production**, almost always use a managed service — the operational burden of running a database in Kubernetes is significant. **In-cluster** is perfectly fine for dev/test environments and workshops like this one.

---

## Solution 3 — Build a Simple Detection Script

**Goal:** Create an automated anomaly detection script using Copilot, then validate it against real failures.

### Step 1: Ask Copilot CLI to generate the script

```bash
gh copilot suggest -t shell "Write a bash script that checks all pods in namespace oranje-markt for: non-Running status, restart counts over 3, unready containers, empty service endpoints, and recent warning events"
```

**Expected:** Copilot CLI suggests a shell script with `kubectl get pods`, `kubectl get endpoints`, and `kubectl get events` commands piped through `awk`/`grep` to detect anomalies.

### Step 2: Use the pre-built script

The reference solution is ready to use:

```bash
chmod +x labs/lab3-ai-driven-resilience/solutions/scripts/detect-anomalies.sh
bash labs/lab3-ai-driven-resilience/solutions/scripts/detect-anomalies.sh
```

### Step 3: Test with a healthy cluster

**Expected output:**

```
[OK] All pods are Running
[OK] No pods with excessive restarts
[OK] All running pods are ready
[OK] Service 'backend' — 1 endpoint(s)
[OK] Service 'frontend' — 1 endpoint(s)
[OK] Service 'postgres' — 1 endpoint(s)
[OK] No recent warning events
RESULT: All checks passed ✓
```

### Step 4: Test with a failure — kill a pod and re-run

```bash
kubectl delete pod -n oranje-markt -l app=backend
bash labs/lab3-ai-driven-resilience/solutions/scripts/detect-anomalies.sh
```

**Expected:** The script detects the pod in a non-Running state (e.g., `ContainerCreating` or `Terminating`) or reports reduced endpoint count for the backend service.

### Step 5: Make it continuous (optional)

```bash
watch -n 15 "bash labs/lab3-ai-driven-resilience/solutions/scripts/detect-anomalies.sh"
```

This re-runs the detection every 15 seconds, giving you a live dashboard of cluster health.

### Discussion Answer

**Simple script vs. Prometheus/Grafana alerts:**

| Aspect | Detection Script | Prometheus Alerts |
|--------|-----------------|-------------------|
| Setup | Zero infrastructure | Requires Prometheus + Alertmanager |
| History | None (point-in-time) | Full metrics history |
| Conditions | Simple (status checks) | Complex (rates, percentiles, aggregations) |
| Alerting | Manual / `watch` | Automated (PagerDuty, Slack, email) |
| Best for | Quick checks, debugging, workshops | Production monitoring, SLO tracking |

**Use both:** Simple scripts for quick on-demand health checks and debugging sessions. Prometheus alerts for always-on production monitoring with escalation pipelines.

---

## Solution 4 — Design a Resilience Runbook

**Goal:** Use Copilot to generate a structured runbook covering the 5 most common failure scenarios.

### Step 1: Ask Copilot to generate the runbook

Prompt:

```text
Generate a resilience runbook for a 3-tier application on AKS with these components:
- Frontend (Next.js, deployment name: frontend)
- Backend (Express, deployment name: backend, health endpoint: /api/health)
- PostgreSQL (StatefulSet, pod: postgres-0)
- Namespace: oranje-markt

Cover these failure scenarios:
1. Pod failure (crash, OOMKill)
2. Database failure
3. Node failure
4. High load
5. Deployment failure (bad rollout)

For each scenario provide:
- Detection: How to identify the problem
- Diagnosis: How to determine root cause
- Remediation: Step-by-step commands to fix it
- Verification: How to confirm the fix worked
- Prevention: How to prevent recurrence

Include specific kubectl commands for each step.
```

**Expected response:** Copilot generates a comprehensive runbook with specific `kubectl` commands for each scenario, following the Detection → Diagnosis → Remediation → Verification → Prevention structure.

### Step 2: Review the generated runbook

The reference runbook is at:

```
labs/lab3-ai-driven-resilience/solutions/scripts/runbook.md
```

Review it and adapt to your specific environment (team contacts, escalation paths, SLA targets).

### Step 3: Test a runbook entry — simulate pod failure

Follow the runbook procedure step by step:

```bash
# === Simulate the failure ===
kubectl delete pod -n oranje-markt -l app=backend

# === Detection ===
kubectl get pods -n oranje-markt
kubectl get events -n oranje-markt --field-selector type=Warning --sort-by='.lastTimestamp'

# === Diagnosis ===
kubectl describe pod -n oranje-markt -l app=backend
kubectl logs -n oranje-markt -l app=backend

# === Verification ===
kubectl get pods -n oranje-markt -l app=backend -w
# Wait until all pods show Running/Ready (1/1)
```

**Expected:** By following the runbook, you can systematically detect, diagnose, and verify recovery from the pod failure.

### Discussion Answer

**AI-generated runbooks — strengths and human responsibilities:**

| What AI does well | What humans must do |
|-------------------|---------------------|
| Structure and formatting | Validate commands against YOUR environment |
| Common patterns and best practices | Add domain-specific context (team contacts, escalation) |
| Comprehensive `kubectl` commands | Include SLA requirements and business impact |
| Consistent Detection → Diagnosis → Remediation flow | Keep runbooks updated as architecture changes |
| Quick first draft | **Test every procedure against real failures** |

> ⚠️ **Key insight:** A runbook that has never been tested against a real failure is dangerous — it gives false confidence. Always validate procedures by simulating the failure and following the runbook step by step.

---

## Solution 5 — Cleanup & Final State

### Option A: Keep the hardened state (recommended for review)

```bash
kubectl get deployments -n oranje-markt
kubectl get pdb -n oranje-markt
kubectl get hpa -n oranje-markt
```

Show the team the improvements compared to the starting state.

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
| Detection | Manual `kubectl` | Automated detection script |
| Runbook | None | Documented procedures for 5 scenarios |

### Key Takeaways

1. **AI accelerates resilience engineering** — Copilot can generate hardened manifests, detection scripts, and runbooks in minutes instead of hours.
2. **Always validate AI output** — Review generated YAML for correctness, test scripts against real failures, and verify runbook procedures.
3. **Defense in depth** — Replicas + PDBs + probes + HPA + topology spread work together. No single mechanism is sufficient.
4. **Chaos engineering proves resilience** — Re-running Lab 1 experiments after hardening demonstrates measurable improvement.
5. **Runbooks need maintenance** — Treat runbooks as living documents that evolve with your architecture.
