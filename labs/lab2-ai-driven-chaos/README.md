# Lab 2 — AI-Driven Chaos Experiments

## Objective

Use GenAI tools to guide you through the **complete chaos engineering lifecycle** — from risk analysis to experiment execution to results analysis. Instead of manually crafting each step, you'll use GitHub Copilot and GitHub Copilot CLI as your co-pilot throughout the process.

By the end of this lab you will:

- Perform a **Failure Mode Analysis (FMA)** to identify and prioritize risks in the Oranje Markt architecture
- Generate **testable hypotheses** from the FMA using AI
- Use AI to **define steady-state metrics** and generate monitoring/verification scripts
- Use AI to **plan and generate chaos experiments** (disruption scripts)
- Use AI to **observe and analyze experiment results** — producing structured experiment reports
- Understand how context engineering improves AI output at every phase

## The Chaos Engineering Lifecycle

This lab follows the structured chaos engineering process:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Phase 0: Failure Mode Analysis                                     │
│  Understand risk, impact, and probability of failure modes          │
│                          ↓                                          │
│  Phase 1: Generate Hypotheses                                       │
│  "If X fails, then Y should happen because Z"                      │
│                          ↓                                          │
│  Phase 2: Run the Experiment                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  2.1 Define Steady State                                    │    │
│  │  Instrument, measure, establish baselines                   │    │
│  │                          ↓                                  │    │
│  │  2.2 Plan & Introduce Disruptions                           │    │
│  │  Inject the failure — this is the chaos experiment          │    │
│  │                          ↓                                  │    │
│  │  2.3 Observe Effects                                        │    │
│  │  Monitor, compare to steady state, analyze                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                          ↓                                          │
│  Learn & Improve → Feed back into Phase 0 (Lab 3)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Completed Lab 1 (you need hands-on experience with manual chaos)
- GitHub Copilot extension installed in VS Code
- GitHub Copilot CLI installed: `gh extension install github/gh-copilot`
- `kubectl` connected to the AKS cluster
- Oranje Markt application running and accessible
- Grafana accessible (port-forward on `:3001`)

> **🪟 Windows / PowerShell users:** Example scripts in this lab use bash syntax. Key differences:
> - Replace `tail -N` with `Select-Object -Last N`
> - Replace `head -N` with `Select-Object -First N`
> - In JSONPath filters, use single quotes: `@.type=='Ready'` instead of `@.type==\"Ready\"`
> - Alternatively, run bash scripts inside a pod: `kubectl run -it --rm shell --image=busybox -- /bin/sh`

> **🤖 Where to run Copilot prompts:** Use any of these tools depending on the task:
> - **VS Code Copilot Chat** (sidebar) — best for longer prompts, pasting YAML context, and analysis
> - **VS Code Agent Mode** (terminal integration) — best for autonomous execution (Extra Challenge)
> - **Copilot CLI** (`gh copilot suggest` / `gh copilot explain`) — best for quick command-line questions

## Reference Documentation

- [GitHub Copilot CLI documentation](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line)
- [Chaos Engineering principles](https://principlesofchaos.org/)
- [Context engineering lessons from Azure SRE Agent](https://techcommunity.microsoft.com/blog/appsonazureblog/context-engineering-lessons-from-building-azure-sre-agent/4481200)
- [Failure Mode Analysis (FMA) for Azure applications](https://learn.microsoft.com/azure/architecture/resiliency/failure-mode-analysis)

---

## Challenge 1 — Failure Mode Analysis (Phase 0)

**Goal:** Use GenAI to perform a **Failure Mode Analysis (FMA)** on the Oranje Markt architecture. Identify what can go wrong, assess the risk, impact, and probability of each failure mode.

**Why this matters:** Before running any chaos experiment, you need to understand _what_ to test and _why_. FMA gives you a prioritized list of risks so you focus on the most impactful failures first.

**Requirements:**

1. Gather the architecture context for Copilot:
   - Get the current deployment manifests:
     ```bash
     kubectl get deployments -n oranje-markt -o yaml
     kubectl get statefulsets -n oranje-markt -o yaml
     kubectl get services -n oranje-markt -o yaml
     ```
   - Review the architecture diagram in [`infra/azure/README.md`](../../infra/azure/README.md)

2. Ask GitHub Copilot to perform an FMA. Paste the architecture context and use a prompt like:
   ```
   I have a 3-tier application on AKS:
   - Frontend (Next.js, 1 replica) → Backend (Express, 1 replica) → PostgreSQL (StatefulSet, 1 replica, PVC)
   - Observability: Prometheus + Grafana (in-cluster)
   - No Pod Disruption Budgets, no autoscaling, no network policies
   
   Here are the deployment YAMLs: [paste]
   
   Perform a Failure Mode Analysis. For each failure mode, provide:
   - Failure Mode: what can go wrong
   - Component: which component is affected
   - Impact: what happens to the user experience (Critical/High/Medium/Low)
   - Probability: how likely is this (High/Medium/Low)
   - Risk Score: Impact × Probability
   - Detection: how would we know this happened
   - Current Mitigation: what's in place today (if anything)
   
   Format as a markdown table sorted by risk score (highest first).
   ```

3. Review the AI-generated FMA table. Add or remove entries based on your Lab 1 experience — you already broke some of these things!

4. **Pick your top 3 failure modes** — these will be the experiments you run in the rest of this lab.

**What to observe:**
- Does Copilot identify the same weaknesses you discovered in Lab 1?
- Does it catch failure modes you hadn't considered?
- How does providing the actual YAML (vs. just a description) change the quality of the analysis?

**Hints:**
- The more context you provide (YAML, architecture, node count, resource limits), the better the FMA
- Cross-reference with the "Intentional Weaknesses" table in [`labs/README.md`](../README.md)
- Ask Copilot to also suggest which failure modes are best suited for automated chaos testing vs. manual review

> **Discussion:** How does FMA differ from traditional risk analysis? Why is it important to assess both impact AND probability when prioritizing chaos experiments?

---

## Challenge 2 — Generate Hypotheses (Phase 1)

**Goal:** For each of your top 3 failure modes from Challenge 1, use GenAI to generate **testable chaos engineering hypotheses**.

**Why this matters:** A hypothesis turns a vague risk ("the database might fail") into a testable statement with predicted outcomes. Without a hypothesis, you're just breaking things randomly.

**Requirements:**

1. Take your top 3 failure modes from the FMA and ask Copilot to generate hypotheses. Use a prompt like:
   ```
   Based on this Failure Mode Analysis for my AKS application:
   
   [paste your top 3 failure modes]
   
   For each failure mode, generate a testable chaos engineering hypothesis using this format:
   
   HYPOTHESIS: "Given [system context], if [failure injection], then [expected behavior], because [reasoning]."
   
   Also include for each:
   - Experiment type: what kind of disruption to inject
   - Success criteria: what outcome proves the hypothesis true/false
   - Blast radius: what is affected by this experiment
   - Rollback plan: how to restore if things go wrong
   ```

2. Review each hypothesis — are they specific enough to test? Do the success criteria have measurable thresholds?

3. **Select 1-2 hypotheses** to execute in the remaining challenges. Choose ones you can complete in the available time.

**Example hypothesis:**
> **HYPOTHESIS:** "Given the backend runs as a single replica with no PDB, if the backend pod is deleted, then the frontend will return errors for approximately 30-60 seconds until Kubernetes restarts the pod, because there is no redundancy and the init container adds restart latency."
>
> - **Experiment:** `kubectl delete pod -n oranje-markt -l app=backend`
> - **Success criteria:** Frontend returns errors for < 60 seconds, then recovers automatically
> - **Blast radius:** Backend API unavailable, frontend shows errors, no data loss
> - **Rollback:** Kubernetes self-healing (automatic)

**What to observe:**
- Does Copilot generate hypotheses that are specific and testable?
- Are the success criteria measurable?
- Does the AI correctly predict the blast radius based on the architecture?

**Hints:**
- A good hypothesis has a clear "if/then/because" structure
- Success criteria should include measurable numbers (seconds, error rate percentage, pod count)
- Use your Lab 1 experience to validate or refine Copilot's predictions
- If a hypothesis is too broad, ask Copilot to narrow it down

> **Discussion:** What makes a good chaos engineering hypothesis? How do you decide between "hypothesis confirmed" and "hypothesis disproven"? Why are both outcomes valuable?

---

## Challenge 3 — Define & Verify Steady State (Phase 2.1)

**Goal:** Before injecting chaos, use GenAI to **define the steady state** — the measurable indicators that represent normal system behavior. Generate monitoring queries and verification scripts.

**Why this matters:** You can't measure the impact of chaos if you don't know what "normal" looks like. All logging and monitoring should be defined as code and be part of the solution.

**Requirements:**

1. Ask Copilot to define steady-state metrics for the Oranje Markt application:
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

2. Review and run the AI-generated baseline script. Save the output as your "before" snapshot.

3. Ask Copilot to generate Prometheus queries (PromQL) for your key metrics:
   ```
   Generate PromQL queries for these steady-state metrics on my AKS cluster:
   - HTTP request rate and error rate for the backend
   - Pod restart count by deployment
   - Container CPU and memory usage percentage vs limits
   - Pod readiness status
   ```

4. Verify the steady state manually:
   ```bash
   # Are all pods healthy?
   kubectl get pods -n oranje-markt
   
   # What's the resource usage?
   kubectl top pods -n oranje-markt
   
   # Is the app responding?
   kubectl exec -n oranje-markt deploy/frontend -- wget -q -O- http://backend:4000/api/health
   ```

5. **Document your steady state** — write down the baseline values. You'll compare against these after the experiment.

**What to observe:**
- Does Copilot generate realistic thresholds for your cluster size?
- Are the Prometheus queries valid and executable?
- Does the baseline script capture enough information to detect changes after disruption?

**Hints:**
- Steady state is not just "pods are running" — it includes response times, error rates, throughput
- Use `kubectl top` for real-time resource data
- Port-forward Grafana and run the PromQL queries in the Explore tab
- The steady state should be verifiable in under 30 seconds (keep it practical)

> **Discussion:** Why should steady-state definitions be "deployed as code"? How does infrastructure-as-code apply to observability and monitoring definitions?

---

## Challenge 4 — Plan & Introduce Disruptions (Phase 2.2)

**Goal:** Use GenAI to **generate the chaos experiment scripts** for your selected hypotheses. Run the disruption and capture what happens.

**Why this matters:** This is the heart of chaos engineering — injecting a controlled failure into the system. The experiment should be specific, time-bounded, and reversible.

**Requirements:**

1. For your selected hypothesis from Challenge 2, ask Copilot to generate the experiment:
   ```
   Generate a chaos experiment script for this hypothesis:
   
   [paste your hypothesis]
   
   The script should:
   1. Print the experiment details (hypothesis, blast radius, rollback plan)
   2. Capture the current state (pre-experiment snapshot)
   3. Inject the failure
   4. Wait for the effect to propagate (with a configurable duration)
   5. Capture the post-experiment state
   6. Print a comparison of before/after
   
   Use kubectl commands. Target namespace: oranje-markt.
   The script should be safe to run and include a rollback command at the end.
   ```

2. **Review the generated script carefully.** Check:
   - Correct namespace and resource names
   - Safe rollback mechanism
   - Reasonable wait times
   - No destructive operations beyond the intended disruption

3. **Run the experiment:**
   - Start your monitoring (Grafana dashboard, `kubectl get pods -w` in a separate terminal)
   - Execute the disruption script
   - Let it run for the defined duration
   - Do NOT intervene — observe what happens naturally

4. If you have time, run a second experiment for a different hypothesis.

**What to observe:**
- Did the generated script work correctly on the first try?
- Was the disruption injected as intended?
- Did the system behave as your hypothesis predicted?
- How long did the disruption last before recovery (if it recovered)?

**Hints:**
- Always have a rollback plan ready before starting
- Run `kubectl get pods -n oranje-markt -w` in a separate terminal to watch pod lifecycle
- Keep Grafana open on the relevant dashboard
- Time the disruption — note when you injected and when recovery completed
- If the script needs fixes, use `gh copilot explain` to understand what each command does

> **⚠️ Cascading Failure:** When postgres is down, the backend health endpoint returns 503. Since the **liveness probe** uses this same endpoint, Kubernetes will restart the backend pod after 3 consecutive failures (~30s). This is a cascading failure worth documenting — it extends the total outage beyond the database recovery time alone.

> **Discussion:** What safety guardrails should be in place before running chaos experiments in a real environment? How would you implement an "emergency stop" for automated chaos experiments?

---

## Challenge 5 — Observe & Analyze Results (Phase 2.3)

**Goal:** Use GenAI to **analyze the results** of your chaos experiment. Produce a structured experiment report that documents findings.

**Why this matters:** The experiment itself is useless without analysis. You need to compare what happened against your hypothesis, understand _why_ the system behaved the way it did, and draw actionable conclusions.

**Requirements:**

1. Gather the experiment data:
   ```bash
   # Events during the experiment window (scope to last 5 minutes)
   kubectl get events -n oranje-markt --sort-by='.lastTimestamp' | tail -20
   # PowerShell: kubectl get events -n oranje-markt --sort-by='.lastTimestamp' | Select-Object -Last 20
   
   # Current pod status (post-experiment)
   kubectl get pods -n oranje-markt -o wide
   
   # Pod descriptions (look for restart counts, state transitions)
   kubectl describe pods -n oranje-markt
   
   # Recent logs from affected components (scoped to experiment window)
   kubectl logs -n oranje-markt -l app=backend --tail=50 --since=5m
   ```

2. Feed the data to Copilot and ask for analysis:
   ```
   I ran a chaos experiment on my AKS application. Here are the results:
   
   HYPOTHESIS: [paste your hypothesis]
   
   DISRUPTION: [describe what you did]
   
   OBSERVED BEHAVIOR:
   - Pre-experiment state: [paste your steady-state baseline from Challenge 3]
   - Post-experiment state: [paste current kubectl output]
   - Events during experiment: [paste events]
   - Logs: [paste relevant logs]
   - Duration of impact: [X seconds/minutes]
   
   Please analyze these results and produce a structured experiment report with:
   1. Hypothesis result: CONFIRMED or DISPROVEN (and why)
   2. Impact analysis: what was the actual blast radius? Was it larger/smaller than expected?
   3. Recovery analysis: did the system self-heal? How long did it take?
   4. Steady-state comparison: how did key metrics change during the experiment?
   5. Root cause: why did the system behave this way?
   6. Recommendations: what resilience improvements would prevent or reduce the impact?
   7. Risk re-assessment: based on this experiment, should the risk score from the FMA be updated?
   ```

3. Review the AI-generated report. Add your own observations — things the AI might have missed.

4. **Share your findings** — you'll present these in the wrap-up session.

**What to observe:**
- Does Copilot correctly determine if the hypothesis was confirmed or disproven?
- Are the recommendations actionable and specific to your architecture?
- Does the AI suggest improvements you hadn't considered?
- How does the quality of input data affect the quality of the analysis?

**Hints:**
- The more structured your input, the better the report — use the format above
- Include timestamps if possible (helps with timeline reconstruction)
- Screenshots of Grafana dashboards during the experiment are valuable
- Compare the AI's recommendations with Lab 3's resilience improvements
- If the hypothesis was disproven, that's a valuable finding — document _why_ the system behaved differently than expected
- Use `--tail=50` and `--since=5m` to scope data to the experiment window — pasting thousands of log lines reduces analysis quality and may hit AI context limits

> **Discussion:** How does analyzing chaos experiment results feed back into the Failure Mode Analysis? Why is it important to document experiments even when the system behaves as expected?

---

## Extra Challenge — Autonomous Experiment Execution 🤖

> ⚠️ **DISCLAIMER:** This challenge is intended for **workshop and educational environments only**. Do **NOT** use autonomous AI-driven chaos experiment execution in production environments. Automated fault injection without proper human oversight, approval gates, and safety mechanisms can cause unintended outages, data loss, or cascading failures. Always follow your organization's change management and incident response policies before running chaos experiments in any non-sandbox environment.

**Goal:** Instead of manually orchestrating each phase of the chaos experiment (Challenges 3–5), craft a **single prompt** that asks GitHub Copilot to **autonomously execute the entire experiment lifecycle** — from steady-state capture to disruption injection to results analysis — and produce a complete experiment report.

**Prerequisites:**
- Completed Challenges 1 and 2 (you need a hypothesis to execute)
- Ideally completed Challenges 3–5 at least once (so you can compare the manual vs. autonomous approach)
- GitHub Copilot in VS Code with terminal access (agent mode), or GitHub Copilot CLI

**Requirements:**

1. Take one of your hypotheses from Challenge 2 (pick one you haven't tested yet, or re-run one to compare results).

2. Craft a **single comprehensive prompt** that instructs Copilot to autonomously execute the full experiment. Your prompt should include:
   - The hypothesis to test
   - The architecture context (namespace, component names, health endpoints)
   - Instructions for each phase: capture baseline → inject failure → monitor recovery → gather data → analyze → report
   - Safety constraints (namespace scope, rollback instructions, timeout limits)

   Example mega-prompt template:
   ```
   You are a chaos engineering agent. Execute the following experiment AUTONOMOUSLY
   — run each step, capture the output, and produce a final report.

   HYPOTHESIS: [paste your hypothesis from Challenge 2]

   ENVIRONMENT:
   - Kubernetes namespace: oranje-markt
   - Backend: deployment "backend", health endpoint http://backend:4000/api/health
   - Frontend: deployment "frontend"
   - Database: StatefulSet "postgres", pod "postgres-0"
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
   - Execute the disruption: [e.g., kubectl delete pod -n oranje-markt postgres-0]
   - Do NOT intervene after injection — let the system respond naturally

   Phase 3 — Monitor Recovery:
   - Poll every 5 seconds for up to 120 seconds
   - Each poll: check pod status, readiness, and health endpoint
   - Stop polling when the system recovers OR timeout is reached

   Phase 4 — Capture Post-Experiment State:
   - Run: kubectl get pods -n oranje-markt -o wide
   - Run: kubectl get events -n oranje-markt --sort-by='.lastTimestamp' | tail -20   (PowerShell: | Select-Object -Last 20)
   - Run: kubectl describe pod -n oranje-markt -l app=backend
   - Run: kubectl logs -n oranje-markt -l app=backend --tail=30

   Phase 5 — Analyze & Report:
   Produce a structured experiment report with:
   1. Hypothesis result: CONFIRMED or DISPROVEN (with evidence)
   2. Impact analysis: actual blast radius vs. predicted
   3. Recovery timeline: second-by-second breakdown
   4. Steady-state comparison: before vs. after metrics
   5. Root cause analysis: why the system behaved this way
   6. Recommendations: resilience improvements to prevent/reduce impact
   7. Risk re-assessment: should the FMA risk score be updated?

   SAFETY CONSTRAINTS:
   - Only operate in namespace "oranje-markt"
   - Maximum experiment duration: 120 seconds
   - If recovery does not occur within 120 seconds, stop and report
   - Do NOT delete deployments, statefulsets, or PVCs — only delete pods
   - Include rollback instructions in the report
   ```

3. **Let Copilot execute the experiment.** Observe how it handles each phase — does it capture the right data? Does it wait appropriately? Does it analyze correctly?

4. **Compare the results** with your manual execution from Challenges 3–5:
   - Was the autonomous report as thorough as the manual one?
   - Did Copilot miss any observations you caught manually?
   - Was there any step where Copilot needed correction or re-prompting?

**What to observe:**
- How much of the experiment lifecycle can Copilot execute without human intervention?
- Does the quality of the analysis degrade when Copilot generates AND analyzes the data itself (vs. you feeding it curated data)?
- What safety risks arise from autonomous chaos execution? Did Copilot ever try to do something outside the defined scope?
- How does the quality of your mega-prompt affect the outcome? What context was most critical?

**Hints:**
- The more specific your mega-prompt, the better the autonomous execution — vague instructions lead to vague results
- Include explicit safety constraints in the prompt (namespace scope, timeout, forbidden operations)
- If Copilot asks for clarification mid-execution, note what it asked — that tells you what context was missing from your prompt
- Try running the same experiment with different prompt variations — compare the results
- Context engineering matters: including the actual deployment YAML, node count, and resource limits significantly improves output quality

> **Discussion:** What are the trade-offs between step-by-step AI-assisted chaos engineering (Challenges 3–5) vs. fully autonomous AI-driven execution (this challenge)? When would you trust an AI agent to run chaos experiments without human supervision? What guardrails would you require for autonomous chaos in production?

---

## Challenge 6 — Cleanup

Restore the environment after your experiments:

```bash
# Delete any load test or chaos pods
kubectl delete pod -n oranje-markt -l run --ignore-not-found

# If you modified any deployments, restart them (uses the current image)
kubectl rollout restart deployment/backend -n oranje-markt
kubectl rollout restart deployment/frontend -n oranje-markt

# Verify everything is back to steady state
kubectl get pods -n oranje-markt
kubectl top pods -n oranje-markt
```

> ⚠️ **Do NOT** use `kubectl apply -f infra/k8s/backend/deployment.yaml` to restore — the raw YAML files reference a generic ACR that may not match your team's registry. Use `kubectl rollout restart` instead.

---

## Bonus — Diagnose Broken Deployments

If you have extra time, try diagnosing these intentionally broken deployments using AI:

```bash
# CrashLoopBackOff — wrong startup command
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/01-crashloop.yaml

# ImagePullBackOff — wrong image tag
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/02-imagepull.yaml

# Pending — impossible resource requests
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/03-resource-constraint.yaml
```

For each: gather context (`kubectl describe pod`, `kubectl logs --previous`), paste into Copilot, get a diagnosis, and apply the fix from the `solutions/manifests/` folder.

---

## Summary

| Phase | What You Should Have Learned |
|-------|------------------------------|
| **Failure Mode Analysis** | AI can systematically identify risks from architecture context (YAML, diagrams), but domain expertise validates the output |
| **Hypothesis Generation** | Good hypotheses have "if/then/because" structure with measurable success criteria |
| **Steady-State Definition** | You can't measure chaos impact without a documented baseline — steady state should be defined as code |
| **Disruption Planning** | AI generates experiment scripts quickly, but always review for safety before running |
| **Results Analysis** | Structured experiment data + AI analysis = actionable reports with improvement recommendations |

## Key Takeaways

1. **Follow the process**: FMA → Hypothesis → Steady State → Disrupt → Observe — skipping steps leads to random breakage, not chaos engineering
2. **Context is everything**: Every AI interaction improves with better context — YAML, metrics, logs, architecture
3. **Hypotheses make experiments scientific**: Without a hypothesis, you're just breaking things. With one, you're learning.
4. **Steady state is your anchor**: Define it before you break things, measure it after — the delta is your finding
5. **Document everything**: Experiment reports are the lasting value — they inform resilience improvements in Lab 3

---

> **Stuck?** Check the [solutions](solutions/) folder for step-by-step walkthroughs, example prompts, and sample experiment reports.
