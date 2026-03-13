# Chaos Quest on AKS: Build, Break, Recover
## Comprehensive Workshop Proposal for a Chaos Engineering Hackathon

## 1) Executive Summary / Elevator Pitch
Modern cloud-native systems fail in complex ways that are hard to predict in design reviews alone. **Chaos Quest on AKS** is a highly practical, game-like workshop where software engineers intentionally inject failure into real AKS-based workloads, observe system behavior, and harden resilience patterns in near real time.  

The format is intentionally hands-on: a **10–15 minute theory primer** followed by scenario-driven labs where teams choose from multiple chaos experiments (pod/node/network/DNS/dependency/latency/certificate/deployment disruptions), then apply mitigations and validate improvements. Optional Azure capabilities (Azure Chaos Studio, Azure Load Testing, Azure SRE Agent, and Azure Health Models) can be layered in for teams that want deeper platform integration, while a dedicated **DevAI track** shows how GitHub Copilot and GitHub Copilot CLI accelerate every stage from experiment design to incident-style troubleshooting.

---

## 2) Workshop Vision and Outcomes
This workshop is designed for software engineers who want to **learn chaos engineering by doing**, not by listening. By the end of the session, participants will:

- Gain practical confidence running controlled failure experiments on AKS.
- Build intuition for system weak points and hidden dependencies.
- Practice observing failure signals via logs, metrics, traces, and health models.
- Improve service resilience through targeted code/config/operational fixes.
- Learn how DevAI tooling (GitHub Copilot + Copilot CLI) can accelerate reliability engineering workflows.

---

## 3) Learning Objectives
Participants will be able to:

1. Explain core chaos engineering principles: hypothesis-driven experiments, blast-radius control, and steady-state metrics.
2. Design and execute AKS chaos experiments safely using namespace-scoped guardrails.
3. Detect and diagnose failure modes using Kubernetes telemetry and Azure observability.
4. Implement resilience improvements (timeouts, retries with jitter, circuit breakers, fallbacks, readiness/liveness improvements, rollout safeguards).
5. Compare baseline vs post-fix outcomes under repeated failure injection.
6. Optionally integrate Azure Chaos Studio and Azure Load Testing to orchestrate and pressure-test scenarios.
7. Use GitHub Copilot and Copilot CLI to accelerate experiment authoring, troubleshooting, and remediation.

---

## 4) Audience and Assumptions
- **Primary audience:** Software engineers, platform engineers, SRE-minded developers.
- **Skill baseline:** Familiar with containers and basic Kubernetes operations.
- **Target platform:** Azure Kubernetes Service (AKS).
- **Expected mindset:** Experiment-first, measurable outcomes, safety by design.

---

## 5) Proposed Format and Detailed Agenda (Half-Day, ~4.5 Hours)

> The same structure can be stretched to a full-day format by extending lab blocks and team demos.

### Phase 0 — Kickoff (15 min)
- Welcome, objectives, workshop mechanics, scoring overview.
- Team formation (2–4 engineers per team).
- Environment readiness check.

### Phase 1 — Theory Primer (10–15 min, intentionally brief)
- What chaos engineering is (and is not).
- Safe experimentation model:
  - Define steady state
  - Form hypothesis
  - Inject failure
  - Observe + learn
  - Improve + re-test
- AKS-specific blast-radius controls (namespace, pod labels, timeboxed experiments, kill switch).

### Phase 2 — Lab Orientation + Tooling Bootstrap (20 min)
- Review lab menu and tracks.
- Validate dashboards/logging access.
- Optional enablement:
  - Azure Chaos Studio experiment templates
  - Azure Load Testing test profiles
  - Azure SRE Agent for guided diagnostics
  - Azure Health Models for service health visualization

### Phase 3 — Hands-on Chaos Rounds (3 x 45 min = 135 min total)
Each round:
- 10 min: select experiment + define hypothesis + expected signal
- 20 min: execute experiment + observe impact
- 15 min: implement mitigation and/or tune configuration

Suggested cadence:
- **Round 1:** Beginner-friendly experiment
- **Round 2:** Cross-service failure / dependency scenario
- **Round 3:** Advanced resilience challenge + performance pressure

### Phase 4 — Team Demos and Postmortems (30 min)
- 5-minute lightning demo per team:
  - What failed
  - What was surprising
  - What was fixed
  - Evidence of improvement

### Phase 5 — Awards, Wrap-Up, and Next Steps (20 min)
- Scoreboard and prizes.
- Recommended adoption plan:
  - Weekly chaos check
  - Pre-release chaos gate
  - Reliability backlog from workshop findings

---

## 6) Hands-On Lab Scenario Catalog (Choose 5–6+)

Teams can pick experiments based on track level. Below are eight realistic AKS scenarios.

---

### Lab A: Pod Failure Storm (Crash/Deletion Chaos)
**Description**  
Randomly terminate selected application pods in a namespace to simulate sudden process crashes or repeated OOM-like restarts.

**What it tests / validates**  
- Replica strategy and pod disruption tolerance  
- Readiness/liveness probe effectiveness  
- Auto-healing behavior and error budget impact

**Step-by-step outline**
1. Identify target deployment and baseline steady-state SLI (error rate, p95 latency, success count).
2. Scale deployment to a known replica baseline.
3. Inject chaos (e.g., periodic pod deletion or crash simulation).
4. Monitor recovery time, traffic impact, and failed requests.
5. Tune probes/resources/replicas and test again.

**Expected outcomes and learning points**
- Single pod loss should be mostly invisible with healthy replica strategy.
- Poor probes or low replica count can cause cascading errors.
- Participants learn how recovery posture changes with probe and scaling settings.

---

### Lab B: Node Failure and Eviction Drill
**Description**  
Simulate node-level disruption (cordon/drain or forced node unavailability) to test scheduling and workload continuity.

**What it tests / validates**  
- Pod rescheduling speed across nodes/zones  
- PodDisruptionBudget and anti-affinity strategy  
- Stateful vs stateless workload behavior under node loss

**Step-by-step outline**
1. Establish baseline node distribution for target workloads.
2. Trigger controlled node disruption.
3. Observe eviction, pending pods, and rescheduling timeline.
4. Validate PDB behavior and minimum availability objectives.
5. Adjust affinities, topology spread, or PDB values; rerun.

**Expected outcomes and learning points**
- Teams observe whether cluster design truly tolerates node loss.
- Misconfigured PDBs may block healthy recovery.
- Participants gain practical insight into AKS scheduler behavior.

---

### Lab C: Network Partition / Packet Loss Between Services
**Description**  
Inject network faults (latency, packet loss, intermittent drops) between microservices (e.g., API -> backend dependency).

**What it tests / validates**  
- Timeout and retry strategy correctness  
- Circuit breaker and fallback logic  
- Upstream/downstream backpressure behavior

**Step-by-step outline**
1. Choose a dependency path with measurable call volume.
2. Apply network chaos to only selected service-to-service traffic.
3. Track timeout spikes, queue depth, and thread pool saturation.
4. Implement/adjust retries with jitter and strict timeout budgets.
5. Validate improvement under repeated fault injection.

**Expected outcomes and learning points**
- Naive retries can worsen outages.
- Proper timeout hierarchy and jitter improve containment.
- Participants learn to avoid retry storms and cascading failures.

---

### Lab D: DNS Resolution Failure Scenario
**Description**  
Simulate transient DNS failures for internal/external dependency names.

**What it tests / validates**  
- DNS caching and resolver resilience  
- Dependency lookup retry behavior  
- Degraded-mode and fallback handling

**Step-by-step outline**
1. Identify services relying on dynamic DNS lookups.
2. Inject DNS failure conditions for selected hostnames.
3. Observe error signatures in app logs and client behavior.
4. Add fallback host strategy or better caching where appropriate.
5. Re-run chaos and compare failure duration.

**Expected outcomes and learning points**
- DNS is often a hidden single point of failure.
- Teams learn to instrument and mitigate name-resolution fragility.

---

### Lab E: Resource Exhaustion (CPU/Memory Pressure)
**Description**  
Stress selected pods or workloads to trigger throttling, OOM kills, or latency collapse.

**What it tests / validates**  
- Resource requests/limits correctness  
- HPA/VPA responsiveness and scaling policy  
- Graceful degradation under contention

**Step-by-step outline**
1. Record baseline utilization and latency profile.
2. Generate CPU/memory stress in target workload.
3. Observe pod restarts, throttling, and response-time behavior.
4. Tune resource requests/limits and autoscaling thresholds.
5. Validate post-tuning behavior with same stress profile.

**Expected outcomes and learning points**
- Teams see how bad sizing causes instability.
- Participants learn the tradeoff between cost efficiency and reliability margin.

---

### Lab F: Dependency Failure (Database or External API)
**Description**  
Simulate degraded or unavailable dependency (slow DB, HTTP 5xx external API, intermittent connection resets).

**What it tests / validates**  
- Bulkheads, circuit breakers, and fallback data paths  
- Idempotency and queue/backoff patterns  
- User-facing graceful degradation strategies

**Step-by-step outline**
1. Select one business-critical dependency path.
2. Introduce controlled dependency failures.
3. Measure impact on user journeys and upstream services.
4. Add circuit breaker thresholds, response fallbacks, cache strategy.
5. Re-test for reduced blast radius and faster stabilization.

**Expected outcomes and learning points**
- Participants learn to preserve core user outcomes despite dependency failure.
- Teams practice designing for partial availability, not binary up/down.

---

### Lab G: Certificate Expiration / TLS Trust Break
**Description**  
Inject an expired/mismatched certificate scenario in a non-production service path.

**What it tests / validates**  
- Certificate lifecycle management and alerting  
- TLS error handling and escalation workflows  
- Runbook quality for certificate incidents

**Step-by-step outline**
1. Simulate cert expiry in a controlled test endpoint/service.
2. Observe detection channels (alerts, logs, synthetic monitors).
3. Execute cert rotation/renewal runbook.
4. Validate restored trust chain and service health.
5. Improve alert thresholds and renewal automation.

**Expected outcomes and learning points**
- Teams discover whether cert incidents are detected before customer impact.
- Participants build muscle memory for high-pressure TLS restoration.

---

### Lab H: Bad Deployment + Rollback Under Load
**Description**  
Deploy a deliberately flawed version (e.g., increased latency or error path), then perform progressive rollback while traffic/load test runs.

**What it tests / validates**  
- Release strategy (rolling/canary/blue-green)  
- Rollback speed and operational confidence  
- Alert-driven deployment guardrails

**Step-by-step outline**
1. Run baseline load profile.
2. Deploy degraded release variant.
3. Observe quality gate breaches (latency/error budget/SLO).
4. Trigger rollback and verify stabilization.
5. Define improved pre-prod checks and automated rollback criteria.

**Expected outcomes and learning points**
- Teams validate release safety mechanisms under realistic pressure.
- Participants connect chaos findings to CI/CD policy improvements.

---

## 7) Workshop Tracks / Paths

### Track 1 — Foundations (Beginner)
**Goal:** Build confidence with straightforward AKS failure modes.  
**Recommended labs:** A (Pod Failure), E (Resource Exhaustion), H (Rollback).  
**Focus:** Observability basics, probes, scaling, rollout safety.

### Track 2 — Resilience Engineering (Intermediate)
**Goal:** Improve architecture-level failure handling across services.  
**Recommended labs:** C (Network Faults), D (DNS Failures), F (Dependency Failure).  
**Focus:** Timeouts, retries, circuit breakers, graceful degradation.

### Track 3 — Reliability at Scale (Advanced)
**Goal:** Stress operational readiness for infrastructure and systemic disruptions.  
**Recommended labs:** B (Node Failure), G (Certificate Incident), plus zone-aware variants of C/F.  
**Focus:** Topology resilience, runbook execution, failure domain awareness.

### Track 4 — DevAI Acceleration (GitHub Copilot + Copilot CLI Only Focus)
**Goal:** Demonstrate how DevAI tools accelerate chaos workflows end-to-end.  
**Typical activities:**
- Generate chaos experiment manifests and scripts faster.
- Draft hypotheses and acceptance criteria from service context.
- Create resilience code changes (timeouts/retries/fallback wrappers).
- Build Kusto/KQL queries and dashboard snippets for incident analysis.
- Auto-generate postmortem templates and action-item backlog.
- Use Copilot CLI in terminal for rapid diagnosis loops (`kubectl`, logs, events, diffing configs).

---

## 8) Integrating Azure and DevAI Tooling (Optional, Add-On Model)

These tools are **optional enhancers**, not prerequisites:

- **Azure Chaos Studio (optional):**
  - Orchestrate fault injections with safer experiment governance.
  - Standardize repeatable experiment templates across teams.
- **Azure Load Testing (optional):**
  - Add realistic traffic pressure while chaos runs.
  - Quantify SLO/SLA impact under stress.
- **Azure SRE Agent (optional):**
  - Guide diagnosis with operational recommendations.
  - Accelerate root-cause exploration during rounds.
- **Azure Health Models (optional):**
  - Visualize service/component health rollups.
  - Correlate blast radius with dependency topology.
- **GitHub Copilot + Copilot CLI (core DevAI option):**
  - Rapidly create YAML/manifests/scripts.
  - Improve troubleshooting and remediation speed.
  - Increase experiment throughput per team within limited time.

---

## 9) How GitHub Copilot and Copilot CLI Are Used Throughout

### Before Experiments
- Generate starter chaos manifests and namespace-scoped policies.
- Draft experiment hypotheses and expected failure signals.
- Produce baseline metric query packs and dashboard JSON snippets.

### During Experiments
- Use Copilot CLI to accelerate:
  - `kubectl` command construction
  - Event/log triage command sequences
  - On-the-fly script generation for repeatable checks
- Use Copilot to explain ambiguous errors and suggest next diagnostics.

### During Mitigation
- Propose and scaffold resilience code changes (timeouts/retries/circuit-breakers).
- Generate safer deployment configs (probe values, resource policies, rollout strategy).
- Suggest test cases to validate fixes after experiment reruns.

### During Demo/Postmortem
- Summarize findings into incident narrative and executive-ready bullets.
- Generate action items mapped to owners and priority.
- Draft “prevention checklist” for future releases.

---

## 10) Prerequisites and Environment Setup

### Technical Prerequisites
- AKS cluster with workshop namespace quotas and RBAC configured.
- Sample microservice application deployed (multi-service, dependency-rich preferred).
- Observability stack available (Azure Monitor, Log Analytics, Prometheus/Grafana, or equivalent).
- Optional services pre-provisioned:
  - Azure Chaos Studio
  - Azure Load Testing
  - Azure SRE Agent
  - Azure Health Models
- GitHub repository with starter code, deployment manifests, and lab instructions.

### Participant Prerequisites
- Azure subscription access (or sandbox credentials).
- GitHub account with Copilot entitlement (for DevAI track).
- Local tooling:
  - `kubectl`
  - Azure CLI
  - Git
  - GitHub Copilot-enabled IDE and/or Copilot CLI
- Familiarity with basic Kubernetes commands and YAML edits.

### Safety Guardrails (Mandatory)
- Experiments restricted to workshop namespaces only.
- Timeboxed faults with explicit stop/rollback command.
- Blast-radius review before execution.
- Shared “red button” kill switch and facilitator override.
- No production resources targeted.

---

## 11) Scoring and Gamification Model

### Scoring Categories (Example: 100 points total)
1. **Experiment Design Quality (20 pts)**  
   Clear hypothesis, measurable steady-state definition, safe blast-radius control.
2. **Execution Excellence (20 pts)**  
   Correct, repeatable injection process and clean observability evidence.
3. **Diagnosis Speed and Accuracy (20 pts)**  
   Time-to-detect, root-cause quality, and signal-to-noise in analysis.
4. **Resilience Improvement Impact (25 pts)**  
   Demonstrable improvement after mitigation (error reduction, latency stabilization, recovery time).
5. **Postmortem and Knowledge Sharing (15 pts)**  
   Actionable lessons, prevention plan, clarity of team demo.

### Bonus Challenges
- **Fastest Stable Recovery** after injected failure.
- **Best DevAI Usage** (Copilot/Copilot CLI workflows that clearly accelerated outcomes).
- **Most Surprising Insight** (non-obvious dependency/failure pattern discovered).
- **Cleanest Rollback Execution** under load pressure.

### Fun Mechanics
- Live leaderboard updates after each round.
- “Chaos Cards” for optional wildcard constraints (e.g., no manual rollback for 5 mins; only observability-first diagnosis).
- Team badges: “Probe Whisperer,” “Circuit Breaker Hero,” “Rollback Ninja.”

---

## 12) Success Metrics for Leadership

### Immediate Workshop Metrics
- % of teams completing at least 3 experiments.
- Mean time to detect (MTTD) and mean time to recover (MTTR) during labs.
- Number of validated resilience improvements per team.
- Improvement delta between baseline and post-fix runs (error rate, p95 latency, availability).
- Participant satisfaction (NPS/CSAT) and confidence uplift survey.

### Follow-Through Metrics (30–90 Days)
- Number of chaos experiments operationalized into recurring practice.
- Reduction in incident recurrence for tested failure modes.
- Increase in pre-release reliability checks (chaos gates, rollback drills).
- Adoption metrics for GitHub Copilot/Copilot CLI in reliability workflows.
- Reliability backlog closure rate from workshop-generated action items.

---

## 13) Deliverables
At workshop completion, each team should produce:
- Experiment run sheets (hypothesis, injection, observations, outcomes).
- Evidence artifacts (metrics screenshots, logs, timeline).
- Code/config mitigation PRs or patch sets.
- Mini postmortem and prioritized follow-up actions.
- Optional DevAI transcript snippets showing Copilot/Copilot CLI acceleration.

---

## 14) Why This Proposal Is Leadership-Ready
- Aligns directly with cloud reliability and incident reduction goals.
- Practical, measurable, and immediately applicable to AKS workloads.
- Supports multiple maturity levels through clear tracks.
- Produces concrete artifacts that feed into operational excellence programs.
- Encourages modern engineering productivity with optional Azure tools and a dedicated DevAI path.

---

## 15) Approval Ask
Approve this workshop as a repeatable internal reliability enablement format, with pilot execution for one engineering group and expansion to additional teams after a 30-day outcome review.
