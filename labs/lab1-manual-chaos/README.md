# Lab 1 — Manual Chaos Experiments

## Objective

Learn chaos engineering fundamentals by manually injecting failures into the Oranje Markt application and observing how the system responds. By the end you will:

- Define steady-state metrics for a running application
- Inject pod, database, network, and node-level failures
- Use observability tools (Grafana, Prometheus, logs) to measure impact
- Understand Kubernetes self-healing and its limitations
- Form hypotheses and validate them through experiments

## Prerequisites

- Completed infrastructure deployment (see `infra/azure/README.md`)
- Oranje Markt application deployed and running
- `kubectl` connected to the AKS cluster
- Grafana accessible (port-forward or LoadBalancer)

### Connecting to the AKS Cluster

Each team has its own cluster. Replace `<team-name>` with your team name from `teams.json`:

```bash
# Get credentials (use --admin if RBAC isn't configured for your user)
az aks get-credentials \
  --resource-group rg-<team-name> \
  --name <team-name>-aks \
  --admin

# If using Azure AD authentication and getting Forbidden errors, convert kubeconfig:
kubelogin convert-kubeconfig -l azurecli
```

Verify connectivity:
```bash
kubectl get nodes
kubectl get pods -n oranje-markt
```

## Reference Documentation

- [Chaos Engineering principles](https://principlesofchaos.org/)
- [Kubernetes pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [kubectl cheat sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Azure AKS node auto-repair](https://learn.microsoft.com/azure/aks/node-auto-repair)

---

## Challenge 1 — Explore the Environment & Define Steady State

**Goal:** Familiarize yourself with the deployed Oranje Markt application and observability stack. Define measurable steady-state metrics before you start breaking things.

**Requirements:**

- Access the Oranje Markt frontend via the LoadBalancer external IP
- Port-forward Grafana (`kubectl port-forward svc/grafana -n oranje-markt 3001:3001`) and explore dashboards
- Verify all pods are running: `kubectl get pods -n oranje-markt`
- Browse the app: view products, search, add to cart
- Define at least 3 steady-state metrics (e.g., API response time, error rate, pod status)
- Document your steady state — this is your baseline for all experiments

**What to observe:**

- How many pods are running? On which nodes?
- What does Grafana show for CPU, memory, request rates?
- What is the baseline response time for the frontend and backend?
- Are there any existing errors or warnings in the logs?

**Hints:**

- `kubectl get pods -n oranje-markt -o wide` shows node placement
- `kubectl top pods -n oranje-markt` shows resource usage
- Check Grafana dashboards for pre-built Kubernetes views
- Use the browser's network tab to measure frontend response times

> **Discussion:** Why is defining steady state the first step in chaos engineering? What happens if you skip this step?

---

## Challenge 2 — Kill a Pod (Self-Healing)

**Goal:** Delete the backend pod and observe Kubernetes self-healing. Measure how long the application is unavailable and whether it recovers automatically.

**Requirements:**

- Form a hypothesis: "If I kill the backend pod, the app will..."
- Delete the backend pod: `kubectl delete pod -n oranje-markt -l app=backend`
- While the pod is restarting, try to use the app (browse products, search)
- Measure the downtime: how long until the backend responds again?
- Check: does the app fully recover or are there lingering issues?

**What to observe:**

- Pod status transitions: Terminating → Pending → ContainerCreating → Running
- Grafana: gap in metrics? Error rate spike?
- Frontend behavior: does it show errors? Hang? Degrade gracefully?
- How long does the init container (db-migrate) take on restart?

**Hints:**

- Run `kubectl get pods -n oranje-markt -w` in a separate terminal to watch pod lifecycle
- The backend has an init container that runs database migrations — this adds to restart time
- Try accessing the frontend during the restart to see the user experience
- Check `kubectl get events -n oranje-markt --sort-by='.lastTimestamp'` for the timeline

> **Discussion:** What determines how quickly Kubernetes restarts a pod? What would happen if the backend had 3 replicas instead of 1?

---

## Challenge 3 — Kill the Database

**Goal:** Delete the PostgreSQL pod and observe the cascading impact on the entire application. Understand the difference between stateless and stateful pod failures.

**Requirements:**

- Form a hypothesis: "If I kill the database pod, the backend will..."
- Delete the PostgreSQL pod: `kubectl delete pod -n oranje-markt postgres-0`
- Observe the backend: does it crash? Return errors? Queue requests?
- Monitor Grafana: error rate spikes? Backend pod restarts?
- After PostgreSQL restarts, does the backend automatically reconnect?
- Bonus: delete the PostgreSQL PVC too (`kubectl delete pvc postgres-data -n oranje-markt`) — what happens now?

**What to observe:**

- Backend logs: connection errors, retry attempts
- Frontend: error messages shown to users
- PostgreSQL recovery time: how long until the StatefulSet pod is back?
- Data persistence: is the data still there after pod restart (PVC)?
- Data loss scenario: what happens when the PVC is deleted?

**Hints:**

- `kubectl logs -n oranje-markt -l app=backend -f` to stream backend logs
- PostgreSQL is a StatefulSet — pods have stable names (`postgres-0`)
- The PVC survives pod deletion but NOT PVC deletion
- After deleting the PVC, you may need to re-run database migrations

> **Discussion:** Why is running a database as a StatefulSet in Kubernetes risky? What would a production-ready database setup look like?

---

## Challenge 4 — Simulate Network Disruption

**Goal:** Disrupt communication between the backend and database without killing any pods. Observe how the application handles network-level failures.

**Requirements:**

- Approach 1 — Wrong DNS: Edit the backend deployment to change the `DATABASE_URL` environment variable to point to a non-existent host
  ```bash
  kubectl set env deployment/backend -n oranje-markt DATABASE_URL="postgresql://oranje:oranje123@wrong-host:5432/oranjedb"
  ```
- Approach 2 — Exec into pod: Use `kubectl exec` to simulate DNS failure inside the backend pod
- Observe: does the backend crash or return errors gracefully?
- Restore the original configuration after testing

**What to observe:**

- Backend pod behavior: does it restart? Enter CrashLoopBackOff?
- Error responses: what HTTP status codes does the frontend show?
- Grafana: latency changes, error rate spikes
- Recovery time: how long after restoring the correct config?

**Hints:**

- Save the original DATABASE_URL before changing it
- The backend's readiness probe hits `/api/health` — does it still pass when the DB is unreachable?
- `kubectl rollout undo deployment/backend -n oranje-markt` can restore the previous config
- Watch both the backend logs and the frontend behavior simultaneously

> **Discussion:** How should an application handle database connectivity failures? (retries, circuit breakers, connection pooling)

---

## Challenge 5 — Drain a Node

**Goal:** Simulate a node failure by draining it. Observe how Kubernetes reschedules all workloads and how long until full recovery.

**Requirements:**

- Identify which node runs the most application pods: `kubectl get pods -n oranje-markt -o wide`
- Drain the node: `kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data`
- Observe: how are pods rescheduled? Do all come back?
- What happens to Prometheus/Grafana if they were on that node?
- Uncordon the node after testing: `kubectl uncordon <node-name>`

**What to observe:**

- Pod eviction order and timing
- Service availability during the drain
- Whether all pods successfully reschedule to other nodes
- Impact on observability (Prometheus, Grafana) if they were on the drained node
- Total time from drain start to full recovery

**Hints:**

- Use `-o wide` to see node assignments
- The drain will fail if it violates a PDB — but we don't have PDBs yet (that's a Lab 3 improvement!)
- If you only have 1 node with capacity, pods may stay in Pending
- `kubectl get events --sort-by='.lastTimestamp'` shows the drain and reschedule timeline

> **Discussion:** What is the difference between a cordon and a drain? When would you use each? How do Pod Disruption Budgets protect against node drains?

---

## Challenge 6 — Load Test to Breaking Point

**Goal:** Generate increasing load on the Oranje Markt application until it breaks. Identify the bottleneck and document the failure mode.

**Requirements:**

- Start with baseline traffic and gradually increase load
- You can use any tool: the existing `tests/load/` scripts, `kubectl run` with curl loops, or install a load testing tool
- Simple approach with kubectl (use `--labels` so cleanup is easy):
  ```bash
  kubectl run load-test-1 --image=busybox --restart=Never --labels="chaos=load-test" -n oranje-markt -- /bin/sh -c "while true; do wget -q -O- http://backend:4000/api/products; done"
  ```
- Scale up the load (run multiple load-test pods):
  ```bash
  for i in $(seq 2 5); do
    kubectl run load-test-$i --image=busybox --restart=Never --labels="chaos=load-test" -n oranje-markt \
      -- /bin/sh -c "while true; do wget -q -O- http://backend:4000/api/products; done"
  done
  ```
- Monitor Grafana: CPU, memory, request rate, error rate
- Identify the breaking point: at what load level does the app fail?

**What to observe:**

- Resource usage trending (CPU, memory) in Grafana
- First signs of stress: increased latency, occasional 5xx errors
- Breaking point: OOMKill, CPU throttling, connection refused
- Which component breaks first: frontend, backend, or database?
- Kubernetes events: Evicted, OOMKilled, FailedScheduling

**Hints:**

- Start with 1 load generator pod, then scale to 5, 10, 20
- Watch `kubectl top pods -n oranje-markt` in real-time
- The backend has `512Mi` memory limit and `500m` CPU limit — these are your boundaries
- PostgreSQL with a single connection can become a bottleneck quickly
- Clean up load test pods after: `kubectl delete pod -n oranje-markt -l chaos=load-test`

> **Discussion:** What is the most common bottleneck you found? How would autoscaling (HPA) help? What is the difference between resource requests and limits?

---

## Challenge 7 — Cleanup

Remove any temporary resources and restore the environment to its original state.

```bash
# Delete load test pods
kubectl delete pod -n oranje-markt -l chaos=load-test --ignore-not-found

# Verify all original pods are running
kubectl get pods -n oranje-markt

# Uncordon any drained nodes
kubectl uncordon $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')

# Verify steady state is restored
kubectl top pods -n oranje-markt
```

---

## Summary

| Concept | What You Should Have Learned |
|---------|------------------------------|
| **Steady State** | Always define and measure baseline before injecting chaos |
| **Pod Self-Healing** | Kubernetes automatically restarts failed pods, but there's downtime with single replicas |
| **Stateful Failures** | Database pods are harder to recover — PVCs persist but are a single point of failure |
| **Network Disruption** | Applications need resilience patterns for connectivity failures |
| **Node Drain** | Kubernetes reschedules workloads, but without PDBs, all pods on a node can be evicted at once |
| **Load Testing** | Every system has a breaking point — resource limits and replica count determine capacity |

## Expected Recovery Timings

Use these as a reference — your results may vary depending on cluster size and image pull times:

| Experiment | Expected Recovery Time | Notes |
|------------|----------------------|-------|
| Kill backend pod | ~30s | Includes init container (db-migrate) |
| Kill PostgreSQL pod | ~15-20s | StatefulSet recreates with same PVC |
| Wrong DATABASE_URL | Immediate rollback with `rollout undo` | Old pod keeps serving (RollingUpdate strategy) |
| Node drain (multi-node) | ~2 min | Backend may CrashLoopBackOff if DB isn't ready first |
| Load test (5 pods) | N/A | Backend CPU ~500m (throttled), latency ~5-8x increase |

## Key Takeaways

1. **Hypothesis first**: Always predict the outcome before running an experiment
2. **Single replicas are fragile**: Any pod kill = immediate service disruption
3. **Databases need special attention**: StatefulSets with PVCs survive pod restarts but not PVC deletion
4. **Observability is essential**: Without Grafana/Prometheus, you're flying blind during chaos
5. **Kubernetes self-healing has limits**: It restarts pods, but doesn't add replicas, fix configs, or prevent cascading failures

---

> **Stuck?** Check the [solutions](solutions/) folder for step-by-step walkthroughs and ready-to-use commands.
