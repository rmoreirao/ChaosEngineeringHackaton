# Lab 3 — AI-Driven Resilience Improvement

## Objective

Apply lessons learned from Labs 1 and 2 to **harden the Oranje Markt application** using AI-assisted tools. Use GitHub Copilot to generate resilience configurations, build automated detection, and create operational runbooks.

By the end of this lab you will:
- Use AI to generate hardened Kubernetes manifests (replicas, PDBs, HPA, topology spread)
- Improve database resilience with AI-suggested strategies
- Build a simple anomaly detection script with Copilot's help
- Create a resilience runbook for the application
- Validate improvements by re-running chaos experiments from Lab 1

## Prerequisites
- Completed Lab 1 and Lab 2
- Understanding of failures observed (pod kills, database failures, load issues)
- GitHub Copilot available
- `kubectl` connected to the AKS cluster

---

## Challenge 1 — Generate Resilience Improvements with AI

**Goal:** Based on failures observed in Labs 1-2, use GitHub Copilot to generate hardened Kubernetes manifests that address the weaknesses you discovered.

**Requirements:**
1. Ask GitHub Copilot to improve the backend deployment. Example prompts:
   - "Add a Pod Disruption Budget for this Kubernetes deployment that ensures at least 1 pod is always available: [paste current backend deployment YAML]"
   - "Increase this deployment to 3 replicas and add topology spread constraints to distribute pods across nodes"
   - "Create a Horizontal Pod Autoscaler for the backend deployment with min 2, max 5 replicas, targeting 70% CPU"
2. Review each generated manifest for correctness
3. Apply the improvements:
   ```bash
   kubectl apply -f <generated-manifest>
   ```
4. **Validate:** Re-run a chaos experiment from Lab 1 (e.g., kill a pod, drain a node) and compare the result
   - With 1 replica: pod kill = full outage
   - With 3 replicas + PDB: pod kill = zero downtime

**What to observe:**
- Does the app stay available when you kill a pod now?
- Does the PDB prevent all pods from being evicted during node drain?
- Does the HPA scale up under load?
- How does the behavior compare to Lab 1?

**Hints:**
- Start with replicas (easiest win), then add PDB, then HPA
- Use `kubectl get pdb -n oranje-markt` to verify PDB status
- Use `kubectl get hpa -n oranje-markt -w` to watch autoscaling in action
- The HPA needs the metrics-server to be running (already part of AKS)
- For the topology spread constraint, use `topologyKey: kubernetes.io/hostname`

> **Discussion:** What is the minimum set of resilience configurations every production deployment should have? How do you decide between `minAvailable` and `maxUnavailable` in a PDB?

---

## Challenge 2 — Harden the Database

**Goal:** Use AI to propose and implement database resilience strategies for the in-cluster PostgreSQL.

**Requirements:**
1. Paste the current PostgreSQL StatefulSet YAML into Copilot and ask:
   - "How can I make this PostgreSQL StatefulSet more resilient? It currently runs as a single pod with no replication."
   - "Create a Kubernetes CronJob that backs up this PostgreSQL database every hour using pg_dump"
2. Implement at least one improvement:
   - Option A: Add a PDB for PostgreSQL (`minAvailable: 1`)
   - Option B: Create a backup CronJob using `pg_dump`
   - Option C: Ask Copilot about migrating to Azure Database for PostgreSQL Flexible Server (discussion only)
3. Test the improvement:
   - If PDB: try draining the node running postgres — the drain should block
   - If backup: verify the CronJob creates a backup, then kill the database pod and restore from backup

**What to observe:**
- How does a PDB protect a single-replica StatefulSet?
- Does the backup CronJob run successfully?
- How would migration to a managed database service change the architecture?

**Hints:**
- For the backup CronJob, the pod needs the PostgreSQL client tools (`postgres:16-alpine` image has them)
- The database credentials are in the `postgres-secret` Secret
- A PDB on a single-replica StatefulSet will block node drains — this is a feature, not a bug
- Use `kubectl get cronjob -n oranje-markt` to check the CronJob status

> **Discussion:** When is it appropriate to run a database in Kubernetes vs. using a managed service? What are the trade-offs of each approach?

---

## Challenge 3 — Build a Simple Detection Script

**Goal:** Create a script (with GitHub Copilot's help) that detects anomalies in the Oranje Markt namespace — an early warning system.

**Requirements:**
1. Use GitHub Copilot CLI or Copilot Chat to generate a shell script that:
   - Lists all pods in `oranje-markt` namespace and flags any that are NOT in `Running` state
   - Checks for pods with high restart counts (> 3 restarts)
   - Checks if any Service endpoints are empty (no backends serving traffic)
   - Outputs results as a simple report (console output or JSON)
2. Example prompt for Copilot CLI:
   ```
   gh copilot suggest "Write a bash script that checks all pods in namespace oranje-markt for non-Running status, high restart counts over 3, and empty service endpoints, and prints a report"
   ```
3. Run the script against your cluster
4. Introduce a failure (kill a pod) and run it again — verify it detects the issue

**What to observe:**
- Does the AI-generated script work out of the box or need modifications?
- What anomalies does it catch? What does it miss?
- How would you extend it to run continuously (cron, watch loop)?

**Hints:**
- Keep it simple: bash + kubectl is fine. No need for Python or complex tooling
- Use `kubectl get pods -n oranje-markt -o json` for structured output
- Use `kubectl get endpoints -n oranje-markt -o json` for endpoint checks
- `jq` is useful for parsing JSON output from kubectl
- The script doesn't need to be perfect — it's a starting point

> **Discussion:** How does a simple detection script compare to a full observability stack (Prometheus alerts)? When would you use each?

---

## Challenge 4 — Design a Resilience Runbook

**Goal:** Use AI to create a resilience runbook for the Oranje Markt application — a documented set of procedures for handling common failures.

**Requirements:**
1. Ask GitHub Copilot to generate a runbook covering these failure scenarios:
   - **Pod failure**: A backend or frontend pod crashes
   - **Database failure**: PostgreSQL pod is unresponsive
   - **Node failure**: An AKS node goes NotReady
   - **High load**: Application is under heavy traffic
   - **Deployment failure**: New deployment is stuck in CrashLoopBackOff
2. Each runbook entry should follow this format:
   - **Detection**: How to detect the issue (commands, metrics, alerts)
   - **Diagnosis**: How to determine root cause (logs, events, kubectl commands)
   - **Remediation**: Step-by-step fix procedures
   - **Verification**: How to confirm the fix worked
   - **Prevention**: How to prevent recurrence
3. Review and customize the AI-generated runbook for the Oranje Markt application
4. Test at least one runbook entry by simulating the failure and following the procedure

**What to observe:**
- How complete is the AI-generated runbook?
- What gaps did you find that need human expertise to fill?
- How useful would this be for an on-call engineer at 3 AM?

**Hints:**
- Provide Copilot with the architecture context: "3-tier app on AKS with frontend, backend, PostgreSQL"
- Ask for specific kubectl commands, not just general advice
- Include the monitoring commands (Grafana URLs, Prometheus queries)
- A good runbook should be usable by someone who didn't build the system

> **Discussion:** How can AI help build and maintain operational runbooks? What is the human role in validating and updating AI-generated procedures?

---

## Challenge 5 — Cleanup & Final State

Apply all your resilience improvements and demonstrate the hardened architecture:

```bash
# Verify resilience improvements
kubectl get deployments -n oranje-markt    # Should show multiple replicas
kubectl get pdb -n oranje-markt            # Should show PDBs
kubectl get hpa -n oranje-markt            # Should show HPA (if created)

# Run a final chaos experiment to prove resilience
# Kill a backend pod — app should stay available
kubectl delete pod -n oranje-markt -l app=backend --wait=false

# Verify zero downtime
kubectl get pods -n oranje-markt -w
```

If you want to restore to the original (fragile) state:
```bash
# Re-deploy original manifests
kubectl apply -f infra/k8s/backend/
kubectl apply -f infra/k8s/frontend/
kubectl delete pdb -n oranje-markt --all
kubectl delete hpa -n oranje-markt --all
```

---

## Summary

| Concept | What You Should Have Learned |
|---------|------------------------------|
| **Resilience manifests** | AI can generate PDBs, HPA, topology spread, and replica improvements from existing YAML |
| **Database hardening** | PDBs, backups, and managed service migration are key strategies for stateful workloads |
| **Anomaly detection** | Simple scripts can provide early warning for common Kubernetes issues |
| **Resilience runbooks** | AI-generated runbooks provide a starting point but need human review and customization |
| **Validation** | Always re-run chaos experiments after improvements to prove they work |

## Key Takeaways

1. **AI accelerates hardening**: Copilot can generate resilience configurations in seconds that would take minutes to write manually
2. **Validate improvements with chaos**: The only way to prove resilience is to test it — re-run Lab 1 experiments
3. **Defense in depth**: Replicas + PDB + HPA + monitoring = layers of protection
4. **Runbooks save lives**: Documented procedures reduce incident response time
5. **Continuous improvement**: Chaos engineering is not a one-time activity — it's an ongoing practice

---

> **Stuck?** Check the [solutions](solutions/) folder for hardened manifests, detection scripts, and a sample runbook.
