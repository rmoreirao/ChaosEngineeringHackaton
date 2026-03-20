# Lab 3 — AI-Driven Resilience Improvement

## Objective

Labs 1 and 2 took you through the chaos engineering lifecycle: identifying risks, forming hypotheses, injecting failures, and observing results. Now it's time for the final phase — **Learn & Improve**.

In this lab you will use GenAI to **analyze your chaos experiment findings**, generate a **prioritized resilience roadmap**, and **implement quick wins** to harden the system — then prove they work by re-running chaos experiments.

By the end of this lab you will:
- Use AI to turn chaos experiment findings into actionable improvements across K8s, infrastructure, observability, and code
- Implement concrete resilience fixes (replicas + PDB)
- Validate improvements by re-running a chaos experiment and comparing before/after results

## Prerequisites

- Completed Lab 1 and Lab 2
- GitHub Copilot available (VS Code Chat, Copilot CLI, or Agent Mode)
- `kubectl` connected to the AKS cluster
- Metrics Server running on the cluster (for HPA — verify: `kubectl get pods -n kube-system | grep metrics`)

### Bring Your Findings from Labs 1-2

You'll need your observations from the earlier labs. If you didn't write them down, here's a quick recap of what you likely saw:

- **Pod kill:** How long was the app down after deleting a backend pod?
- **DB kill:** Did killing the database pod cause the backend to restart too (cascading failure)?
- **Node drain:** Were all pods evicted at once? Any protection?
- **Load test:** At what point did the backend saturate? What was the CPU limit?

### Verify Your Environment

Before starting, confirm your cluster is healthy and note your **team-specific container registry** — you'll need this if you apply manifests:

```bash
# Verify cluster connectivity
kubectl get nodes

# Verify app is running
kubectl get pods -n oranje-markt

# IMPORTANT: Note your team's container registry (ACR)
# The repo manifests may reference a different ACR than what's deployed.
# Always check what's actually running:
kubectl get deploy backend -n oranje-markt \
  -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

> ⚠️ **ACR mismatch warning:** The K8s manifests in the repo may reference a generic ACR (e.g., `devaihackathonacr.azurecr.io`), but your cluster uses a team-specific ACR (e.g., `kadchaosteam1acr.azurecr.io`). If you apply manifests that change the pod template, you **must** use the correct image reference or pods will fail with `ErrImagePull`. The safest approach for scaling is to use `kubectl scale` instead of re-applying deployment manifests.

---

## Challenge 1 — AI Resilience Analysis (~5 min)

**Goal:** Feed your chaos experiment findings and the application architecture to AI, and get back a **prioritized resilience improvement roadmap**.

### How to Give AI the Repo Context

Everything the AI needs is in the GitHub repo. Here's how to provide context depending on your tool:

| Tool | How to provide repo context |
|------|---------------------------|
| **VS Code Copilot Chat** | Open the repo folder, use **Agent Mode** — Copilot automatically sees your workspace files |
| **Copilot CLI** | `cd` into the repo folder and ask questions — it reads files on demand |
| **VS Code Chat (manual)** | Reference specific files with `#file:infra/k8s/backend/deployment.yaml` |

### Ask AI for a Resilience Assessment

Use this prompt — **replace the findings with your own observations from Labs 1-2:**

> *"Look at this repository — it contains a 3-tier application (Next.js frontend, Express backend, PostgreSQL) deployed on AKS. Review the Kubernetes manifests in `infra/k8s/`, the backend code in `backend/src/`, the frontend code in `frontend/src/`, and the observability setup in `infra/observability/`.*
>
> *We ran chaos experiments and found these issues (replace with YOUR findings):*
> *1. [Your observation from pod kill experiment]*
> *2. [Your observation from database kill experiment]*
> *3. [Your observation from node drain experiment]*
> *4. [Your observation from load test]*
>
> *Based on the actual source code and infrastructure config, what are the top resilience improvements? Organize by layer: Kubernetes, Infrastructure, Observability, and Application Code. Prioritize by impact and effort."*

### Review the Roadmap

The AI should produce a structured improvement plan covering multiple layers. Look for improvements like:

| Layer | Improvement | Impact | Effort |
|-------|-------------|--------|--------|
| **Kubernetes** | Increase replicas to 3 + add PodDisruptionBudget | High | Low |
| **Kubernetes** | Add HorizontalPodAutoscaler | High | Low |
| **Kubernetes** | Add topology spread constraints | Medium | Low |
| **Infrastructure** | Database backup CronJob | High | Medium |
| **Observability** | Add Prometheus alerting rules for error rate & pod restarts | High | Medium |
| **Code** | Add retry logic with backoff to database queries | High | Medium |
| **Code** | Separate liveness from readiness probe (don't check DB in liveness) | High | Low |

> **Key insight:** The AI identifies improvements across **all layers** — not just Kubernetes manifests. Resilience is a cross-cutting concern: K8s configurations, infrastructure, observability, and application code all play a role.

---

## Challenge 2 — Implement Quick Wins (~10 min)

**Goal:** Harden the backend with replicas + PDB, then optionally try a bonus improvement.

### Step 1 — Scale to 3 Replicas + Add PDB (Required)

This is the highest-impact, lowest-effort improvement. You have two approaches:

#### Approach A: Quick — kubectl commands (recommended)

The fastest path — no manifests to debug:

```bash
# Scale backend to 3 replicas
kubectl scale deployment/backend -n oranje-markt --replicas=3

# Watch pods come up
kubectl get pods -n oranje-markt -l app=backend -w
```

Once all 3 pods are Running, create a PodDisruptionBudget:

```bash
kubectl apply -f - <<'EOF'
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: backend-pdb
  namespace: oranje-markt
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: backend
EOF
```

Verify:

```bash
kubectl get pods -n oranje-markt -l app=backend    # 3 pods Running?
kubectl get pdb -n oranje-markt                     # PDB active, ALLOWED DISRUPTIONS: 2?
```

#### Approach B: AI-generated manifest

Ask Copilot to generate a hardened deployment manifest. **Important:** tell Copilot to check the running image first:

> *"Look at the backend deployment in `infra/k8s/backend/` and improve it: increase to 3 replicas, add a PodDisruptionBudget with minAvailable: 1, and add topology spread constraints. Before generating the YAML, check what container image the deployment is currently using — the repo manifests may reference a different ACR than what's deployed."*

> ⚠️ Before applying any generated manifest, verify the image reference matches your cluster: `kubectl get deploy backend -n oranje-markt -o jsonpath='{.spec.template.spec.containers[0].image}'`

### Step 2 — Verify Health

```bash
kubectl port-forward svc/backend -n oranje-markt 4000:4000 &
curl http://localhost:4000/api/health    # Should return {"status":"ok"}
```

### Bonus Options (if time allows)

If you finish Step 1 quickly, try one of these:

<details>
<summary><strong>Bonus A: Add HorizontalPodAutoscaler</strong></summary>

> *"Create a HorizontalPodAutoscaler for the backend deployment targeting 70% CPU utilization, with min 2 and max 5 replicas."*

```bash
kubectl apply -f <generated-hpa.yaml>
kubectl get hpa -n oranje-markt -w
```

> **Note:** HPA requires metrics-server. Verify it's running: `kubectl get pods -n kube-system | grep metrics`

</details>

<details>
<summary><strong>Bonus B: Prometheus Alerting Rules</strong></summary>

> *"Based on these chaos experiment findings [pod failures, DB cascading failure, CPU saturation], generate Prometheus alerting rules. Look at the metrics middleware in `backend/src/middleware/metrics.ts` and the Prometheus config in `infra/observability/` for available metric names."*

</details>

<details>
<summary><strong>Bonus C: Code-Level Improvements (Advanced)</strong></summary>

> *"Look at the health endpoint in `backend/src/server.ts` — it's used for both liveness and readiness probes, and it queries the database. When the database is down, Kubernetes kills the backend pod too (cascading failure). How should I separate liveness from readiness to prevent this?"*

Or:

> *"Look at the Prisma database client in `backend/src/lib/prisma.ts`. Add retry logic with exponential backoff for transient database failures."*

</details>

---

## Challenge 3 — Validate: Re-run Chaos Experiment (~10 min)

**Goal:** Close the chaos engineering loop — prove your improvements work by re-running an experiment and comparing before/after.

### Step 1 — Start a Continuous Health Check

Open a **separate terminal** and start monitoring before you inject chaos:

```bash
# Continuous health check — watch for failures during the experiment
kubectl port-forward svc/backend -n oranje-markt 4000:4000 &
while true; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health 2>/dev/null)
  echo "$(date +%H:%M:%S) — HTTP $CODE"
  sleep 1
done
```

### Step 2 — Kill a Backend Pod

In your **main terminal:**

```bash
# Before (Lab 1 result): single pod → ~30s full outage
# After (Lab 3): 3 replicas + PDB → expect zero downtime

kubectl delete pod -n oranje-markt -l app=backend --wait=false
kubectl get pods -n oranje-markt -l app=backend -w
```

Watch the health check terminal — do you see any failed requests?

### Step 3 — Compare Results

| Metric | Before (Lab 1 — 1 replica) | After (Lab 3 — 3 replicas + PDB) |
|--------|---------------------------|----------------------------------|
| Pods serving during kill | 0 | 2 |
| Downtime | ~30s | **Zero** |
| Recovery visibility | Manual checking | Transparent to users |
| Node drain protection | None — all evicted | PDB blocks eviction below minAvailable |

**Expected outcome:**
- ✅ App remains available during pod kill (2 remaining pods serve traffic)
- ✅ Replacement pod starts automatically within seconds
- ✅ Health check shows continuous HTTP 200 responses

> **Discussion:** How does this improvement change the risk score from Lab 2's FMA? What weaknesses remain?

---

## Challenge 4 — Cleanup & Wrap-up (~5 min)

### Verify Final State

```bash
kubectl get deployments -n oranje-markt    # Replicas > 1?
kubectl get pdb -n oranje-markt            # PDBs active?
kubectl get hpa -n oranje-markt            # HPA tracking? (if created)
kubectl get pods -n oranje-markt
```

### Restore Original State (optional)

To restore the original (fragile) state, use `kubectl scale` — do **not** re-apply the repo manifests (they may reference a different ACR):

```bash
kubectl scale deployment/backend -n oranje-markt --replicas=1
kubectl scale deployment/frontend -n oranje-markt --replicas=1
kubectl delete pdb -n oranje-markt --all
kubectl delete hpa -n oranje-markt --all
```

### Prepare for Sharing
Think about what you'll present:
- What did the AI's resilience roadmap look like? What layers did it cover?
- Which improvement(s) did you implement? Why those?
- What was the before/after result of your validation experiment?
- What would you tackle next from the roadmap?

---

## Summary

| Concept | What You Learned |
|---------|------------------|
| **AI resilience analysis** | GenAI can analyze chaos findings and produce improvement roadmaps across all layers — K8s, infra, observability, and code |
| **Quick wins** | Replicas + PDB is the highest-impact, lowest-effort resilience improvement for most K8s workloads |
| **Validation loop** | Always re-run chaos experiments after improvements to prove they work (before/after) |
| **Cross-layer thinking** | Resilience isn't just K8s manifests — code (retries, circuit breakers), observability (alerting), and infra (backups, managed services) all matter |

## Key Takeaways

1. **Experiments → Improvements:** Chaos engineering isn't just about breaking things — the real value is in the improvements you make based on findings
2. **AI accelerates the loop:** GenAI can turn raw experiment data into prioritized, actionable improvement plans in seconds
3. **Start with quick wins:** Replicas + PDB eliminate the most common failure mode (single-pod outage) with minimal effort
4. **All layers matter:** The AI roadmap should remind you that resilience spans code, K8s, observability, and infrastructure — don't stop at manifests
5. **Validate, validate, validate:** The only way to prove resilience is to re-run the chaos experiment and compare

## Bonus Resources

The [`solutions/`](solutions/) folder contains additional reference material:

| Resource | Description |
|----------|-------------|
| [`solutions/manifests/`](solutions/manifests/) | Hardened K8s manifests (backend, frontend, postgres PDB) |
| [`solutions/scripts/detect-anomalies.sh`](solutions/scripts/detect-anomalies.sh) | Automated health check script (5 checks) |
| [`solutions/scripts/runbook.md`](solutions/scripts/runbook.md) | Resilience runbook for 5 failure scenarios |
| [`solutions/README.md`](solutions/README.md) | Full solutions walkthrough |

---

> **Stuck?** Check the [solutions](solutions/) folder for hardened manifests, example AI prompts, and expected outputs.
