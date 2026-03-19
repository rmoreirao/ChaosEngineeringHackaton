# Lab 1 — Solutions: Manual Chaos Experiments

> **Oranje Markt** on AKS — step-by-step walkthrough for every challenge.

| Component | Details |
|-----------|---------|
| Frontend | Next.js · port 3000 · Deployment `frontend` · `<team-acr>.azurecr.io/oranje-markt-frontend:latest` |
| Backend | Express · port 4000 · Deployment `backend` · `<team-acr>.azurecr.io/oranje-markt-backend:latest` · health at `/api/health` |
| Database | PostgreSQL · StatefulSet `postgres` · pod `postgres-0` · PVC `postgres-data` |
| Namespace | `oranje-markt` |
| Observability | Grafana (port-forward `svc/grafana` → 3001), Prometheus, Loki |
| Cluster | 2 × Standard_D2s_v3 (2 vCPU, 8 GiB each) — node count may vary per team |
| Backend init container | `db-migrate` — runs Prisma migrations on startup |
| Backend env | `DATABASE_URL` sourced from Secret `postgres-secret` |

> **Note:** The ACR registry name is team-specific: `<team-name-no-hyphens>acr.azurecr.io` (e.g., `kadchaosteam1acr.azurecr.io`). Replace `<team-acr>` with your team's registry name. You can find the actual image source via `kubectl describe pod -n oranje-markt <pod-name>` and checking the `Events` section for "Successfully pulled image".

---

## Solution 1 — Explore the Environment & Define Steady State

**What happens:** You familiarize yourself with the running application, its components, and define what "healthy" looks like before injecting any failures.

### Step 1: Verify the application is running

```powershell
kubectl get pods -n oranje-markt
```

**Expected output:**

```
NAME                             READY   STATUS    RESTARTS   AGE
backend-xxxxxxxxx-xxxxx          1/1     Running   0          10m
frontend-xxxxxxxxx-xxxxx         1/1     Running   0          10m
grafana-xxxxxxxxx-xxxxx          1/1     Running   0          10m
loki-xxxxxxxxx-xxxxx             1/1     Running   0          10m
postgres-0                       1/1     Running   0          10m
postgres-exporter-xxxxx-xxxxx    1/1     Running   0          10m
prometheus-xxxxxxxxx-xxxxx       1/1     Running   0          10m
promtail-xxxxx                   1/1     Running   0          10m
```

All pods should be `Running` with `READY 1/1`.

### Step 2: Get the frontend URL

```powershell
kubectl get svc -n oranje-markt
```

Look for the `frontend` service with type `LoadBalancer` and note the `EXTERNAL-IP`. You can also get it directly:

```powershell
kubectl get svc frontend -n oranje-markt -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Open it in a browser to confirm the app loads.

### Step 3: Check the backend health endpoint

```powershell
kubectl port-forward svc/backend -n oranje-markt 4000:4000
```

In another terminal:

```powershell
curl http://localhost:4000/api/health
```

**Expected:** a `200 OK` response indicating the backend and database connection are healthy.

### Step 4: Port-forward Grafana

```powershell
kubectl port-forward svc/grafana -n oranje-markt 3001:3001
```

Open <http://localhost:3001> (default credentials: `admin` / `admin`). Explore the pre-built dashboards:

- **App Dashboard:** Request rate, error rate, response time percentiles
- **DB Dashboard:** PostgreSQL connections, query latency
- **Infrastructure Dashboard:** Node CPU/memory, pod resource usage

### Step 5: Check resource usage

```powershell
kubectl top pods -n oranje-markt
kubectl top nodes
```

**Expected output (pods):**

```
NAME                        CPU(cores)   MEMORY(bytes)
backend-xxxxxxxxx-xxxxx     5m           80Mi
frontend-xxxxxxxxx-xxxxx    3m           60Mi
postgres-0                  2m           40Mi
```

### Step 6: Document steady state

Write down your steady-state definition. Example:

| Metric | Steady-State Value (example) | Your Value |
|--------|------------------------------|------------|
| Pod status | All pods `Running`, `READY 1/1` | |
| Backend response time | < 200 ms (p95) | |
| Error rate | 0% | |
| CPU usage | < 50% of limits (e.g., ~5m idle) | |
| Memory usage | Backend ~36Mi, Frontend ~60Mi | |
| Pod restarts | 0 | |

### Discussion Answer

> **Why define steady state first?**
>
> Without a baseline you cannot measure the impact of failures. If you skip this step, you won't know whether observed behavior during an experiment is normal or degraded. Steady state gives you a measurable, objective "before" picture so the "during" and "after" comparisons are meaningful.

---

## Solution 2 — Kill a Pod (Self-Healing)

**What happens:** You delete the backend pod to see how Kubernetes self-healing works via the Deployment controller. The pod is recreated automatically, but there is a brief outage while the init container runs database migrations.

### Step 1: Open a monitoring terminal

```powershell
kubectl get pods -n oranje-markt -l app=backend -w
```

Leave this running — it will live-stream pod status changes.

### Step 2: Form your hypothesis

> "If I kill the backend pod, the frontend will show errors until Kubernetes restarts it. The downtime will be approximately 30–60 seconds due to the init container running Prisma migrations."

### Step 3: Delete the backend pod

In a **second** terminal:

```powershell
$POD = kubectl get pods -n oranje-markt -l app=backend `
  -o jsonpath='{.items[0].metadata.name}'
kubectl delete pod -n oranje-markt $POD
```

> **Tip:** By default, deletion waits ~30s for graceful termination. For simulating abrupt failures, use:
> ```powershell
> kubectl delete pod -n oranje-markt $POD --grace-period=0 --force
> ```

### Step 4: Observe and measure

Watch the monitoring terminal. Expected pod lifecycle:

```
backend-xxxxx   1/1     Running           0     5m
backend-xxxxx   1/1     Terminating       0     5m
backend-xxxxx   0/1     Terminating       0     5m
backend-yyyyy   0/1     Pending           0     0s
backend-yyyyy   0/1     Init:0/1          0     1s
backend-yyyyy   0/1     PodInitializing   0     15s
backend-yyyyy   1/1     Running           0     25s
```

Note the total downtime from `Terminating` → new pod `Running` (typically 20–40 seconds).

### Step 5: Check events

```powershell
kubectl get events -n oranje-markt --sort-by='.lastTimestamp' | Select-Object -Last 10
```

You should see events for: `Killing`, `Scheduled`, `Pulling`, `Pulled`, `Created`, `Started`.

### Step 6: Test the app during restart

While the backend is restarting, try loading the frontend. You should see failed API calls or an error page because there is only 1 backend replica.

### Discussion Answer

> **What affects restart speed?**
>
> - **Image pull policy:** `IfNotPresent` is faster because the image is already cached on the node. `Always` forces a registry check every time.
> - **Init containers:** The `db-migrate` init container runs Prisma migrations, adding 10–20 seconds to every pod start.
> - **Readiness probe:** `initialDelaySeconds` + `periodSeconds` determine when the pod is marked Ready and starts receiving traffic.
>
> **How would 3 replicas change the outcome?**
>
> With 3 replicas, deleting one pod causes **zero downtime** — traffic is routed to the remaining 2 pods while the replacement starts. This is the simplest resilience improvement you can make.

---

## Solution 3 — Kill the Database

**What happens:** You delete the PostgreSQL pod to observe a cascading failure — the backend loses its database connection and starts returning errors. The StatefulSet controller recreates the pod, and data survives thanks to the PVC.

### Step 1: Form your hypothesis

> "If I kill the database pod, the backend will lose its connection and return 500 errors. PostgreSQL will be recreated by the StatefulSet. Data should survive because the PVC persists across pod restarts."

### Step 2: Monitor backend logs

```powershell
kubectl logs -n oranje-markt -l app=backend -f
```

### Step 3: Kill PostgreSQL

In another terminal:

```powershell
kubectl delete pod -n oranje-markt postgres-0
```

### Step 4: Observe cascading failure

**Backend logs** will show errors like:

```
Error: connect ECONNREFUSED 10.x.x.x:5432
Error: Connection terminated unexpectedly
```

**Frontend:** API calls fail, product pages show errors or empty content.

**PostgreSQL:** The StatefulSet automatically recreates `postgres-0`.

### Step 5: Watch recovery

```powershell
kubectl get pods -n oranje-markt -w
```

PostgreSQL should restart within 15–30 seconds. The backend will automatically reconnect (Prisma has built-in connection retry logic).

**Expected:**

```
postgres-0   1/1     Terminating   0     10m
postgres-0   0/1     Terminating   0     10m
postgres-0   0/1     Pending       0     0s
postgres-0   0/1     ContainerCreating   0     1s
postgres-0   1/1     Running       0     5s
```

### Step 6: Verify data persistence

After `postgres-0` is back and Running:

```powershell
kubectl exec -n oranje-markt postgres-0 -- `
  psql -U oranje -d oranjedb -c 'SELECT count(*) FROM "Product";'
```

**Expected:** The row count is the same as before — data survived because the PVC (`postgres-data`) persists independently of the pod.

### Step 7: (Bonus) Delete the PVC

> ⚠️ **This destroys all data — only do this if you understand the consequences.**

```powershell
kubectl delete pvc postgres-data -n oranje-markt
kubectl delete pod -n oranje-markt postgres-0
```

The StatefulSet will try to recreate `postgres-0`, but it will be stuck in `Pending` because the PVC no longer exists.

**Recover by recreating the PVC:**

```powershell
kubectl apply -f infra/k8s/postgres/pvc.yaml
kubectl delete pod -n oranje-markt postgres-0
```

After recreation the database will be **empty** — all data is lost. Re-run migrations by restarting the backend:

```powershell
kubectl rollout restart deployment/backend -n oranje-markt
```

### Discussion Answer

> **Why is running PostgreSQL as a StatefulSet risky for production?**
>
> - **Single point of failure** — only 1 replica, no replication
> - **No automated backups** — PVC deletion = total, permanent data loss
> - **No point-in-time recovery** — can't roll back to a specific moment
> - **No high availability** — pod restart means database downtime
>
> **Production recommendation:** Use **Azure Database for PostgreSQL Flexible Server** — a managed service with built-in HA, automated backups, geo-replication, and point-in-time restore.

---

## Solution 4 — Simulate Network Disruption

**What happens:** You simulate a network partition between the backend and database by changing the `DATABASE_URL` to an unreachable host. The backend will fail to connect and enter a degraded state.

### Step 1: Confirm current connection method

```powershell
kubectl get deployment backend -n oranje-markt `
  -o jsonpath='{.spec.template.spec.containers[0].env}'
```

The `DATABASE_URL` is most likely sourced from the Secret `postgres-secret` via `secretKeyRef`. Note the current configuration so you can restore it.

### Step 2: Break the connection — point to a wrong host

```powershell
kubectl set env deployment/backend -n oranje-markt `
  DATABASE_URL="postgresql://oranje:oranje123@wrong-db-host:5432/oranjedb"
```

This triggers a rolling update — Kubernetes creates a new pod with the wrong `DATABASE_URL`.

> **Note:** The `DATABASE_URL` is normally sourced from a Kubernetes Secret (`postgres-secret`) via `valueFrom.secretKeyRef`. Using `kubectl set env` replaces the secret reference with a literal value. When you run `kubectl rollout undo`, it restores the original secret reference.

### Step 3: Observe the failure

```powershell
kubectl get pods -n oranje-markt -l app=backend -w
```

```powershell
kubectl logs -n oranje-markt -l app=backend -f
```

**Expected:** The new backend pod will fail to connect to the database. The init container `db-migrate` will fail (Prisma can't run migrations against a non-existent host), putting the pod into `Init:Error` or `CrashLoopBackOff`.

> **Note:** The `db-migrate` init container has built-in retry logic (up to 15 attempts with 2s delay). The pod will stay in `Init:0/1` for up to ~30 seconds before transitioning to `Init:Error` and eventually `CrashLoopBackOff`. Be patient — the error is not immediate.

```
backend-yyyyy   0/1     Init:0/1          0     0s
backend-yyyyy   0/1     Init:Error        0     10s
backend-yyyyy   0/1     Init:CrashLoopBackOff   0     25s
```

### Step 4: Check the frontend

Browse the app — API calls fail, products don't load, errors are displayed.

### Step 5: Restore the connection

Roll back to the previous deployment revision (which had the correct `DATABASE_URL` via `secretKeyRef`):

```powershell
kubectl rollout undo deployment/backend -n oranje-markt
```

### Step 6: Verify recovery

```powershell
kubectl rollout status deployment/backend -n oranje-markt
kubectl get pods -n oranje-markt -l app=backend
```

**Expected:**

```
deployment "backend" successfully rolled out
```

```
NAME                        READY   STATUS    RESTARTS   AGE
backend-xxxxxxxxx-xxxxx     1/1     Running   0          30s
```

### Discussion Answer

> **How should applications handle connectivity failures?**
>
> - **Retries with exponential backoff** — don't hammer the failing service; wait progressively longer between retries.
> - **Circuit breakers** — stop sending requests to a failing dependency after repeated failures; periodically check if it has recovered.
> - **Connection pooling** — reuse connections and handle reconnects automatically (Prisma's connection pool does this).
> - **Health endpoints** — `/api/health` should check downstream dependencies (database, caches) and report accurately.
> - **Graceful degradation** — serve cached data or a reduced-functionality experience instead of a full error page.

---

## Solution 5 — Drain a Node

**What happens:** You simulate a node going down for maintenance by draining it. All pods on that node are evicted and rescheduled to remaining nodes — but without Pod Disruption Budgets (PDBs), everything is evicted at once, potentially causing a full outage.

### Step 1: Check pod placement

```powershell
kubectl get pods -n oranje-markt -o wide
```

**Expected output:**

```
NAME                        READY   STATUS    RESTARTS   AGE   IP           NODE
backend-xxxxx               1/1     Running   0          15m   10.x.x.1     aks-nodepool1-xxxxx-vmss000000
frontend-xxxxx              1/1     Running   0          15m   10.x.x.2     aks-nodepool1-xxxxx-vmss000001
postgres-0                  1/1     Running   0          15m   10.x.x.3     aks-nodepool1-xxxxx-vmss000000
```

Note which node runs each pod — if multiple pods are on the same node, draining that node will disrupt all of them simultaneously.

### Step 2: Pick a node and drain it

Choose a node that runs at least one of your app pods:

```powershell
$NODE = kubectl get pods -n oranje-markt `
  -o jsonpath='{.items[0].spec.nodeName}'
Write-Host "Draining node: $NODE"
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --grace-period=30
```

> **Note:** AKS system components (coredns, metrics-server, konnectivity-agent) have their own PDBs. The drain command may take 2+ minutes as it retries evictions for these system pods. This is normal — be patient.

### Step 3: Observe rescheduling

```powershell
kubectl get pods -n oranje-markt -o wide -w
```

Pods evicted from the drained node will transition through `Terminating` → `Pending` → `Running` on a different node. Since there are no PDBs, **all** pods on that node are evicted simultaneously.

### Step 4: Check for stuck pods

If a pod stays in `Pending`:

```powershell
kubectl describe pod -n oranje-markt <pending-pod-name>
```

Common causes:
- Not enough resources on remaining nodes (each node has only 2 vCPU / 8 GiB)
- PVC affinity — `postgres-0`'s PVC may be bound to a specific availability zone
- Single-node cluster — if there is only 1 node, all evicted pods stay `Pending` (see [Common Issues](#common-issues))

### Step 5: Uncordon the node

```powershell
kubectl uncordon $NODE
```

### Step 6: Verify full recovery

```powershell
kubectl get pods -n oranje-markt -o wide
kubectl get nodes
```

All nodes should show `Ready` and all pods should be `Running` with `READY 1/1`.

### Discussion Answer

> **Cordon vs. Drain:**
>
> | Action | What it does | Use case |
> |--------|-------------|----------|
> | `cordon` | Marks node as unschedulable — **existing pods keep running**, but no new pods are placed on it | Preparing for future maintenance; want to stop new workloads without disrupting current ones |
> | `drain` | Evicts all pods AND cordons the node | Active maintenance or decommissioning a node |
>
> **How do PDBs help?**
>
> Without PDBs, `kubectl drain` evicts all pods at once — if your backend, frontend, and database are on the same node, all go down simultaneously.
>
> With a PDB like `minAvailable: 1`, Kubernetes evicts pods **one at a time**, waiting for each replacement to be Running before evicting the next. This guarantees minimum availability during planned disruptions (like node drains, cluster upgrades, or AKS node pool scaling).

---

## Solution 6 — Load Test to Breaking Point

**What happens:** You generate increasing load against the backend API to find the application's breaking point. By scaling up the number of concurrent clients, you identify which resource (CPU, memory, connections) saturates first.

### Step 1: Start simple load (1 client)

```powershell
kubectl run load-test-1 --image=busybox --restart=Never --labels=chaos=load-test -n oranje-markt `
  -- /bin/sh -c "while true; do wget -q -O- http://backend:4000/api/products > /dev/null 2>&1; done"
```

> **Note:** Depending on your backend's CPU limit, even a single load test pod may saturate the backend. With a `500m` CPU limit, you may see CPU throttling immediately. This demonstrates how tight resource limits can make a single-replica service extremely fragile under load.

### Step 2: Monitor resources

In another terminal:

```powershell
kubectl top pods -n oranje-markt
```

Run this repeatedly (every 10–15 seconds) to see CPU and memory trends.

### Step 3: Scale up load (10 clients)

```powershell
2..10 | ForEach-Object {
  kubectl run "load-test-$_" --image=busybox --restart=Never --labels=chaos=load-test -n oranje-markt `
    -- /bin/sh -c "while true; do wget -q -O- http://backend:4000/api/products > /dev/null 2>&1; done"
}
```

### Step 4: Watch for breaking point

```powershell
kubectl get pods -n oranje-markt -w
```

```powershell
kubectl get events -n oranje-markt --field-selector type=Warning
```

Look for these warning signs:
- `OOMKilled` — pod exceeded memory limits
- `Evicted` — node ran out of resources
- Backend logs showing 5xx errors or timeouts
- CPU throttling (CPU usage pinned at the limit)

### Step 5: Identify the bottleneck

```powershell
kubectl top pods -n oranje-markt
kubectl top nodes
```

```powershell
kubectl describe pod -n oranje-markt -l app=backend | Select-String -Pattern "State:|Limits:|Requests:" -Context 0,2
```

**Common bottleneck:** The backend's CPU limit (e.g., `500m` = 0.5 cores) saturates first. Once the CPU is throttled, request latency increases dramatically, causing timeouts and cascading failures.

### Step 6: Clean up load tests

```powershell
kubectl delete pod -n oranje-markt -l chaos=load-test --ignore-not-found
```

### Discussion Answer

> **What is the most common bottleneck?**
>
> Usually **CPU on the backend** — a single pod with a `500m` limit (half a core) can only handle so many concurrent requests before being throttled. After CPU saturation, request latency spikes, connections queue up, and eventually the health check fails.
>
> **How would HPA help?**
>
> A Horizontal Pod Autoscaler (HPA) would watch CPU utilization and automatically add more backend replicas when usage exceeds a threshold (e.g., 70%). This distributes load across multiple pods.
>
> **Requests vs. Limits:**
>
> | Setting | Purpose | Effect |
> |---------|---------|--------|
> | `requests` | Guaranteed minimum resources | Affects **scheduling** — the pod is placed on a node with this much free capacity |
> | `limits` | Maximum allowed resources | Affects **runtime** — pod is throttled (CPU) or OOMKilled (memory) if it exceeds this |

---

## Solution 7 — Cleanup

**What happens:** You restore the cluster to its original state, cleaning up all artifacts from the experiments.

### Step 1: Delete load test pods

```powershell
kubectl delete pods -n oranje-markt -l chaos=load-test --ignore-not-found
```

### Step 2: Uncordon any drained nodes

```powershell
kubectl get nodes -o jsonpath='{.items[*].metadata.name}' | `
  ForEach-Object { $_ -split ' ' } | `
  ForEach-Object { kubectl uncordon $_ }
```

### Step 3: Roll back any deployment changes

```powershell
# Only rollback if DATABASE_URL is a literal (not using secretKeyRef)
$secretRef = kubectl get deployment backend -n oranje-markt `
  -o jsonpath='{.spec.template.spec.containers[0].env[0].valueFrom.secretKeyRef.name}' 2>$null
if (-not $secretRef) {
  Write-Host "DATABASE_URL is a literal value — rolling back to secret-based config"
  kubectl rollout undo deployment/backend -n oranje-markt
} else {
  Write-Host "DATABASE_URL is already using secretKeyRef ($secretRef) — no rollback needed"
}
```

### Step 4: Restore PVC if deleted

```powershell
kubectl apply -f infra/k8s/postgres/
```

### Step 5: Restart backend (to re-run migrations if needed)

```powershell
kubectl rollout restart deployment/backend -n oranje-markt
kubectl rollout status deployment/backend -n oranje-markt
```

### Step 6: Verify everything is running

```powershell
kubectl get pods -n oranje-markt
kubectl get nodes
```

**Expected:**

```
NAME                             READY   STATUS    RESTARTS   AGE
backend-xxxxxxxxx-xxxxx          1/1     Running   0          1m
frontend-xxxxxxxxx-xxxxx         1/1     Running   0          30m
grafana-xxxxxxxxx-xxxxx          1/1     Running   0          30m
loki-xxxxxxxxx-xxxxx             1/1     Running   0          30m
postgres-0                       1/1     Running   0          30m
postgres-exporter-xxxxx-xxxxx    1/1     Running   0          30m
prometheus-xxxxxxxxx-xxxxx       1/1     Running   0          30m
promtail-xxxxx                   1/1     Running   0          30m
```

All pods `Running`, `READY 1/1`, 0 recent restarts. All nodes `Ready`. ✅

---

## Quick Reference

| Challenge | Blast Radius | Recovery Method | Key Takeaway |
|-----------|-------------|-----------------|--------------|
| 1 — Steady State | None | N/A | Always baseline before experimenting |
| 2 — Kill Pod | 1 pod | Automatic (Deployment controller) | Self-healing works; add replicas for zero downtime |
| 3 — Kill Database | Full app (cascading) | Automatic (StatefulSet + PVC) | PVC = data survives; no PVC = data lost |
| 4 — Network Disruption | Backend → DB link | `rollout undo` | Apps need retries, circuit breakers, graceful degradation |
| 5 — Drain Node | All pods on node | `uncordon` + reschedule | PDBs prevent simultaneous eviction |
| 6 — Load Test | Performance degradation | Delete load pods | Know your limits; use HPA and proper resource settings |
| 7 — Cleanup | N/A | Manual restoration | Always clean up after experiments |

---

## Common Issues

Issues you may encounter during the lab and how to resolve them.

### Single-node cluster — drain always times out

If your cluster has only 1 node (check with `kubectl get nodes`), draining that node means there is **no other node** to reschedule pods to. All evicted pods will stay `Pending` indefinitely.

**Fix:** Uncordon the node immediately with `kubectl uncordon <node-name>`. Pods will be rescheduled back to the same node. For a more realistic drain experiment, ensure the cluster has at least 2 nodes.

### `rollout undo` ping-pong after Challenge 4

After Challenge 4 changes `DATABASE_URL` to a literal wrong host and you roll it back, the deployment has (at minimum) 2 revisions: the original (secretKeyRef) and the broken one. Running `rollout undo` without specifying a revision **toggles** between these two, potentially re-breaking the backend.

**Fix:** Always check the current config before rolling back:
```powershell
kubectl get deployment backend -n oranje-markt `
  -o jsonpath='{.spec.template.spec.containers[0].env}'
```
If `DATABASE_URL` is already using `secretKeyRef`, no rollback is needed.

### Duplicate promtail pods after drain

After draining and uncordoning a node, the `promtail` DaemonSet may temporarily create a second pod. This is normal — the DaemonSet controller ensures exactly one pod per node, and the extra pod will be terminated automatically.

### PVC zone affinity — postgres-0 stuck in Pending

After draining a node, `postgres-0` may get stuck in `Pending` if its PVC (`postgres-data`) is bound to a specific availability zone and the remaining node(s) are in a different zone. Azure Managed Disks are zone-specific.

**Fix:** Uncordon the original node so `postgres-0` can be scheduled back to the zone where its PVC resides. Alternatively, delete the PVC and recreate it (this will **lose all data**).
