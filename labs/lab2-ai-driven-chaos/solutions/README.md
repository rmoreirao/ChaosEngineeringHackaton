# Lab 2 — AI-Driven Chaos Experiments: Solutions Walkthrough

> **App:** Oranje Markt on AKS — namespace `oranje-markt`
> **Backend:** Express.js on port 4000, deployment `backend`, health endpoint `/api/health`
> **Frontend:** Next.js on port 3000, deployment `frontend`
> **Database:** PostgreSQL StatefulSet `postgres`, pod `postgres-0`, PVC `postgres-data`
> **Cluster:** Standard_D2s_v3 nodes (2 vCPU, 8 GiB each) — node count may vary by team
> **Observability:** Prometheus, Grafana (port 3001), Loki — all in-cluster
> **AI Tools:** GitHub Copilot (VS Code), GitHub Copilot CLI 

### Known Weaknesses

- Single replicas for all workloads (no redundancy)
- No Pod Disruption Budgets (PDBs)
- No Horizontal Pod Autoscaler (HPA)
- No network policies
- Database runs in-cluster (no managed service)
- Observability stack co-located in the cluster it monitors

---

## Solution 1 — Failure Mode Analysis (Phase 0)

> **Goal:** Use AI to systematically identify what can go wrong in the Oranje Markt architecture before running any experiments.

### Step 1: Gather architecture context

Collect the cluster state so you can feed it to Copilot:

```powershell
kubectl get deployments -n oranje-markt -o yaml > /tmp/deployments.yaml
kubectl get statefulsets -n oranje-markt -o yaml > /tmp/statefulsets.yaml
kubectl get services -n oranje-markt -o yaml > /tmp/services.yaml
kubectl get pods -n oranje-markt -o wide
kubectl top nodes
```

You should see three workloads (backend, frontend, postgres), each running a single pod. Note the node placement — if all pods land on the same node, a single node failure takes down everything.

### Step 2: Ask Copilot for an FMA

Open GitHub Copilot Chat in VS Code and paste the YAML output from Step 1 along with the prompt from the challenge README:

```
I have a 3-tier application on AKS:
- Frontend (Next.js, 1 replica) → Backend (Express, 1 replica) → PostgreSQL (StatefulSet, 1 replica, PVC)
- Observability: Prometheus + Grafana (in-cluster)
- No Pod Disruption Budgets, no autoscaling, no network policies

Here are the deployment YAMLs:
[paste /tmp/deployments.yaml]
[paste /tmp/statefulsets.yaml]
[paste /tmp/services.yaml]

Perform a Failure Mode Analysis. For each failure mode, provide:
- Failure Mode: what can go wrong
- Component: which component is affected
- Impact: what happens to user experience (Critical/High/Medium/Low)
- Probability: how likely (High/Medium/Low)
- Risk Score: Impact × Probability
- Detection: how would we know
- Current Mitigation: what's in place today

Format as a markdown table sorted by risk score (highest first).
```

### Step 3: Example Copilot output — FMA table

Copilot should produce something similar to:

> Here's the Failure Mode Analysis for your Oranje Markt application based on the provided deployment YAMLs:
>
> | # | Failure Mode | Component | Impact | Probability | Risk | Detection | Current Mitigation |
> |---|---|---|---|---|---|---|---|
> | 1 | Backend pod crash / OOMKill | Backend | **Critical** — API completely unavailable, frontend cannot load data | Medium | **High** | Pod status `CrashLoopBackOff`, OOMKilled events, error-rate spike in Grafana | Kubernetes self-healing restarts the pod, but single replica means 30–60 s of full downtime per crash |
> | 2 | Database pod failure | PostgreSQL | **Critical** — all data-dependent endpoints fail (products, orders, auth) | Medium | **High** | Backend logs `ECONNREFUSED :5432`, HTTP 500 responses, pod status changes | StatefulSet controller recreates the pod; PVC preserves data on disk. No replication, so recovery depends on restart speed |
> | 3 | Sustained load spike beyond capacity | All | **High** — degraded latency for all users, eventual 503/504 errors | Medium | **High** | CPU throttling visible in `kubectl top`, increased p99 latency, 5xx error-rate increase in Grafana | Resource limits (500m CPU / 512Mi memory) prevent node-level impact, but no HPA means the single pod absorbs all traffic |
> | 4 | Memory exhaustion (OOM) | Backend | **High** — pod killed mid-request, in-flight requests lost | Medium | **High** | `OOMKilled` in pod events, sudden restart with exit code 137, memory graph spike in Grafana | Memory limit set to 512Mi triggers OOMKill. Kubernetes restarts the pod, but no circuit-breaker protects in-flight work |
> | 5 | Network partition (backend → database) | Backend → PostgreSQL | **Critical** — all database queries fail, API returns 500 | Low | **Medium** | `ECONNREFUSED` or `ETIMEDOUT` in backend logs, 100% error rate on DB-dependent routes | None — no retry logic, no circuit breaker, no connection-pool health checks |
> | 6 | Database PVC deletion or corruption | PostgreSQL | **Critical** — total data loss, application unusable | Low | **Medium** | Pod stuck in `Pending` (no PVC), or postgres fails to start (corruption). No data served | None — no backups configured, no replication. PVC is the single source of truth |
> | 7 | AKS node failure | AKS Node | **High** — all pods on that node go down simultaneously | Low | **Medium** | Node status `NotReady`, pods rescheduled after ~5 minutes, gap in Grafana metrics | AKS auto-repair replaces the node (5–10 min). No PDB means all pods can be evicted at once |
> | 8 | Observability stack failure | Prometheus / Grafana | **Medium** — cannot detect or diagnose other failures (blind spot) | Low | **Low** | No metrics in Grafana dashboards, `port-forward` to Grafana fails, Prometheus pod not running | None — monitoring runs inside the cluster it monitors. A cluster-level issue takes down both the app and its observability |
>
> **Key observations:**
> - The single-replica pattern is the most pervasive risk — it affects backend, frontend, and database
> - The lack of PDBs means even routine operations (node upgrades, spot evictions) cause downtime
> - In-cluster observability creates a dangerous blind spot during cluster-level failures

### Step 4: Review and prioritize

Pick the **top 3 failure modes** to experiment with. A good selection covers different blast radii:

1. **Backend pod crash** (single-component failure, fast recovery expected)
2. **Database pod failure** (stateful component, tests data persistence)
3. **Load spike beyond capacity** (gradual degradation, tests scaling limits)

### Discussion Answer

> **How does FMA differ from traditional risk analysis?**

FMA focuses on **specific failure modes in the actual deployed architecture** — not abstract business risks. A traditional risk register might say "application unavailability" as a risk; an FMA says "single-replica backend pod crash causes 30–60 s of API downtime because the init container adds 15 s of restart latency and the readiness probe has a 10 s initial delay."

Assessing **both impact AND probability** matters because a high-impact but nearly-impossible failure (e.g., simultaneous AZ outage affecting all 3 nodes) may be lower priority than a medium-impact but frequent failure (e.g., OOMKill under normal production load). Chaos engineering time is limited — FMA helps you spend it on the failures most likely to hurt your users.

---

## Solution 2 — Generate Hypotheses (Phase 1)

> **Goal:** Turn the top 3 failure modes from the FMA into testable chaos hypotheses using the "Given / If / Then / Because" format.

### Step 1: Ask Copilot for hypotheses

Paste your top 3 failure modes and the prompt from the challenge:

```
Based on these three failure modes from my FMA:

1. Backend pod crash — single replica, no PDB, init container adds restart latency
2. Database pod failure — single StatefulSet pod with PVC, no replication
3. Load spike — 500m CPU / 512Mi memory limits, no HPA, single pod

Architecture context:
- Backend: Express on :4000, deployment "backend"
- Frontend: Next.js on :3000, deployment "frontend"
- PostgreSQL: StatefulSet "postgres", pod "postgres-0", PVC "postgres-data"
- Namespace: oranje-markt
- Nodes: Standard_D2s_v3 (2 vCPU, 8 GiB each)

For each failure mode, generate a testable chaos hypothesis using this format:
- HYPOTHESIS: "Given [system context], if [failure injection], then [expected behavior], because [reasoning]"
- Experiment: exact kubectl command to inject the failure
- Success criteria: measurable outcome to validate/disprove the hypothesis
- Blast radius: what will be affected
- Rollback: how to undo the experiment
```

### Step 2: Example Copilot output — 3 hypotheses

Copilot should produce something similar to:

> Here are three testable chaos hypotheses for your Oranje Markt application:
>
> ---
>
> ### Hypothesis 1 — Backend Pod Crash
>
> **HYPOTHESIS:** "Given the backend runs as a single replica with no PDB, if the backend pod is deleted, then the frontend will return errors for approximately 30–60 seconds until the replacement pod passes its readiness probe, because the init container (`db-migrate`) adds startup time and the readiness probe has an initial delay before Kubernetes routes traffic to the new pod."
>
> - **Experiment:** `kubectl delete pod -n oranje-markt -l app=backend`
> - **Success criteria:** Application recovers within 60 seconds with zero data loss. Frontend returns errors only during the recovery window.
> - **Blast radius:** Backend API completely unavailable; frontend shows error pages or loading spinners. Database and frontend pods are unaffected.
> - **Rollback:** Automatic — Kubernetes Deployment controller creates a replacement pod immediately.
>
> ---
>
> ### Hypothesis 2 — Database Pod Failure
>
> **HYPOTHESIS:** "Given PostgreSQL runs as a single StatefulSet pod with persistent storage on a PVC, if the `postgres-0` pod is deleted, then the backend will lose database connectivity and return HTTP 500 errors for approximately 20–30 seconds, because the StatefulSet controller will recreate the pod with the same PVC (preserving data), but the backend has no connection retry mechanism and will fail all queries until the new postgres pod is ready."
>
> - **Experiment:** `kubectl delete pod -n oranje-markt postgres-0`
> - **Success criteria:** Database recovers with zero data loss within 30 seconds. Backend reconnects automatically without manual intervention.
> - **Blast radius:** All database-dependent endpoints fail (products, orders, authentication). Frontend static content may still load but API calls fail. Frontend pod is unaffected.
> - **Rollback:** Automatic — StatefulSet controller recreates `postgres-0` and reattaches the existing PVC.
>
> ---
>
> ### Hypothesis 3 — Load Spike
>
> **HYPOTHESIS:** "Given the backend has resource limits of 500m CPU and 512Mi memory with no autoscaling (HPA), if sustained load of 20+ concurrent requests per second is applied for 2 minutes, then the backend will become CPU-throttled within the first 60 seconds and begin returning 503 errors or timing out, because the single pod cannot horizontally scale and the CPU limit will cause kernel-level throttling under the sustained load."
>
> - **Experiment:** Deploy 10 load-generator pods each sending continuous requests:
>   ```bash
>   for i in $(seq 1 10); do
>     kubectl run load-gen-$i --image=busybox --restart=Never -n oranje-markt \
>       -- /bin/sh -c "while true; do wget -q -O- http://backend:4000/api/products; done"
>   done
>   ```
> - **Success criteria:** Identify the exact breaking point (requests/second) and the first symptom of failure (increased latency, 5xx errors, or OOMKill).
> - **Blast radius:** Degraded response times for all users. Possible OOMKill if memory usage spikes. Frontend may appear slow or unresponsive due to backend timeouts.
> - **Rollback:** Delete load-generator pods:
>   ```bash
>   kubectl delete pod -n oranje-markt -l run --field-selector=status.phase!=Succeeded
>   ```

### Step 3: Select hypotheses to execute

For this lab, **select Hypothesis 1 (backend pod crash)** as your primary experiment — it is safe, fast, and automatically recoverable. If time permits, also run Hypothesis 2 (database failure).

### Discussion Answer

> **What makes a good hypothesis? Are disproven hypotheses valuable?**

A good chaos hypothesis has four components:
1. **Given** — specific system context (replicas, limits, configuration)
2. **If** — precise failure injection (exactly what you will do)
3. **Then** — predicted outcome with **measurable criteria** (duration, error codes, affected endpoints)
4. **Because** — reasoning that explains *why* you expect this outcome

Both confirmed and disproven hypotheses are valuable:
- A **confirmed** hypothesis validates your mental model of the system — you understand how it fails.
- A **disproven** hypothesis is often *more* valuable — it reveals something unexpected about the system. For example, if the backend recovers in 5 seconds instead of the predicted 30–60, that tells you something about the readiness probe configuration you didn't know. If it takes 3 minutes, that reveals a deeper problem.

---

## Solution 3 — Define & Verify Steady State (Phase 2.1)

> **Goal:** Define what "normal" looks like for the application so you can detect deviations during and after chaos experiments.

### Step 1: Ask Copilot for steady-state metrics

Use the prompt from the challenge:

```
I need to define steady-state metrics for my AKS application before running chaos experiments.

Architecture:
- Frontend: Next.js on port 3000 (1 replica)
- Backend: Express API on port 4000, health endpoint at /api/health (1 replica)
- PostgreSQL: StatefulSet on port 5432 (1 replica)
- Monitoring: Prometheus + Grafana in-cluster

For each component, define:
- Metric name and description
- Normal range (threshold for "healthy")
- How to measure it (kubectl command, Prometheus query, or HTTP check)
- What deviation looks like (when to raise an alarm)

Also generate a bash script that captures the current steady state as a baseline snapshot.
```

### Step 2: Example steady-state definition

Copilot should produce a table similar to:

> Here's the steady-state definition for Oranje Markt:
>
> | Metric | Component | Normal Range | How to Measure | Deviation |
> |--------|-----------|-------------|----------------|-----------|
> | Pod status | All | All pods `Running`, `READY x/x` | `kubectl get pods -n oranje-markt` | Any pod in `CrashLoopBackOff`, `Pending`, `Error`, or not Ready |
> | Pod restart count | All | 0 restarts in the last hour | `kubectl get pods -n oranje-markt` — RESTARTS column | Any non-zero restart count indicates instability |
> | Backend health check | Backend | HTTP 200 from `/api/health` in < 200 ms | `kubectl exec deploy/frontend -n oranje-markt -- wget -q -O- http://backend:4000/api/health` | Non-200 response or timeout > 1 s |
> | Backend error rate | Backend | 0% 5xx responses | Prometheus: `rate(http_requests_total{status=~"5.."}[1m])` | Any sustained 5xx rate > 0 for more than 10 s |
> | CPU usage | Backend | < 50% of limit (< 250m) | `kubectl top pods -n oranje-markt` | Sustained usage > 80% indicates throttling risk |
> | Memory usage | Backend | < 60% of limit (< 307Mi) | `kubectl top pods -n oranje-markt` | Usage > 80% (> 410Mi) indicates OOMKill risk |
> | Database connectivity | PostgreSQL | `pg_isready` returns exit code 0 | `kubectl exec postgres-0 -n oranje-markt -- pg_isready -U oranje` | Non-zero exit code means database is not accepting connections |
> | Database query latency | PostgreSQL | < 50 ms for simple queries | `kubectl exec postgres-0 -n oranje-markt -- psql -U oranje -c "SELECT 1" -t` | Query timeout or > 500 ms response |
> | Service endpoints | All | All services have non-empty endpoint lists | `kubectl get endpointslices -n oranje-markt` | Empty endpoints means no pods are backing the service |
> | Node readiness | AKS | All nodes `Ready` | `kubectl get nodes` | Any node `NotReady` reduces available capacity |
>
> **Note:** Metrics like `kube_pod_status_ready` and `kube_pod_container_status_restarts_total` require kube-state-metrics, which may not be deployed. Use `kubectl get pods` and `kubectl top pods` as reliable alternatives.

### Step 3: Example baseline capture script

Ask Copilot to generate a script, or use this example:

```bash
#!/bin/bash
# steady-state-baseline.sh — Capture steady-state snapshot for Oranje Markt
# Run this BEFORE any chaos experiment to establish a baseline

NAMESPACE="oranje-markt"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "============================================"
echo " STEADY STATE BASELINE — Oranje Markt"
echo " Captured: $TIMESTAMP"
echo "============================================"
echo ""

# 1. Pod status
echo "--- Pod Status ---"
kubectl get pods -n $NAMESPACE -o wide
echo ""

# 2. Pod resource usage
echo "--- Resource Usage ---"
kubectl top pods -n $NAMESPACE 2>/dev/null || echo "(metrics-server not available)"
echo ""

# 3. Node status
echo "--- Node Status ---"
kubectl get nodes -o wide
kubectl top nodes 2>/dev/null || echo "(metrics-server not available)"
echo ""

# 4. Backend health check
echo "--- Backend Health Check ---"
HEALTH=$(kubectl exec deploy/frontend -n $NAMESPACE -- \
  wget -q -O- --timeout=5 http://backend:4000/api/health 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ Backend healthy: $HEALTH"
else
  echo "❌ Backend health check FAILED: $HEALTH"
fi
echo ""

# 5. Database connectivity
echo "--- Database Connectivity ---"
kubectl exec postgres-0 -n $NAMESPACE -- pg_isready -U oranje 2>/dev/null
if [ $? -eq 0 ]; then
  echo "✅ Database is accepting connections"
else
  echo "❌ Database is NOT accepting connections"
fi
echo ""

# 6. Service endpoints
echo "--- Service Endpoints ---"
kubectl get endpointslices -n $NAMESPACE
echo ""

# 7. Recent events (last 5 minutes)
echo "--- Recent Events (last 5 min) ---"
kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -10
# PowerShell: kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | Select-Object -Last 10
echo ""

echo "============================================"
echo " Baseline capture complete"
echo "============================================"
```

### Step 4: Run the baseline

```bash
chmod +x steady-state-baseline.sh
./steady-state-baseline.sh
```

**Expected output** (all healthy):

```
============================================
 STEADY STATE BASELINE — Oranje Markt
 Captured: 2025-01-15T10:30:00Z
============================================

--- Pod Status ---
NAME                        READY   STATUS    RESTARTS   AGE   IP            NODE
backend-7d4f8b6c5-x2k9m    1/1     Running   0          2h    10.244.1.12   aks-nodepool1-12345-vmss000000
frontend-5c8f9d7e2-p3n8q   1/1     Running   0          2h    10.244.2.8    aks-nodepool1-12345-vmss000001
postgres-0                  1/1     Running   0          2h    10.244.0.15   aks-nodepool1-12345-vmss000002

--- Resource Usage ---
NAME                        CPU(cores)   MEMORY(bytes)
backend-7d4f8b6c5-x2k9m    12m          145Mi
frontend-5c8f9d7e2-p3n8q   8m           120Mi
postgres-0                  5m           85Mi

--- Backend Health Check ---
✅ Backend healthy: {"status":"ok","timestamp":"2025-01-15T10:30:00Z"}

--- Database Connectivity ---
postgres-0:5432 - accepting connections
✅ Database is accepting connections

--- Service Endpoints ---
NAME       ENDPOINTS          AGE
backend    10.244.1.12:4000   2h
frontend   10.244.2.8:3000    2h
postgres   10.244.0.15:5432   2h

--- Baseline capture complete ---
```

### Step 5: Verify in Grafana

Port-forward Grafana and visually confirm the dashboards show normal operation:

```powershell
kubectl port-forward -n oranje-markt svc/grafana 3001:3001
```

Open `http://localhost:3001` and verify:
- CPU and memory graphs are flat and within normal ranges
- Error rate is at 0%
- Request latency is stable under 200 ms

Take a screenshot — you will compare against this after the experiment.

### Discussion Answer

> **Why should steady-state definitions be "deployed as code"?**

Steady-state definitions should be version-controlled and automated for the same reasons as infrastructure-as-code:

1. **Reproducibility** — every team member uses the same definition of "healthy." No more "it looks fine to me."
2. **Version control** — changes to the definition are tracked. When you add a new component or change thresholds, the history is preserved.
3. **Automation** — scripts can verify steady state before and after experiments programmatically, enabling CI/CD integration (e.g., run chaos experiments as part of a release pipeline).
4. **Auditability** — you can trace exactly what was measured, when, and by whom. This matters for compliance and incident reviews.
5. **Regression testing** — the baseline becomes a test suite. If a future deployment breaks the steady state, the script catches it.

---

## Solution 4 — Plan & Introduce Disruptions (Phase 2.2)

> **Goal:** Generate a chaos experiment script from the hypothesis and execute it safely.

### Step 1: Ask Copilot to generate the experiment script

Provide Hypothesis 1 (backend pod crash) and the prompt from the challenge:

```
Generate a chaos experiment script for this hypothesis:

HYPOTHESIS: "Given the backend runs as a single replica with no PDB, if the backend pod
is deleted, then the frontend will return errors for 30-60 seconds until the replacement
pod passes its readiness probe."

Requirements:
- Print experiment details at the start (hypothesis, blast radius, rollback plan)
- Capture pre-experiment state (pods, resource usage)
- Record the exact disruption timestamp
- Delete the backend pod
- Poll every 5 seconds to track recovery (pod status + health check)
- Capture post-experiment state
- Print a before/after comparison
- Use namespace oranje-markt
- Backend health endpoint: http://backend:4000/api/health
- Use bash
```

### Step 2: Example generated experiment script

Copilot should produce something similar to:

```bash
#!/bin/bash
# chaos-experiment-01-backend-crash.sh
# Hypothesis: Backend pod crash recovery time

NAMESPACE="oranje-markt"
EXPERIMENT="Backend Pod Crash Recovery"
MAX_WAIT=120  # Maximum seconds to wait for recovery

echo "╔══════════════════════════════════════════════════╗"
echo "║         CHAOS EXPERIMENT — $EXPERIMENT"
echo "╠══════════════════════════════════════════════════╣"
echo "║ Hypothesis:  Backend pod delete → 30-60s downtime"
echo "║ Blast radius: Backend API unavailable             "
echo "║ Rollback:     Automatic (K8s self-healing)        "
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Pre-experiment snapshot ──
echo "📸 Capturing pre-experiment state..."
echo ""
echo "--- PRE: Pod Status ---"
PRE_PODS=$(kubectl get pods -n $NAMESPACE -o wide 2>&1)
echo "$PRE_PODS"
echo ""

echo "--- PRE: Resource Usage ---"
PRE_RESOURCES=$(kubectl top pods -n $NAMESPACE 2>&1)
echo "$PRE_RESOURCES"
echo ""

echo "--- PRE: Health Check ---"
PRE_HEALTH=$(kubectl exec deploy/frontend -n $NAMESPACE -- \
  wget -q -O- --timeout=5 http://backend:4000/api/health 2>&1)
echo "Health: $PRE_HEALTH"
echo ""

# ── Inject failure ──
echo "💥 INJECTING FAILURE — deleting backend pod..."
DISRUPT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "Disruption time: $DISRUPT_TIME"
kubectl delete pod -n $NAMESPACE -l app=backend --wait=false
echo ""

# ── Monitor recovery ──
echo "⏱️  Monitoring recovery (polling every 5s, max ${MAX_WAIT}s)..."
echo ""
ELAPSED=0
RECOVERED=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
  sleep 5
  ELAPSED=$((ELAPSED + 5))

  POD_STATUS=$(kubectl get pods -n $NAMESPACE -l app=backend \
    -o jsonpath='{.items[0].status.phase}' 2>/dev/null)
  READY=$(kubectl get pods -n $NAMESPACE -l app=backend \
    -o jsonpath='{.items[0].status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
  HEALTH=$(kubectl exec deploy/frontend -n $NAMESPACE -- \
    wget -q -O- --timeout=2 http://backend:4000/api/health 2>/dev/null)
  HEALTH_EXIT=$?

  echo "  T+${ELAPSED}s | Phase: ${POD_STATUS:-N/A} | Ready: ${READY:-N/A} | Health: $([ $HEALTH_EXIT -eq 0 ] && echo '✅ OK' || echo '❌ FAIL')"

  if [ "$READY" = "True" ] && [ $HEALTH_EXIT -eq 0 ]; then
    RECOVERED=true
    break
  fi
done

echo ""
RECOVERY_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ "$RECOVERED" = true ]; then
  echo "✅ RECOVERED after ${ELAPSED} seconds"
else
  echo "❌ NOT RECOVERED after ${MAX_WAIT} seconds — manual intervention needed"
fi
echo ""

# ── Post-experiment snapshot ──
echo "📸 Capturing post-experiment state..."
echo ""
echo "--- POST: Pod Status ---"
POST_PODS=$(kubectl get pods -n $NAMESPACE -o wide 2>&1)
echo "$POST_PODS"
echo ""

echo "--- POST: Resource Usage ---"
POST_RESOURCES=$(kubectl top pods -n $NAMESPACE 2>&1)
echo "$POST_RESOURCES"
echo ""

# ── Summary ──
echo "╔══════════════════════════════════════════════════╗"
echo "║               EXPERIMENT SUMMARY                 ║"
echo "╠══════════════════════════════════════════════════╣"
echo "  Disruption time:  $DISRUPT_TIME"
echo "  Recovery time:    $RECOVERY_TIME"
echo "  Duration:         ${ELAPSED}s"
echo "  Result:           $([ "$RECOVERED" = true ] && echo 'RECOVERED' || echo 'NOT RECOVERED')"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "--- BEFORE ---"
echo "$PRE_PODS"
echo ""
echo "--- AFTER ---"
echo "$POST_PODS"
echo ""
echo "Rollback (if needed): kubectl rollout restart deployment backend -n $NAMESPACE"
```

### Step 3: Review the script before running

> **🪟 PowerShell users:** The script above uses bash syntax. Key changes needed for PowerShell:
> - Replace `@.type=="Ready"` with `@.type=='Ready'` in JSONPath filters
> - Replace `$(date -u +...)` with `Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ'`
> - Replace `sleep 5` with `Start-Sleep -Seconds 5`
> - Replace `$?` exit code checks with `$LASTEXITCODE`

Check the following before executing:

- ✅ **Correct namespace** — `oranje-markt`, not `default` or `kube-system`
- ✅ **Correct label selector** — `app=backend`, matches the actual deployment
- ✅ **Reasonable wait times** — 120 s max, 5 s polling interval
- ✅ **Non-destructive** — only deletes the pod, not the deployment
- ✅ **Automatic rollback** — Kubernetes recreates the pod; no manual undo needed
- ✅ **No side effects** — doesn't modify the database or persistent state

### Step 4: Run the experiment

Open **three terminal windows** before executing:

**Terminal 1 — Live pod watch:**
```bash
kubectl get pods -n oranje-markt -w
```

**Terminal 2 — Grafana:**
```powershell
kubectl port-forward -n oranje-markt svc/grafana 3001:3001
```
Open `http://localhost:3001` and watch the dashboards.

**Terminal 3 — Execute the experiment:**
```bash
chmod +x chaos-experiment-01-backend-crash.sh
./chaos-experiment-01-backend-crash.sh
```

**Do NOT intervene** — let Kubernetes handle recovery. Observe what happens naturally.

**Expected output:**

```
💥 INJECTING FAILURE — deleting backend pod...
Disruption time: 2025-01-15T10:45:00Z

⏱️  Monitoring recovery (polling every 5s, max 120s)...

  T+5s  | Phase: Pending   | Ready: N/A   | Health: ❌ FAIL
  T+10s | Phase: Running   | Ready: False | Health: ❌ FAIL
  T+15s | Phase: Running   | Ready: False | Health: ❌ FAIL
  T+20s | Phase: Running   | Ready: False | Health: ❌ FAIL
  T+25s | Phase: Running   | Ready: False | Health: ❌ FAIL
  T+30s | Phase: Running   | Ready: True  | Health: ✅ OK

✅ RECOVERED after 30 seconds
```

### Step 5: Record the results

Document these observations for Solution 5:

> **Note:** Recovery times vary depending on cluster load, image cache state, and node performance. The values below are representative — your actual measurements may differ.

| Data Point | Value |
|---|---|
| Disruption timestamp | `2025-01-15T10:45:00Z` |
| Recovery timestamp | `2025-01-15T10:45:30Z` |
| Total downtime | ~30 seconds |
| Observed symptoms | Backend API unavailable, frontend showed error messages |
| Pod lifecycle | `Running` → `Terminating` → `Pending` → `Init:0/1` → `Running` → `Ready` |
| Data loss | None (database unaffected) |
| Cascading failures | None (frontend and postgres remained healthy) |

> **⚠️ Cascading Failure (Database Experiments):** When running the postgres pod deletion experiment (Hypothesis 2), the backend health endpoint returns HTTP 503 while the database is down. Since the **liveness probe** uses this same `/api/health` endpoint, Kubernetes will restart the backend pod after 3 consecutive liveness failures (~30s). This cascading failure extends the total outage beyond the database recovery time alone — you may observe the backend pod restarting with `RESTARTS: 1` even though you only deleted the database pod.

### Discussion Answer

> **What safety guardrails should chaos experiments have in real environments?**

For production or shared environments, implement these guardrails:

1. **Approval gates** — require human approval before execution (or at minimum, notify the on-call team)
2. **Blast radius limits** — scope experiments to a single namespace, limit max affected pods (e.g., `--max-unavailable=1`)
3. **Automatic rollback triggers** — if error rate exceeds a threshold (e.g., > 10% 5xx for 30 s), automatically undo the experiment
4. **Time-bound experiments** — auto-stop after N minutes regardless of outcome
5. **Namespace exclusions** — never allow experiments in `kube-system`, `monitoring`, or other critical namespaces
6. **Audit logging** — record who ran what experiment, when, and with what result
7. **Dry-run mode** — preview the experiment plan without executing (`--dry-run=server`)
8. **Gradual escalation** — start with non-production, then staging, then production with increasing guardrails

---

## Solution 5 — Observe & Analyze Results (Phase 2.3)

> **Goal:** Analyze the experiment results and produce a structured experiment report using AI.

### Step 1: Gather experiment data

Collect post-experiment data to feed to Copilot:

```bash
# Recent events (captures the pod deletion and recreation timeline)
kubectl get events -n oranje-markt --sort-by='.lastTimestamp' | tail -20
# PowerShell: kubectl get events -n oranje-markt --sort-by='.lastTimestamp' | Select-Object -Last 20

# Current pod status
kubectl get pods -n oranje-markt -o wide

# Pod details (shows restart count, last state, readiness probe results)
kubectl describe pod -n oranje-markt -l app=backend

# Backend logs (shows startup sequence and any errors)
kubectl logs -n oranje-markt -l app=backend --tail=50

# Check for any lingering issues
kubectl top pods -n oranje-markt
```

### Step 2: Ask Copilot for analysis

Paste the experiment data into Copilot Chat with the analysis prompt from the challenge:

```
I ran a chaos experiment on my AKS application. Here are the results:

HYPOTHESIS: "Given the backend runs as a single replica with no PDB, if the backend pod
is deleted, then the frontend will return errors for 30-60 seconds until the replacement
pod passes its readiness probe."

DISRUPTION: Deleted the backend pod using `kubectl delete pod -n oranje-markt -l app=backend`

OBSERVED BEHAVIOR:
- Pre-experiment state: All pods Running/Ready, 0 restarts, health check OK
- T+0s:  Pod deleted (Terminating)
- T+2s:  New pod created (Pending)
- T+5s:  Init container started (Init:0/1)
- T+18s: Init container completed, main container starting (Running, Ready: False)
- T+30s: Readiness probe passed (Running, Ready: True, health check OK)
- Total downtime: ~30 seconds
- No data loss (database unaffected)
- No cascading failures

EVENTS:
[paste kubectl events output]

LOGS:
[paste backend logs showing startup sequence]

Please produce a structured experiment report with:
1. Hypothesis result (CONFIRMED or DISPROVEN)
2. Impact analysis
3. Recovery analysis
4. Steady-state comparison
5. Root cause
6. Recommendations
7. Risk re-assessment
```

### Step 3: Example Copilot analysis report

Copilot should produce a report similar to:

> ## Chaos Experiment Report
>
> ### Experiment: Backend Pod Crash Recovery
> **Date:** 2025-01-15
> **Hypothesis:** "If the backend pod is deleted, the frontend will return errors for 30–60 seconds until the replacement pod passes its readiness probe."
>
> ---
>
> ### 1. Result: ✅ CONFIRMED
>
> The hypothesis was **confirmed**. The backend was unavailable for approximately 30 seconds, which falls within the predicted 30–60 second window. The system self-healed without manual intervention.
>
> ---
>
> ### 2. Impact Analysis
>
> | Aspect | Observation |
> |--------|-------------|
> | Blast radius | Backend API only — as predicted |
> | User impact | All API requests failed for ~30 s. Frontend displayed error messages. |
> | Data loss | None — PostgreSQL was unaffected |
> | Cascading failures | None — frontend and database pods remained healthy |
> | Collateral damage | None observed |
>
> The blast radius matched the prediction exactly. The failure was contained to the backend component.
>
> ---
>
> ### 3. Recovery Analysis
>
> | Phase | Timestamp | Duration | Description |
> |-------|-----------|----------|-------------|
> | Termination | T+0 s | ~2 s | Old pod received SIGTERM and shut down |
> | Scheduling | T+2 s | ~1 s | New pod scheduled to a node |
> | Init container | T+3 s → T+18 s | ~15 s | `db-migrate` init container ran database migrations |
> | Container startup | T+18 s → T+20 s | ~2 s | Express server started and began listening on :4000 |
> | Readiness probe | T+20 s → T+30 s | ~10 s | Initial delay (10 s) before first readiness check passed |
>
> **Recovery was automatic** — Kubernetes Deployment controller created a replacement pod immediately. No manual intervention was needed.
>
> ---
>
> ### 4. Steady-State Comparison
>
> | Metric | Before | During Disruption | After Recovery |
> |--------|--------|-------------------|----------------|
> | Backend pods Ready | 1/1 | 0/1 | 1/1 |
> | Backend error rate | 0% | 100% (~30 s) | 0% |
> | Backend response time | 45 ms | N/A (unavailable) | 48 ms |
> | Database connectivity | ✅ | ✅ (unaffected) | ✅ |
> | Pod restart count | 0 | — | 0 (new pod) |
> | Frontend status | Ready 1/1 | Ready 1/1 | Ready 1/1 |
>
> Steady state was fully restored after recovery. No lingering effects.
>
> ---
>
> ### 5. Root Cause of Downtime
>
> The 30-second downtime is caused by three sequential delays:
>
> 1. **Init container (`db-migrate`)** — 15 seconds to run database migrations. This runs on every pod start, even when no migrations are pending.
> 2. **Container startup** — 2 seconds for Node.js/Express to boot and open the HTTP listener.
> 3. **Readiness probe `initialDelaySeconds`** — 10 seconds of mandatory wait before Kubernetes sends the first readiness check.
>
> With a single replica, there is zero redundancy during this 30-second window.
>
> ---
>
> ### 6. Recommendations
>
> | Priority | Recommendation | Expected Impact |
> |----------|---------------|-----------------|
> | 🔴 High | Increase backend replicas to **2+** | Eliminates single-pod downtime entirely — one pod serves traffic while the other recovers |
> | 🔴 High | Add a **PodDisruptionBudget** with `minAvailable: 1` | Prevents voluntary disruptions (node drains, upgrades) from removing the last pod |
> | 🟡 Medium | Optimize the init container — **skip migrations on restart** if DB is already migrated | Reduces restart time from 30 s to ~12 s |
> | 🟡 Medium | Reduce readiness probe `initialDelaySeconds` from 10 s to **5 s** | Reduces restart time by 5 s |
> | 🟢 Low | Add a **startup probe** separate from the liveness probe | Allows slow startup without being killed by the liveness probe |
> | 🟢 Low | Add an **HPA** (min: 2, max: 5) | Provides automatic scaling under load while maintaining minimum redundancy |
>
> ---
>
> ### 7. Risk Re-Assessment
>
> | Failure Mode | Previous Risk | Updated Risk | Rationale |
> |---|---|---|---|
> | Backend pod crash | **High** | **High** (confirmed) | Single replica confirmed as primary weakness. 30 s downtime per incident. |
> | With 2+ replicas | — | **Low** | With redundancy, a single pod crash causes zero downtime. |
>
> **Recommendation:** Prioritize this fix in Lab 3 (Resilience Improvements). Adding a second replica is the single highest-impact change for this application.

### Step 4: Supplement with your own observations

Add details the AI might miss:

- **Grafana screenshots** — capture the gap in metrics during the 30 s window
- **User experience** — open the frontend in a browser during the experiment; note exactly what the user sees (error page? loading spinner? blank page?)
- **Exact timing** — compare the AI's analysis with your own stopwatch measurements
- **Kubernetes events** — the raw event timeline is the ground truth; verify the AI's interpretation matches

### Discussion Answer

> **How do experiment results feed back into the FMA? Why document successful experiments?**

Experiment results feed back into the FMA cycle in three ways:

1. **Updated risk scores** — confirmed high-impact failures stay high priority; surprisingly-resilient areas can be deprioritized. For example, if the backend recovered in 10 seconds instead of 30, the risk score might decrease.
2. **New failure modes discovered** — during testing, you might observe unexpected behavior (e.g., the frontend retries indefinitely and creates a thundering-herd effect on recovery). These go back into the FMA as new entries.
3. **Validated mitigations** — when you implement fixes (Lab 3), re-running the experiment proves the mitigation works. The FMA entry gets updated with "Current Mitigation: 2 replicas + PDB (validated by experiment)."

Documenting **successful experiments** (system behaved as expected) is important because:
- It **validates your understanding** — you know how the system fails and recovers
- It **builds confidence** for running chaos experiments in production — stakeholders can see the process is controlled and safe
- It **creates a regression baseline** — if a future deployment breaks the same scenario, you will catch it by re-running the experiment

---

## Extra Challenge Solution — Autonomous Experiment Execution 🤖

> **Goal:** Have GitHub Copilot autonomously execute a full chaos experiment lifecycle from a single prompt, then compare the results against the manual step-by-step approach.

### Step 1: Choose a hypothesis

Select a hypothesis from Solution 2 that you want to test autonomously. For this walkthrough, we will use **Hypothesis 2 — Database Pod Failure**, since it is different from the backend pod crash used in Solutions 3–5, giving you a new experiment to compare.

> **HYPOTHESIS:** "Given PostgreSQL runs as a single StatefulSet pod with persistent storage on a PVC, if the `postgres-0` pod is deleted, then the backend will lose database connectivity and return HTTP 500 errors for approximately 20–30 seconds, because the StatefulSet controller will recreate the pod with the same PVC (preserving data), but the backend has no connection retry mechanism and will fail all queries until the new postgres pod is ready."

### Step 2: Craft the autonomous execution prompt

Open GitHub Copilot in VS Code (agent mode) or a terminal session. Paste the following mega-prompt — note how it includes all the context Copilot needs to execute without asking questions:

```
You are a chaos engineering agent. Execute the following experiment AUTONOMOUSLY
— run each step using the terminal, capture the output, and produce a final report.

HYPOTHESIS: "Given PostgreSQL runs as a single StatefulSet pod with persistent storage
on a PVC, if the postgres-0 pod is deleted, then the backend will lose database
connectivity and return HTTP 500 errors for approximately 20-30 seconds, because the
StatefulSet controller will recreate the pod with the same PVC (preserving data), but
the backend has no connection retry mechanism and will fail all queries until the new
postgres pod is ready."

ENVIRONMENT:
- Kubernetes namespace: oranje-markt
- Backend: deployment "backend", health endpoint http://backend:4000/api/health
- Frontend: deployment "frontend"
- Database: StatefulSet "postgres", pod "postgres-0"
- Cluster: Standard_D2s_v3 nodes (2 vCPU, 8 GiB each)
- All pods accessed via kubectl

EXECUTE THESE PHASES IN ORDER:

Phase 1 — Capture Steady State:
- Run: kubectl get pods -n oranje-markt -o wide
- Run: kubectl top pods -n oranje-markt
- Test backend health: kubectl exec deploy/frontend -n oranje-markt -- wget -q -O- http://backend:4000/api/health
- Test database: kubectl exec postgres-0 -n oranje-markt -- pg_isready -U oranje
- Save all output as the "BEFORE" baseline

Phase 2 — Inject Failure:
- Record the exact timestamp
- Execute: kubectl delete pod -n oranje-markt postgres-0
- Do NOT intervene after injection

Phase 3 — Monitor Recovery:
- Poll every 5 seconds for up to 120 seconds
- Each poll: check pod status (kubectl get pods -n oranje-markt), check backend health (kubectl exec deploy/frontend -n oranje-markt -- wget -q -O- --timeout=2 http://backend:4000/api/health)
- Record each poll result with timestamp
- Stop when database pod is Ready AND backend health returns 200, OR timeout

Phase 4 — Capture Post-Experiment State:
- Run: kubectl get pods -n oranje-markt -o wide
- Run: kubectl get events -n oranje-markt --sort-by='.lastTimestamp' | tail -20   (PowerShell: | Select-Object -Last 20)
- Run: kubectl describe pod -n oranje-markt postgres-0
- Run: kubectl logs -n oranje-markt -l app=backend --tail=30

Phase 5 — Analyze & Report:
Produce a structured report:
1. Hypothesis result: CONFIRMED or DISPROVEN (with evidence)
2. Impact analysis: actual vs. predicted blast radius
3. Recovery timeline: second-by-second breakdown
4. Steady-state comparison: before vs. after metrics
5. Root cause: why the system behaved this way
6. Recommendations: resilience improvements
7. Risk re-assessment: updated FMA risk score

SAFETY CONSTRAINTS:
- Only operate in namespace "oranje-markt"
- Maximum experiment duration: 120 seconds
- Only delete pods — do NOT delete deployments, statefulsets, or PVCs
- Include rollback instructions if manual intervention is needed
```

### Step 3: Observe the autonomous execution

When Copilot begins executing, watch how it handles each phase:

**Expected behavior:**

1. **Phase 1** — Copilot runs each `kubectl` command, captures the output, and summarizes the baseline. It should show all pods as `Running/Ready`, database accepting connections, and backend healthy.

2. **Phase 2** — Copilot deletes `postgres-0` and records the timestamp. The key observation is whether Copilot proceeds immediately to monitoring or tries to intervene.

3. **Phase 3** — This is the most interesting phase. Copilot should poll repeatedly and produce output like:
   ```
   T+5s   | postgres-0: Pending    | Backend health: ❌ FAIL (connection refused)
   T+10s  | postgres-0: Running    | Backend health: ❌ FAIL (ECONNREFUSED :5432)
   T+15s  | postgres-0: Running    | Backend health: ❌ FAIL (database not ready)
   T+20s  | postgres-0: Running    | Backend health: ✅ OK
   ```

4. **Phase 4** — Copilot gathers post-experiment data automatically.

5. **Phase 5** — Copilot produces the experiment report. Compare this against the report you would get by feeding curated data manually (Solution 5).

### Step 4: Compare autonomous vs. manual results

After the autonomous execution, compare the output against what you produced in Solutions 3–5:

| Aspect | Manual (Challenges 3–5) | Autonomous (Extra Challenge) |
|--------|------------------------|------------------------------|
| **Time spent** | 30–45 minutes across 3 challenges | 5–10 minutes (prompt + execution) |
| **Data quality** | Curated — you choose what to include | Raw — Copilot captures what it is told to |
| **Analysis depth** | You provide context the AI cannot see (Grafana screenshots, user experience observations) | Limited to terminal output — no visual data |
| **Safety** | Human reviews each step before execution | AI executes without pause — requires trust in the safety constraints |
| **Reproducibility** | Depends on documentation | The prompt IS the experiment definition — fully reproducible |
| **Missed observations** | Human may notice unexpected behavior | AI follows the script — may miss edge cases outside the defined scope |

### Step 5: Iterate on the prompt

If the autonomous execution missed something or produced a shallow analysis, **refine your mega-prompt** and try again. Common improvements:

- Add more specific monitoring commands (e.g., check backend logs during recovery)
- Include Grafana PromQL queries if you have `curl` access to the Prometheus API
- Ask Copilot to also check for cascading failures in other components
- Add a "pre-flight check" phase that verifies the environment is healthy before injecting chaos

### Discussion Answer

> **Step-by-step AI-assisted vs. fully autonomous AI-driven chaos engineering — when to use which?**

**Step-by-step (Challenges 3–5)** is better when:
- You are learning — understanding each phase builds knowledge
- The experiment is novel — you don't know what to expect and need to make real-time decisions
- The system is in production — human oversight is critical for safety
- You need rich observations — visual dashboards, user experience, and intuition cannot be captured in terminal output alone

**Autonomous execution (this challenge)** is better when:
- The experiment is well-understood — you've run it before and know what to expect
- You need to run experiments at scale — dozens of hypotheses across multiple environments
- You are integrating chaos into CI/CD — automated experiments as part of release pipelines
- You need reproducibility — the prompt defines the experiment precisely

**For production**, autonomous chaos should have:
1. **Approval gates** — human approves the experiment plan before execution starts
2. **Kill switches** — automatic halt if error rate exceeds a threshold
3. **Blast radius limits** — enforced by RBAC (the agent's service account can only operate in specific namespaces)
4. **Audit logs** — every command executed is logged for post-incident review
5. **Dry-run mode** — preview the full execution plan without actually running commands
6. **Gradual autonomy** — start with human-in-the-loop, graduate to fully autonomous only for well-tested experiments

---

## Solution 6 — Cleanup

Remove any resources created during the experiments and restore the application to its original state.

```powershell
# Delete any load-generator or chaos pods
kubectl delete pod -n oranje-markt -l run --ignore-not-found

# Delete broken deployment experiments (if deployed)
kubectl delete deployment -n oranje-markt `
  chaos-crashloop chaos-imagepull chaos-resource --ignore-not-found

# Restart deployments (in case any were modified — uses the current image, not the raw YAML)
kubectl rollout restart deployment/backend -n oranje-markt
kubectl rollout restart deployment/frontend -n oranje-markt

# Verify steady state is restored
echo ""
echo "--- Final verification ---"
kubectl get pods -n oranje-markt
kubectl top pods -n oranje-markt
```

**Expected output:**

```
NAME                        READY   STATUS    RESTARTS   AGE
backend-xxxxxxxxxx-xxxxx    1/1     Running   0          ...
frontend-xxxxxxxxxx-xxxxx   1/1     Running   0          ...
postgres-0                  1/1     Running   0          ...
```

All chaos resources removed. Application healthy. Ready for Lab 3.

---

## Bonus — Diagnose Broken Deployments

Three intentionally broken manifests are provided in `solutions/manifests/`. For each one, deploy it, observe the failure, use AI to diagnose, and apply the fix.

### Broken Deployment 1 — CrashLoopBackOff (`01-crashloop.yaml`)

**Problem:** Custom command `/bin/start-app` does not exist in the nginx image.

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/01-crashloop.yaml
kubectl get pods -n oranje-markt -l app=chaos-crashloop -w
# → Status: CrashLoopBackOff
```

**Diagnose:**
```powershell
$POD = kubectl get pods -n oranje-markt -l app=chaos-crashloop `
  -o jsonpath='{.items[0].metadata.name}'

kubectl describe pod -n oranje-markt $POD
kubectl logs -n oranje-markt $POD --previous
```

**Key finding:** Command `/bin/start-app` → `StartError`, exit code 128.

**Fix:** Remove the custom `command` field so the image's default entrypoint runs:
```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/01-crashloop-fix.yaml
```

---

### Broken Deployment 2 — ImagePullBackOff (`02-imagepull.yaml`)

**Problem:** Image tag `v99-does-not-exist` does not exist in the public nginx registry.

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/02-imagepull.yaml
kubectl get pods -n oranje-markt -l app=chaos-imagepull -w
# → Status: ImagePullBackOff
```

**Key finding:** `manifest unknown: manifest tagged by "v99-does-not-exist" is not found`

**Fix:** Change the image tag to `latest`:
```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/02-imagepull-fix.yaml
```

---

### Broken Deployment 3 — Pending (`03-resource-constraint.yaml`)

**Problem:** Pod requests 64Gi memory and 32 CPU — far exceeds node capacity (8 GiB, 2 vCPU each).

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/03-resource-constraint.yaml
kubectl get pods -n oranje-markt -l app=chaos-resource
# → Status: Pending (indefinitely)
```

**Key finding:** `FailedScheduling: 0/3 nodes are available: 3 Insufficient memory`

**Fix:** Reduce resource requests to values that fit on the nodes (e.g., 128Mi memory, 100m CPU):
```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/03-resource-constraint-fix.yaml
```

---

### Cleanup bonus deployments

```bash
kubectl delete deployment -n oranje-markt chaos-crashloop chaos-imagepull chaos-resource --ignore-not-found
```
