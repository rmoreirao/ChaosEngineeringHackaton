# Oranje Markt — Resilience Runbook

> This runbook provides step-by-step procedures for handling common failures in the Oranje Markt application running on AKS.

---

## 1. Pod Failure — Backend or Frontend Pod Crashes

### Detection
```bash
kubectl get pods -n oranje-markt
# Look for: CrashLoopBackOff, Error, OOMKilled, or RESTARTS > 0
kubectl get events -n oranje-markt --field-selector type=Warning --sort-by='.lastTimestamp'
```

### Diagnosis
```bash
# Check pod status and events
kubectl describe pod -n oranje-markt -l app=backend

# Check container logs (current)
kubectl logs -n oranje-markt -l app=backend

# Check previous container logs (if restarting)
POD=$(kubectl get pods -n oranje-markt -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n oranje-markt $POD --previous

# Check resource usage
kubectl top pods -n oranje-markt
```

**Common root causes:**
- OOMKilled → memory limit too low or memory leak
- CrashLoopBackOff → application error, missing env vars, wrong command
- Error → unhandled exception in application code

### Remediation
```bash
# If OOMKilled — increase memory limit
kubectl set resources deployment/backend -n oranje-markt --limits=memory=1Gi

# If bad config — rollback to previous version
kubectl rollout undo deployment/backend -n oranje-markt

# If single pod and need immediate recovery — restart the deployment
kubectl rollout restart deployment/backend -n oranje-markt
```

### Verification
```bash
kubectl get pods -n oranje-markt -l app=backend -w
# Wait for READY 1/1, STATUS Running, RESTARTS 0
curl -s http://<frontend-ip>/api/health
```

### Prevention
- Set appropriate resource requests AND limits
- Run 2+ replicas with a PodDisruptionBudget
- Add all three probe types (startup, readiness, liveness)
- Set up alerts for high restart counts

---

## 2. Database Failure — PostgreSQL Pod Unresponsive

### Detection
```bash
kubectl get pods -n oranje-markt -l app=postgres
# Look for: NotReady, CrashLoopBackOff, or Pending
kubectl logs -n oranje-markt postgres-0 | tail -20
```

### Diagnosis
```bash
# Check StatefulSet status
kubectl describe statefulset postgres -n oranje-markt

# Check PVC status (is storage available?)
kubectl get pvc -n oranje-markt

# Check if backend is affected
kubectl logs -n oranje-markt -l app=backend | grep -i "error\|connection\|refused"

# Check disk usage inside the pod (if accessible)
kubectl exec -n oranje-markt postgres-0 -- df -h /var/lib/postgresql/data
```

**Common root causes:**
- PVC full → disk space exhaustion
- OOMKilled → too many connections or queries
- Corrupted data directory → bad shutdown
- PVC deleted → total data loss

### Remediation
```bash
# If pod is crashed but PVC exists — just wait for auto-restart
kubectl get pods -n oranje-markt -l app=postgres -w

# If backend lost connection — restart backend after DB is back
kubectl rollout restart deployment/backend -n oranje-markt

# If PVC was deleted — recreate PVC and re-run migrations
kubectl apply -f infra/k8s/postgres/
kubectl rollout restart deployment/backend -n oranje-markt

# If need to restore from backup
kubectl create job --from=cronjob/postgres-backup manual-restore -n oranje-markt
```

### Verification
```bash
# Verify database is accepting connections
kubectl exec -n oranje-markt postgres-0 -- pg_isready -U oranje -d oranjedb

# Verify backend can reach database
kubectl logs -n oranje-markt -l app=backend | tail -5

# Verify app is working end-to-end
curl -s http://<frontend-ip>/api/products | head -c 200
```

### Prevention
- Add a PDB for PostgreSQL (`minAvailable: 1`)
- Set up periodic backups (CronJob with pg_dump)
- Consider migrating to Azure Database for PostgreSQL Flexible Server
- Monitor disk usage with Prometheus alerts

---

## 3. Node Failure — AKS Node Goes NotReady

### Detection
```bash
kubectl get nodes
# Look for: NotReady, SchedulingDisabled
kubectl get events --field-selector reason=NodeNotReady
```

### Diagnosis
```bash
# Check which pods were on the failed node
kubectl get pods -n oranje-markt -o wide | grep <node-name>

# Check node conditions
kubectl describe node <node-name> | grep -A 5 "Conditions:"

# Check from Azure side
az aks show --resource-group <rg-name> --name <aks-name> --query "agentPoolProfiles[0].{count:count, powerState:powerState}" -o table
```

**Common root causes:**
- VM hardware failure → Azure auto-repair will handle
- Kubelet crash → node goes NotReady after ~40s
- Resource exhaustion (CPU/memory/disk) → node becomes unresponsive

### Remediation
```bash
# If node is cordoned — uncordon it
kubectl uncordon <node-name>

# If node is truly dead — AKS auto-repair kicks in (5-10 min)
# Monitor the auto-repair process:
az aks show --resource-group <rg-name> --name <aks-name> --query "powerState" -o tsv

# If pods are stuck on the dead node — force delete them
kubectl delete pod <pod-name> -n oranje-markt --grace-period=0 --force

# If auto-repair fails — manually reboot the VMSS instance
az vmss restart --resource-group <node-rg> --name <vmss-name> --instance-ids <instance-id>
```

### Verification
```bash
kubectl get nodes
# All nodes should show Ready
kubectl get pods -n oranje-markt -o wide
# All pods should be Running on available nodes
```

### Prevention
- Use multiple replicas so pod rescheduling is seamless
- Add PDBs to prevent all pods being evicted during node issues
- Use topology spread constraints to distribute pods across nodes
- Enable cluster autoscaler for automatic node replacement

---

## 4. High Load — Application Under Heavy Traffic

### Detection
```bash
kubectl top pods -n oranje-markt
# Look for: CPU near limits, memory growing
kubectl get hpa -n oranje-markt
# If HPA exists, check if it's at max replicas
```

### Diagnosis
```bash
# Check resource usage vs limits
kubectl describe pod -n oranje-markt -l app=backend | grep -A 3 "Limits:"

# Check for throttling
kubectl get events -n oranje-markt | grep -i "evict\|oom\|throttl"

# Check Grafana for latency and error rates
# Port-forward: kubectl port-forward svc/grafana -n oranje-markt 3001:3001

# Check if database is the bottleneck
kubectl exec -n oranje-markt postgres-0 -- psql -U oranje -d oranjedb -c "SELECT count(*) FROM pg_stat_activity;"
```

### Remediation
```bash
# Scale up replicas manually (immediate relief)
kubectl scale deployment/backend -n oranje-markt --replicas=5
kubectl scale deployment/frontend -n oranje-markt --replicas=3

# If HPA is configured — verify it's scaling
kubectl get hpa -n oranje-markt -w

# If database is the bottleneck — increase postgres resources
kubectl set resources statefulset/postgres -n oranje-markt --limits=cpu=1,memory=1Gi

# Rate limiting (if ingress is configured)
# Add annotation: nginx.ingress.kubernetes.io/limit-rps: "10"
```

### Verification
```bash
# Verify latency is returning to normal (Grafana)
kubectl top pods -n oranje-markt
# CPU and memory should be below 80% of limits

# Verify error rate is dropping
kubectl logs -n oranje-markt -l app=backend --tail=20 | grep -c "error\|Error"
```

### Prevention
- Configure HPA with appropriate CPU/memory targets
- Set resource requests AND limits for all pods
- Enable cluster autoscaler for node-level scaling
- Add connection pooling for database (PgBouncer)
- Consider Azure Load Testing to find capacity limits proactively

---

## 5. Deployment Failure — New Release Stuck in CrashLoopBackOff

### Detection
```bash
kubectl rollout status deployment/backend -n oranje-markt
# If it hangs → new pods are failing
kubectl get pods -n oranje-markt -l app=backend
# Look for new pods in CrashLoopBackOff alongside old Running pods
```

### Diagnosis
```bash
# Check the new pod's logs
kubectl logs -n oranje-markt -l app=backend --tail=50

# Check rollout history
kubectl rollout history deployment/backend -n oranje-markt

# Compare old vs new pod specs
kubectl get deployment backend -n oranje-markt -o yaml | grep image:
```

### Remediation
```bash
# Rollback to the previous working version (immediate fix)
kubectl rollout undo deployment/backend -n oranje-markt

# Verify rollback completed
kubectl rollout status deployment/backend -n oranje-markt

# Investigate the failing image separately
# Deploy to a test namespace to debug:
kubectl create namespace debug
kubectl run debug-backend --image=<failing-image> -n debug -- sleep 3600
kubectl exec -it debug-backend -n debug -- /bin/sh
```

### Verification
```bash
kubectl get pods -n oranje-markt -l app=backend
# All pods should be Running with 0 recent restarts
kubectl rollout history deployment/backend -n oranje-markt
# Should show the rollback revision
```

### Prevention
- Use rolling update strategy with `maxUnavailable: 0` for zero-downtime deploys
- Add startup probes so Kubernetes waits for the app to initialize
- Run integration tests in CI/CD before deploying to production
- Use canary deployments for high-risk changes
- Set `revisionHistoryLimit` to keep rollback options available
