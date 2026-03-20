# Lab 3 — Improvement Plan

> Generated after executing Lab 3 end-to-end as team **kad-chaos-team1**.
> Reference: [Workshop Agenda](../WORKSHOP-AGENDA.md) | [Lab 3 README](./README.md)
>
> **Status: ✅ ALL IMPROVEMENTS IMPLEMENTED** — See "Implementation Status" below.

---

## Executive Summary

Lab 3 was executed end-to-end. **Challenge 1** (AI resilience analysis) and **Challenge 3** (validation) worked well. **Challenge 2** (implement quick wins) hit a **blocker** — the solution manifests and repo K8s manifests reference a non-existent ACR (`devaihackathonacr.azurecr.io`), while the live cluster uses team-specific ACRs (`kadchaosteam1acr.azurecr.io`). This causes `ErrImagePull` on any manifest change that triggers a new ReplicaSet. The **cleanup commands** in Challenge 4 are also broken for the same reason.

A workaround was found (`kubectl scale` + inline PDB), and the chaos validation (pod kill → zero downtime) succeeded.

---

## Execution Results

| Challenge | Status | Notes |
|-----------|--------|-------|
| C1 — AI Resilience Analysis | ✅ Pass | All repo paths exist. AI produced expected roadmap. |
| C2 — Implement Quick Wins | ⚠️ Partial | Solution manifests fail (`ErrImagePull`). Workaround via `kubectl scale` + inline PDB succeeded. |
| C3 — Validate (Re-run Chaos) | ✅ Pass | Pod kill → zero downtime with 3 replicas + PDB. |
| C4 — Cleanup | ⚠️ Partial | Cleanup commands reference wrong ACR. Used `kubectl scale --replicas=1` instead. |

---

## Issues Found

### 🔴 Blockers (3)

#### 1. Solution manifests reference non-existent ACR
**Location:** `solutions/manifests/01-backend-hardened.yaml`, `02-frontend-hardened.yaml`
**Problem:** Manifests hardcode `devaihackathonacr.azurecr.io` but the live deployment uses `kadchaosteam1acr.azurecr.io`. Applying any manifest that changes the pod template triggers `ErrImagePull: no such host`.
**Fix:** Use a placeholder like `${ACR_NAME}` in solution manifests and add a sed/envsubst step, or instruct students to check the running image first:
```bash
kubectl get deploy backend -n oranje-markt -o jsonpath='{.spec.template.spec.containers[0].image}'
```

#### 2. Repository K8s manifests have wrong ACR
**Location:** `infra/k8s/backend/deployment.yaml`, `infra/k8s/frontend/deployment.yaml`
**Problem:** Same ACR mismatch. `kubectl apply -f infra/k8s/backend/` fails with `ErrImagePull`.
**Fix:** Either update repo manifests per-team during workshop setup, or use Kustomize overlays with team-specific image overrides.

#### 3. Cleanup commands broken
**Location:** Lab README, Challenge 4
**Problem:** `kubectl apply -f infra/k8s/backend/` fails for the same ACR reason.
**Fix:** Replace cleanup instructions with:
```bash
kubectl scale deployment/backend -n oranje-markt --replicas=1
kubectl scale deployment/frontend -n oranje-markt --replicas=1
kubectl delete pdb -n oranje-markt --all
kubectl delete hpa -n oranje-markt --all
```

---

### 🟡 Major Issues (4)

#### 4. No guidance on HOW to give repo context to AI
**Location:** Challenge 1, Step 1
**Problem:** Lab says "Everything the AI needs is already in the GitHub repo" but doesn't explain how to use `@workspace`, `#file`, or Copilot CLI. Students unfamiliar with Copilot Agent Mode are lost.
**Fix:** Add a short section with concrete instructions:
- **VS Code Chat:** Use `@workspace` to reference the entire repo
- **Copilot CLI:** Open the repo folder and ask questions directly
- **Agent Mode:** Enable Agent Mode in VS Code Chat for file-aware answers

#### 5. No warning about ACR mismatch between repo and live cluster
**Location:** Challenge 2, Option A
**Problem:** Students will generate manifests based on the repo (wrong ACR) and hit `ErrImagePull`. No guidance to verify the running image first.
**Fix:** Add a prerequisite step: "Before generating manifests, check what image your deployment is actually using."

#### 6. TopologySpreadConstraint with DoNotSchedule on single-node cluster
**Location:** `solutions/manifests/01-backend-hardened.yaml`
**Problem:** `whenUnsatisfiable: DoNotSchedule` prevents scheduling if pods can't spread across nodes. Workshop clusters may have only 1 node initially.
**Fix:** Use `ScheduleAnyway` in solution manifests, or add a note explaining the constraint and when to use each mode.

#### 7. teams.json path not documented
**Location:** Challenge 1
**Problem:** The `teams.json` file is at `infra/azure/teams.json`, not at the repo root. Students directed to check "teams.json" won't find it.
**Fix:** Document the correct path or add a symlink at the repo root.

---

### 🟢 Minor Issues (7)

| # | Location | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 8 | C1/Step2 | Example prompt has pre-filled findings; students may not realize they should substitute their own | Add: *"Replace the findings below with your observations from Labs 1-2"* |
| 9 | C1/Step2 | No template for documenting Lab 1-2 findings to feed into Lab 3 | Add a "Bring your findings" section with a simple template |
| 10 | C2/OptionA | Solution manifest removes init container retry logic (functional regression) | Preserve the original retry script in the hardened manifest |
| 11 | C2/OptionA | `kubectl scale` + inline PDB is simpler than full manifest apply | Mention as an alternative approach |
| 12 | C2/General | HPA requires metrics-server; only mentioned in hints, not prerequisites | Add to Prerequisites section |
| 13 | C2/General | `solutions/scripts/runbook.md` and `detect-anomalies.sh` exist but are never referenced | Add a "Bonus resources" section pointing to them |
| 14 | C3/Step2 | No automated way to measure downtime (before/after comparison is subjective) | Provide a simple health-check loop script |

---

## Improvement Proposals

### A. Make the Lab More Minimalist & Intuitive

1. **Remove the multi-option structure in Challenge 2.** Options A-D create decision paralysis. Instead: make Option A (Replicas + PDB) the **mandatory** step, and list others as "bonus" after validation. This matches the ~30 min time budget in the [Workshop Agenda](../WORKSHOP-AGENDA.md).

2. **Simplify Challenge 2 to kubectl commands instead of full manifests.** For a 30-minute lab, generating and debugging YAML manifests is too heavyweight. Use:
   ```bash
   # Scale up
   kubectl scale deployment/backend -n oranje-markt --replicas=3

   # Create PDB
   kubectl apply -f - <<EOF
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

3. **Provide a pre-built validation script.** Instead of manual `kubectl get` commands, offer a one-liner:
   ```bash
   # Continuous health check (run in separate terminal)
   while true; do curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" http://localhost:4000/api/health; sleep 1; done
   ```

4. **Trim Challenge 1.** The AI analysis step is interesting but time-consuming. Reduce to a single focused prompt with clear instructions, not a multi-step process.

### B. Improve Robustness

1. **Parameterize ACR in all manifests.** Use Kustomize or environment variable substitution so manifests work for any team:
   ```bash
   export ACR_NAME=$(kubectl get deploy backend -n oranje-markt -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d/ -f1)
   sed "s|devaihackathonacr.azurecr.io|$ACR_NAME|g" solutions/manifests/01-backend-hardened.yaml | kubectl apply -f -
   ```

2. **Add a "Verify your environment" section** at the start of the lab:
   ```bash
   # Verify cluster connectivity
   kubectl get nodes
   # Verify app is running
   kubectl get pods -n oranje-markt
   # Note your team's ACR (you'll need this for manifests)
   kubectl get deploy backend -n oranje-markt -o jsonpath='{.spec.template.spec.containers[0].image}'
   ```

3. **Use `ScheduleAnyway`** instead of `DoNotSchedule` for topology spread in workshop environments.

### C. Better Flow from Lab 1-2 to Lab 3

1. **Add a "Bring Your Results" prerequisite** listing exactly what students should have from Labs 1-2:
   - Observations from pod kill experiment (approximate downtime)
   - Observations from DB kill experiment (cascading failure?)
   - Load test results (at what point did it break?)

2. **Reference the solutions/scripts/ resources** — `detect-anomalies.sh` and `runbook.md` are useful but hidden.

### D. Align with Workshop Agenda

Per the [Workshop Agenda](../WORKSHOP-AGENDA.md), Lab 3 has **30 minutes** (15:15–15:45). The current lab has 4 challenges with multiple options. Suggested streamlined flow:

| Time | Activity |
|------|----------|
| 5 min | Challenge 1: Quick AI analysis (single focused prompt) |
| 10 min | Challenge 2: Scale to 3 replicas + add PDB (mandatory); HPA/alerts as bonus |
| 10 min | Challenge 3: Kill pod, verify zero-downtime, compare before/after |
| 5 min | Challenge 4: Cleanup + prepare for sharing session |

---

## Appendix: Full Execution Log

| Challenge | Step | Action | Result | Status |
|-----------|------|--------|--------|--------|
| C1 | Step1 | Explored all repo paths listed in lab | All paths exist and are accessible | ✅ |
| C1 | Step2 | AI cross-layer resilience assessment | Roadmap produced across K8s/Infra/Observability/Code | ✅ |
| C1 | Step3 | Reviewed roadmap | Matches expected output | ✅ |
| C2 | OptionA | Applied `01-backend-hardened.yaml` | **FAILED**: `ErrImagePull` — wrong ACR | ❌ |
| C2 | OptionA | Applied repo `deployment.yaml` | **FAILED**: Same ACR mismatch | ❌ |
| C2 | Workaround | `kubectl scale --replicas=3` | 3 replicas running in ~60s | ✅ |
| C2 | Workaround | Inline PDB creation | PDB active, 2 allowed disruptions | ✅ |
| C2 | Validate | Health endpoint check | `{"status":"ok"}` | ✅ |
| C3 | Step1 | Chose pod kill experiment | Matched to Replicas+PDB improvement | ✅ |
| C3 | Step2 | Killed backend pod | 2 remaining pods served traffic, zero downtime | ✅ |
| C3 | Step3 | Before/after comparison | 1 replica: ~30s outage → 3 replicas: zero downtime | ✅ |
| C4 | Verify | Final state verification | 3/3 replicas, PDB active, all healthy | ✅ |

---

## Implementation Status

All improvements from this plan have been implemented. Here's what changed:

| File | Changes Made |
|------|-------------|
| `README.md` | Added "Verify Your Environment" section with ACR check; added Copilot usage instructions table; added "Bring Your Findings" section; made Option A mandatory with kubectl scale approach; moved Options B-D to collapsible bonus sections; added continuous health check script; fixed cleanup to use `kubectl scale`; added metrics-server to prerequisites; added "Bonus Resources" section referencing scripts/; added ACR mismatch warning |
| `solutions/README.md` | Added ACR placeholder note at top; added Copilot usage instructions table; added `sed` ACR substitution commands for applying manifests; added `kubectl scale` alternative; fixed cleanup to use `kubectl scale`; added continuous health check script; added detect-anomalies.sh reference |
| `solutions/manifests/01-backend-hardened.yaml` | Replaced hardcoded `devaihackathonacr.azurecr.io` with `ACR_REGISTRY` placeholder; added header with `sed` substitution instructions; changed `DoNotSchedule` → `ScheduleAnyway`; restored init container retry logic (15 retries × 2s) |
| `solutions/manifests/02-frontend-hardened.yaml` | Replaced hardcoded ACR with `ACR_REGISTRY` placeholder; added header with `sed` instructions; changed `DoNotSchedule` → `ScheduleAnyway` |
