# Lab 1 — Manual Chaos Experiments: Execution Report

**Team:** kad-chaos-team1
**Date:** 2026-03-19
**Cluster:** kad-chaos-team1-aks (Resource Group: rg-kad-chaos-team1)
**Region:** germanywestcentral

---

## Challenge 1 — Explore the Environment & Define Steady State

### Steps Executed

```bash
az aks get-credentials --resource-group rg-kad-chaos-team1 --name kad-chaos-team1-aks --admin
kubectl get pods -n oranje-markt -o wide
kubectl get nodes -o wide
kubectl get svc -n oranje-markt
kubectl top pods -n oranje-markt
```

### Observations

| Metric | Value |
|--------|-------|
| **Nodes** | 1 node (`aks-systempool-35712173-vmss000000`, Standard_D2s_v3) |
| **Total pods** | 8 pods, all on the single node |
| **Frontend service** | LoadBalancer, external IP `4.182.105.210`, port 80 |
| **Frontend response** | HTTP 200, 0.12s |
| **Backend response** | HTTP 200, 0.03s |
| **Backend CPU** | 9m (idle) |
| **Backend Memory** | 30Mi (idle) |
| **PostgreSQL** | StatefulSet, 11m CPU, 38Mi memory |

### Steady-State Baseline

1. **API Response Time:** Backend ~0.03s, Frontend ~0.12s
2. **Error Rate:** 0% (all HTTP 200)
3. **Pod Status:** 7/8 pods Running (Grafana stuck in ContainerCreating)

### 🐛 Issue Found: Grafana Broken

Grafana pod is stuck in `ContainerCreating` due to a **missing ConfigMap**:

```
MountVolume.SetUp failed for volume "dashboard-files":
  configmap "grafana-dashboard-files" not found
```

The deployment references `grafana-dashboard-files` ConfigMap but no corresponding YAML file exists in `infra/k8s/observability/grafana/`. Only `grafana-datasources` and `grafana-dashboards-provider` exist.

**Impact:** Cannot use Grafana for observability during chaos experiments. Students are told to use Grafana extensively but it doesn't work out of the box.

---

## Challenge 2 — Kill a Pod (Self-Healing)

### Hypothesis

"If I kill the backend pod, the app will be unavailable for ~30 seconds while Kubernetes reschedules and the init container (db-migrate) runs."

### Steps Executed

```bash
kubectl get pods -n oranje-markt -w  # watch in separate terminal
kubectl delete pod -n oranje-markt -l app=backend
```

### Observations

| Event | Time |
|-------|------|
| Pod deletion command | 32s to complete (graceful termination) |
| New pod → Pending | Immediate |
| Init:0/1 → PodInitializing | ~9s (db-migrate init container) |
| PodInitializing → Running | ~1s |
| Running → Ready (1/1) | ~31s total from delete to ready |

**Pod lifecycle observed:**
```
Terminating → Pending → Init:0/1 → PodInitializing → Running → Ready
```

### Result

✅ **Hypothesis confirmed.** Kubernetes self-healing worked. Total downtime was ~31 seconds. Backend fully recovered and responded with HTTP 200 after restart.

---

## Challenge 3 — Kill the Database

### Hypothesis

"If I kill the database pod, the backend will return 500 errors until PostgreSQL recovers, then auto-reconnect."

### Steps Executed

```bash
kubectl delete pod -n oranje-markt postgres-0
kubectl logs -n oranje-markt -l app=backend --tail=20
```

### Observations

| Event | Time |
|-------|------|
| PostgreSQL pod deletion | 4s |
| PostgreSQL pod recovery | ~16s total |
| Backend 500 errors | During DB outage |
| Backend auto-reconnect | Yes, after PostgreSQL came back |

**Critical finding:** The backend health probe (`/api/health`) returned **HTTP 200 even while the database was down**. This means Kubernetes considers the backend "healthy" even though it cannot serve any data requests (returning 500s).

### Result

✅ **Hypothesis partially confirmed.** Backend returned 500 errors during outage but auto-reconnected after PostgreSQL recovered. However, the health probe is **misleading** — it doesn't check database connectivity.

---

## Challenge 4 — Simulate Network Disruption

### Hypothesis

"If I change the DATABASE_URL to point to a wrong host, the backend will crash and enter CrashLoopBackOff because the init container (db-migrate) will fail."

### Steps Executed

```bash
# Original config: DATABASE_URL from secret "postgres-secret"
kubectl set env deployment/backend -n oranje-markt \
  DATABASE_URL="postgresql://oranje:oranje123@wrong-host:5432/oranjedb"

# Observe behavior, then restore
kubectl rollout undo deployment/backend -n oranje-markt
```

### Observations

- **Init container error:** `P1001: Can't reach database server at wrong-host:5432`
- New backend pod entered **CrashLoopBackOff** within 20 seconds
- **Old backend pod kept running!** Kubernetes RollingUpdate strategy kept the old pod serving traffic since the new pod never became Ready
- `kubectl rollout undo` successfully restored the original config
- The CrashLoopBackOff pod was terminated and a healthy pod was created

### Result

✅ **Hypothesis confirmed** — the backend crashes with wrong DATABASE_URL. **Bonus finding:** RollingUpdate deployment strategy provided unexpected resilience — the old pod continued serving traffic, so there was **zero downtime** for end users during the misconfiguration.

---

## Challenge 5 — Drain a Node

### Hypothesis

"With only 1 node (teams.json sets `systemNodeCount: 2` but only 1 was running), draining will leave all pods in Pending state with no available node to schedule on."

### Steps Executed

```bash
kubectl get pods -n oranje-markt -o wide  # All on single node
kubectl drain aks-systempool-35712173-vmss000000 \
  --ignore-daemonsets --delete-emptydir-data --timeout=60s
```

### Observations

- **All oranje-markt pods evicted** (backend, frontend, postgres, prometheus, loki, grafana, postgres-exporter)
- **kube-system PDBs blocked completion:** CoreDNS, metrics-server, and konnectivity-agent pods could not be evicted due to PodDisruptionBudgets — drain timed out after 60s
- **Cluster auto-scaler kicked in** — a second node (`vmss000002`) was provisioned
- After uncordoning, pods rescheduled within ~2 minutes
- **Backend entered CrashLoopBackOff** temporarily (2 restarts) because PostgreSQL wasn't ready yet when the backend's init container tried to run migrations

### Result

⚠️ **Partially confirmed.** The drain evicted all application pods but couldn't complete due to kube-system PDBs. The cluster auto-scaler saved the day by adding a second node. Backend's dependency on PostgreSQL startup order caused transient CrashLoopBackOff.

---

## Challenge 6 — Load Test to Breaking Point

### Hypothesis

"With 500m CPU limit on the backend, the pod will hit CPU throttling at around 5-10 concurrent load generators, causing increased latency."

### Steps Executed

```bash
# Start 5 load generators
for i in $(seq 1 5); do
  kubectl run load-test-$i --image=busybox --restart=Never -n oranje-markt \
    -- /bin/sh -c "while true; do wget -q -O- http://backend:4000/api/products > /dev/null 2>&1; done"
done

# Scale to 10
for i in $(seq 6 10); do
  kubectl run load-test-$i --image=busybox --restart=Never -n oranje-markt \
    -- /bin/sh -c "while true; do wget -q -O- http://backend:4000/api/products > /dev/null 2>&1; done"
done

kubectl top pods -n oranje-markt
```

### Observations

| Load Level | Backend CPU | Response Time | Error Rate |
|------------|-------------|---------------|------------|
| Idle (0 pods) | 9m | 0.016s | 0% |
| 5 load pods | 498m | ~0.08s (estimated) | 0% |
| 10 load pods | 336m* | 0.125s | 0% |

*CPU measurement may have been taken during a throttle-release cycle.

**Key findings:**
- Backend CPU hit **498m** (99.6% of the 500m limit) with just 5 load generators
- Response time increased **7.8x** (0.016s → 0.125s) under heavy load
- No OOMKill events — memory stayed within limits (32-102Mi vs 512Mi limit)
- **CPU throttling was the bottleneck**, not memory
- PostgreSQL CPU increased to 42m but was not the bottleneck
- No pod evictions or crashes occurred

### Result

✅ **Hypothesis confirmed.** CPU throttling kicked in at 5 concurrent connections. The backend degraded gracefully (no crashes, just slower) — this is actually better than expected but still problematic for production.

---

## Challenge 7 — Cleanup

### Steps Executed

```bash
# Delete load test pods
for i in $(seq 1 10); do
  kubectl delete pod load-test-$i -n oranje-markt --ignore-not-found
done

# Uncordon all nodes
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | \
  xargs -I{} kubectl uncordon {}

# Verify steady state
kubectl get pods -n oranje-markt
kubectl top pods -n oranje-markt
```

### Final State

All original pods running (except Grafana still broken). 2 nodes now available (cluster auto-scaler added a second node during Challenge 5).

### 🐛 Issue Found: Load Test Cleanup Command in README Doesn't Work

The README suggests: `kubectl delete pod -n oranje-markt -l run=load-test`

This doesn't work because pods created with `kubectl run load-test-1` get the label `run=load-test-1` (not `run=load-test`). Each pod gets a unique label. Students need to delete pods by name or use a different label selector.

---

## Summary of Findings

### What Worked Well ✅

1. **Kubernetes self-healing** — Pods consistently recovered after deletion
2. **RollingUpdate strategy** — Protected availability during bad config changes (Challenge 4)
3. **Cluster auto-scaler** — Automatically added a node when the only one was drained
4. **Backend graceful degradation** — Under CPU pressure, the backend slowed down but didn't crash
5. **PostgreSQL data persistence** — PVC survived pod deletion; data intact after restart

### Issues Found 🐛

| # | Issue | Severity | Challenge |
|---|-------|----------|-----------|
| 1 | **Grafana broken** — missing `grafana-dashboard-files` ConfigMap | 🔴 High | 1 |
| 2 | **Health probe doesn't check DB** — returns 200 when database is down | 🟡 Medium | 3 |
| 3 | **Only 1 node deployed** (teams.json says 2) — node drain is catastrophic | 🟡 Medium | 5 |
| 4 | **Backend depends on PostgreSQL startup order** — CrashLoopBackOff if DB isn't ready first | 🟡 Medium | 5 |
| 5 | **Load test cleanup command doesn't match** — label selector is wrong | 🟢 Low | 7 |
| 6 | **Non-admin kubectl access denied** — needed `--admin` flag for AKS credentials | 🟢 Low | Prerequisites |

---

## Proposed Improvements

### Improvements to the Lab Infrastructure

#### 1. Fix Grafana Dashboard ConfigMap (Critical)

Create the missing `infra/k8s/observability/grafana/configmap-dashboard-files.yaml` with pre-built dashboards (Kubernetes pod metrics, request rates, error rates). Without Grafana working, students cannot do the observability portion of the lab.

#### 2. Fix Health Probe to Include DB Check

The backend `/api/health` endpoint should verify database connectivity. A proper readiness probe should return unhealthy when the database is unreachable, causing Kubernetes to stop routing traffic to unhealthy pods:

```javascript
// Readiness probe should do:
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unhealthy', reason: 'database unreachable' });
  }
});
```

#### 3. Deploy at Least 2 Nodes

Update `teams.json` to ensure `systemNodeCount: 2` is actually enforced. Challenge 5 (node drain) is only meaningful with 2+ nodes. With 1 node, pods go to Pending immediately and the challenge loses its educational value about graceful workload migration.

#### 4. Add Backend Startup Retry Logic

The backend should retry database connections on startup rather than crashing immediately when PostgreSQL isn't available. An exponential backoff in the init container or the application startup would make the system more resilient to startup ordering.

### Improvements to the Lab README

#### 5. Fix Load Test Cleanup Command

**Current (broken):**
```bash
kubectl delete pod -n oranje-markt -l run=load-test
```

**Fixed:**
```bash
kubectl delete pod -n oranje-markt --field-selector=status.phase=Running -l run --grep load-test
# Or more simply, use a common label:
kubectl run load-test-1 --labels="run=load-test,instance=1" ...
```

Or instruct students to create load test pods with a common label:
```bash
kubectl run load-test-1 --labels="chaos=load-test" --image=busybox ...
```

Then cleanup works:
```bash
kubectl delete pod -n oranje-markt -l chaos=load-test
```

#### 6. Add Prerequisites for AKS Authentication

The README should mention that students may need `--admin` credentials or proper RBAC role assignments. The `kubelogin` tool and `azurecli` login mode should be documented:

```bash
az aks get-credentials --resource-group rg-<team> --name <team>-aks --admin
# Or configure kubelogin:
kubelogin convert-kubeconfig -l azurecli
```

#### 7. Add Expected Timings and Observations

Students would benefit from expected timing ranges for each challenge so they can validate their results:

| Challenge | Expected Recovery Time |
|-----------|----------------------|
| Kill backend pod | ~30s (includes init container) |
| Kill PostgreSQL pod | ~16s |
| Network disruption rollback | Immediate (rollout undo) |
| Node drain recovery | ~2 min (with auto-scaler) |

#### 8. Add Challenge for Grafana Setup

Since Grafana is broken, add an optional "Challenge 0" where students fix the Grafana deployment. This turns a bug into a learning opportunity:

> "Before starting chaos experiments, verify your observability stack. If Grafana is not working, debug and fix it. Hint: check if all required ConfigMaps exist."

#### 9. Provide Port-Forward Instructions with Context

The README mentions `kubectl port-forward svc/grafana -n oranje-markt 3001:3001` but doesn't explain that this only works from a machine with direct network access to the cluster. For remote/cloud environments, students may need alternative access methods.

#### 10. Add a Metrics Collection Script

Provide a simple script that continuously captures metrics during chaos experiments, since Grafana is not available:

```bash
#!/bin/bash
# metrics-collector.sh — Run during chaos experiments
while true; do
  echo "$(date -u +%H:%M:%S) | $(kubectl top pods -n oranje-markt --no-headers | grep backend)"
  sleep 5
done
```

### Architecture Improvements for Production

#### 11. Add PodDisruptionBudgets for Application Pods

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: backend
```

#### 12. Increase Replicas to 2+

Frontend and backend should have at least 2 replicas to survive single pod failures without downtime.

#### 13. Add NetworkPolicies

Restrict traffic flow so only the frontend can talk to the backend, and only the backend can talk to PostgreSQL.

#### 14. Add HPA (Horizontal Pod Autoscaler)

Auto-scale the backend based on CPU usage to handle traffic spikes gracefully.
