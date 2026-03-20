# Lab 3 — AI-Driven Resilience Improvement

## Objective

Labs 1 and 2 took you through the chaos engineering lifecycle: identifying risks, forming hypotheses, injecting failures, and observing results. Now it's time for the final phase — **Learn & Improve**.

In this lab you will use GenAI to **analyze your chaos experiment findings**, generate a **prioritized resilience roadmap** across all layers of the application, and **implement 1-2 quick wins** to harden the system — then prove they work by re-running chaos experiments.

By the end of this lab you will:
- Understand how AI can turn chaos experiment findings into actionable improvements across K8s, infrastructure, observability, and code
- Implement 1-2 concrete resilience fixes using AI-generated manifests or configurations
- Validate improvements by re-running a chaos experiment and comparing before/after results

## Prerequisites
- Completed Lab 1 and Lab 2
- Your chaos experiment findings from Labs 1-2 (FMA, experiment reports, observed failures)
- GitHub Copilot available (VS Code Chat, Copilot CLI, or Agent Mode)
- `kubectl` connected to the AKS cluster

---

## Challenge 1 — From Experiments to Improvements: AI Resilience Analysis

**Goal:** Feed your chaos experiment findings and the application architecture to AI, and get back a **prioritized resilience improvement roadmap** that spans all layers of the system.

### Step 1 — Point AI at the Repository

Everything the AI needs is already in the GitHub repo — no need to export YAMLs from the cluster. The repo contains the full picture:

- **Kubernetes manifests:** `infra/k8s/` (backend, frontend, postgres deployments, services, observability stack)
- **Backend source code:** `backend/src/` (Express server, routes, middleware, Prisma client, health endpoint)
- **Frontend source code:** `frontend/src/` (Next.js app, API client, components)
- **Infrastructure-as-Code:** `infra/azure/` (Bicep templates for AKS, networking, ACR)
- **Observability config:** `infra/observability/` (Prometheus scrape config, Grafana dashboards, Loki setup)
- **Database schema:** `backend/prisma/schema.prisma`

### Step 2 — Ask AI for a Cross-Layer Resilience Assessment

Open the repo in your IDE with Copilot and use **Agent Mode** or **Chat** with the repo as context. Combine the source code context with your experiment findings from Labs 1-2.

Example prompt:

> *"Look at this repository — it contains a 3-tier application (Next.js frontend, Express backend, PostgreSQL) deployed on AKS. Review the Kubernetes manifests in `infra/k8s/`, the backend code in `backend/src/`, the frontend code in `frontend/src/`, and the observability setup in `infra/observability/`.*
>
> *We ran chaos experiments and found these issues:*
> *1. Killing a backend pod causes ~30s downtime (single replica)*
> *2. Killing the database pod causes cascading failure — backend's liveness probe restarts it too*
> *3. Node drain evicts all pods simultaneously (no PDBs)*
> *4. Load test with 5 clients saturates backend CPU at 500m limit*
>
> *Based on the actual source code and infrastructure config, what are the top resilience improvements? Organize by layer: Kubernetes, Infrastructure, Observability, and Application Code. Prioritize by impact and effort."*

### Step 3 — Review the Roadmap

The AI should produce a structured improvement plan covering multiple layers. Look for improvements like:

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

> **Key insight:** Notice how the AI identifies improvements across **all layers** — not just Kubernetes manifests. Resilience is a cross-cutting concern: K8s configurations, infrastructure architecture, observability, and application code all play a role.

> **Discussion:** Which improvements would you prioritize first? Why? How does the AI's prioritization compare to your own judgment after running the experiments?

---

## Challenge 2 — Implement Quick Wins with AI

**Goal:** Pick 1-2 improvements from the roadmap and use AI to generate and apply the fix.

### Choose Your Improvement(s)

Select from the roadmap based on your team's interest. Here are suggested options, roughly ordered by impact and ease:

#### Option A: Add Replicas + PodDisruptionBudget (Recommended First Pick)

This is the highest-impact, lowest-effort improvement. Ask Copilot:

> *"Look at the backend deployment in `infra/k8s/backend/` and improve it: increase to 3 replicas, add a PodDisruptionBudget with minAvailable: 1, and add topology spread constraints to distribute pods across nodes. Also generate a startup probe since the init container (db-migrate) adds ~20s delay."*

Apply the generated manifests:
```bash
kubectl apply -f <generated-hardened-backend.yaml>
kubectl get pods -n oranje-markt -w    # Watch pods scale up
kubectl get pdb -n oranje-markt        # Verify PDB is active
```

#### Option B: Add HorizontalPodAutoscaler

> *"Create a HorizontalPodAutoscaler for the backend deployment targeting 70% CPU utilization, with min 2 and max 5 replicas."*

```bash
kubectl apply -f <generated-hpa.yaml>
kubectl get hpa -n oranje-markt -w     # Watch autoscaling decisions
```

#### Option C: Generate Prometheus Alerting Rules

> *"Based on these chaos experiment findings [pod failures, DB cascading failure, CPU saturation], generate Prometheus alerting rules that would detect these issues. Look at the metrics middleware in `backend/src/middleware/metrics.ts` and the Prometheus config in `infra/observability/` to understand what metrics are available."*

#### Option D: Code-Level Improvements (Advanced)

> *"Look at the Prisma database client in `backend/src/lib/prisma.ts`. Add retry logic with exponential backoff for transient database failures."*

Or:

> *"Look at the health endpoint in `backend/src/server.ts` — it's used for both liveness and readiness probes, and it queries the database. When the database is down, Kubernetes kills the backend pod too (cascading failure). How should I separate liveness from readiness to prevent this?"*

### Validate Your Changes

After applying, verify everything is healthy:
```bash
kubectl get pods -n oranje-markt                    # All pods Running?
kubectl get pdb -n oranje-markt                     # PDB active?
kubectl get hpa -n oranje-markt                     # HPA tracking?
kubectl port-forward svc/backend -n oranje-markt 4000:4000
curl http://localhost:4000/api/health               # Health OK?
```

**Hints:**
- Start with Option A (replicas + PDB) — it's the fastest path to proving resilience
- Always review AI-generated manifests before applying (check namespace, resource names, image references)
- Use `kubectl diff -f <manifest>` to preview changes before applying
- If HPA doesn't scale, check that metrics-server is running: `kubectl get pods -n kube-system | grep metrics`

---

## Challenge 3 — Validate: Re-run Chaos Experiments

**Goal:** Close the chaos engineering loop — prove your improvements work by re-running an experiment from Lab 1 and comparing before/after results.

### Step 1 — Pick an Experiment

Choose an experiment that matches your improvement:

| If You Implemented... | Re-run This Experiment |
|-----------------------|------------------------|
| Replicas + PDB | Kill a backend pod (Lab 1, Challenge 2) |
| Replicas + PDB | Drain a node (Lab 1, Challenge 5) |
| HPA | Load test to breaking point (Lab 1, Challenge 6) |
| Alerting rules | Kill a pod and check if alerts fire |

### Step 2 — Run the Experiment

Example — kill a backend pod (same as Lab 1):
```bash
# Before (Lab 1 result): single pod → ~30s full outage
# After (Lab 3): 3 replicas + PDB → expect zero downtime

kubectl delete pod -n oranje-markt -l app=backend --wait=false
kubectl get pods -n oranje-markt -w   # Watch: remaining pods serve traffic while replacement starts
```

### Step 3 — Compare Results

Ask Copilot to help analyze the before/after:

> *"Compare these two chaos experiment results:*
> *Before (1 replica, no PDB): Killing backend pod → 30s complete outage, 0 pods serving traffic during recovery*
> *After (3 replicas, PDB): Killing backend pod → [paste your observations]*
> *Produce a brief before/after comparison."*

**Expected outcome with replicas + PDB:**
- ✅ App remains available during pod kill (2 remaining pods serve traffic)
- ✅ Node drain is blocked by PDB (prevents evicting below minAvailable)
- ✅ Recovery is transparent to users (no downtime)

> **Discussion:** How does the improvement change the risk score from Lab 2's FMA? What weaknesses remain?

---

## Challenge 4 — Cleanup & Wrap-up

Verify your final state and prepare for the sharing session:

```bash
# Verify improvements are in place
kubectl get deployments -n oranje-markt    # Replicas > 1?
kubectl get pdb -n oranje-markt            # PDBs active?
kubectl get hpa -n oranje-markt            # HPA tracking? (if created)

# Verify app is healthy
kubectl get pods -n oranje-markt
```

If you want to restore the original (fragile) state:
```bash
kubectl apply -f infra/k8s/backend/
kubectl apply -f infra/k8s/frontend/
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

---

> **Stuck?** Check the [solutions](solutions/) folder for hardened manifests, example AI prompts, and expected outputs.
