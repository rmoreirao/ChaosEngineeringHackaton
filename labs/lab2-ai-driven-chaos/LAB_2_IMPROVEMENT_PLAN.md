# Lab 2 — Improvement Plan


### BUG-2: Node count mismatch — teams.json says 2, cluster has 1

**Severity:** 🟡 Medium
**Location:** `infra/azure/teams.json` line 10 + `infra/azure/README.md`

**Problem:** `teams.json` specifies `"systemNodeCount": 2`, but the actual cluster only has 1 node. The solutions README references "3 nodes" in places (e.g., Bonus section: "0/3 nodes are available: 3 Insufficient memory"). Students may be confused by the discrepancy.

**Fix:** Adjust the infra as code to create whatever is specified on `teams.json` (2 nodes).

---

### BUG-3: Backend cascading failure during postgres experiment (undocumented)

**Severity:** 🟡 Medium
**Location:** Lab README Challenge 4, Solutions README Solution 4-5

**Problem:** When `postgres-0` is deleted, the backend's `/api/health` endpoint returns HTTP 503. Since this same endpoint is used by the **liveness probe**, Kubernetes kills and restarts the backend pod too. This creates a **cascading failure** that extends the outage significantly (~30s DB recovery + ~30s backend restart = ~60s+ total).

The lab and solutions do not mention this cascading behavior. The solutions predict "20-30 seconds" recovery but actual recovery is longer because the backend gets restarted.

**Evidence from execution:**
```
14s Normal  Killing   pod/backend-...  Container backend failed liveness probe, will be restarted
14s Warning Unhealthy pod/backend-...  Liveness probe failed: HTTP probe failed with statuscode: 503
```

**Fix:** Add a note in Challenge 4 and the solutions:

```markdown
> **⚠️ Cascading Failure:** When postgres is down, the backend health endpoint returns 503.
> Since the **liveness probe** uses this same endpoint, Kubernetes will restart the backend
> pod after 3 consecutive failures (~30s). This is a cascading failure worth documenting —
> it extends the total outage beyond the database recovery time alone.
```

---

### BUG-4: `tail` and bash syntax in commands — breaks on Windows/PowerShell

**Severity:** 🟡 Medium
**Location:** README.md lines 318, 433, 639 + throughout

**Problem:** The lab has a Windows/PowerShell note at the top, but the actual commands in Challenges 3-5 use `tail -20`, `tail -10`, and bash syntax without providing PowerShell equivalents inline. Students must mentally translate every command.

Specific broken commands:
- `kubectl get events ... | tail -20` → should be `| Select-Object -Last 20`
- `kubectl logs ... --tail=50 --since=5m` (this works in kubectl, but the pipe to `tail` does not)
- Solution scripts use `#!/bin/bash`, `$(date -u +...)`, `$?`, `sleep 5`, etc.

**Fix:** Provide dual-language examples (bash + PowerShell) for key commands, or use kubectl-native flags that work cross-platform:
```powershell
# Instead of: kubectl get events ... | tail -20
kubectl get events -n oranje-markt --sort-by='.lastTimestamp' | Select-Object -Last 20
```

---
