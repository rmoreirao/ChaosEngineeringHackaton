# 🔥 "Break It to Make It" — Chaos Engineering Hackathon on AKS

> *A hands-on workshop where engineers learn to build resilient systems by intentionally breaking them.*

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Learning Objectives](#learning-objectives)
- [Workshop Format & Tracks](#workshop-format--tracks)
- [Detailed Agenda](#detailed-agenda)
- [Hands-On Lab Scenarios](#hands-on-lab-scenarios)
  - [Lab 1 — Pod Failure & Self-Healing](#lab-1--pod-failure--self-healing)
  - [Lab 2 — Network Chaos: Latency, Partitions & DNS Failures](#lab-2--network-chaos-latency-partitions--dns-failures)
  - [Lab 3 — Resource Exhaustion: CPU & Memory Stress](#lab-3--resource-exhaustion-cpu--memory-stress)
  - [Lab 4 — Dependency Failures: Database & External API Outages](#lab-4--dependency-failures-database--external-api-outages)
  - [Lab 5 — Zone & Node Failures: Simulating Infrastructure Collapse](#lab-5--zone--node-failures-simulating-infrastructure-collapse)
  - [Lab 6 — Deployment Gone Wrong: Rollback & Certificate Expiry](#lab-6--deployment-gone-wrong-rollback--certificate-expiry)
- [Optional Tool Extensions](#optional-tool-extensions)
- [DevAI Track — GitHub Copilot for Chaos Engineering](#devai-track--github-copilot-for-chaos-engineering)
- [Pre-Requisites & Environment Setup](#pre-requisites--environment-setup)
- [Scoring & Gamification](#scoring--gamification)
- [Success Metrics](#success-metrics)
- [Appendix](#appendix)

---

## Executive Summary

**Elevator Pitch:**
> Every outage teaches us something — but learning through production incidents is expensive, stressful, and reactive. What if your engineers could proactively discover weaknesses, build muscle memory for incident response, and harden your systems *before* customers are impacted? **"Break It to Make It"** is a half-day, hands-on Chaos Engineering Hackathon where teams deploy a microservices application to AKS, systematically inject real-world failures, and compete to build the most resilient system. In under four hours, engineers go from "what is chaos engineering?" to confidently designing and running chaos experiments against production-grade Kubernetes infrastructure.

**Why Now:**
- Cloud-native architectures on AKS are the standard for our workloads, but distributed systems fail in distributed ways.
- Resilience is not a feature you add at the end — it's a practice your teams must build continuously.
- The rise of AI-assisted development (GitHub Copilot) creates an opportunity to accelerate how engineers write resilience code, experiment configurations, and monitoring dashboards.

**Format:** Half-day workshop (3.5–4 hours) · Teams of 3–4 · Competitive hackathon with prizes · Multiple difficulty tracks

**Target Audience:** Software engineers, SREs, platform engineers, and technical leads who build or operate services on AKS.

---

## Learning Objectives

By the end of this workshop, participants will be able to:

| # | Objective | Bloom's Level |
|---|-----------|---------------|
| 1 | **Explain** the principles of chaos engineering and the scientific method behind controlled failure injection | Understand |
| 2 | **Design** a chaos experiment with a clear hypothesis, blast radius, steady-state definition, and abort conditions | Create |
| 3 | **Execute** at least 3 different chaos experiments against a live AKS cluster using CLI tools and/or Azure Chaos Studio | Apply |
| 4 | **Analyze** system behavior under failure using metrics, logs, and distributed traces to validate or disprove a resilience hypothesis | Analyze |
| 5 | **Implement** remediation patterns (retries, circuit breakers, pod disruption budgets, resource limits, health probes) to harden services | Apply |
| 6 | **Evaluate** the resilience posture of a microservices application and prioritize hardening efforts based on observed failure modes | Evaluate |
| 7 | **Use** GitHub Copilot and GitHub Copilot CLI to accelerate chaos engineering workflows (experiment authoring, remediation coding, observability setup) | Apply |

---

## Workshop Format & Tracks

### 🗺️ Participation Tracks

Participants choose **one primary track** based on their experience level. All tracks use the same AKS environment and base application — they differ in the complexity of scenarios and the level of guidance provided.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WORKSHOP TRACKS                                  │
├─────────────────┬───────────────────┬───────────────────────────────────┤
│  🟢 GREEN       │  🟡 YELLOW        │  🔴 RED                          │
│  "First Flame"  │  "Firestarter"    │  "Arsonist"                      │
│  Beginner       │  Intermediate     │  Advanced                        │
├─────────────────┼───────────────────┼───────────────────────────────────┤
│ Guided labs     │ Semi-guided labs  │ Open-ended challenges             │
│ with step-by-   │ with goals and    │ with only a failure scenario      │
│ step instruc-   │ hints; partici-   │ description; teams must design    │
│ tions and pre-  │ pants write their │ the experiment, define the        │
│ built configs.  │ own experiment    │ hypothesis, build the tooling,    │
│                 │ configs with      │ inject the fault, and implement   │
│ Focus: Learn    │ Copilot assist.   │ the fix.                         │
│ the concepts    │                   │                                   │
│ and tooling.    │ Focus: Apply      │ Focus: Real-world chaos           │
│                 │ concepts with     │ engineering practice.             │
│                 │ some autonomy.    │                                   │
├─────────────────┼───────────────────┼───────────────────────────────────┤
│ Labs 1–3        │ Labs 1–5          │ Labs 1–6 + Bonus Challenge        │
│ (pick 2+)       │ (pick 3+)         │ (pick 4+ including Lab 5 or 6)   │
└─────────────────┴───────────────────┴───────────────────────────────────┘
```

### 🤖 DevAI Overlay Track — *"Copilot Co-Pilot"*

Available to **any participant regardless of primary track**. This overlay focuses on using **GitHub Copilot** (in VS Code / IDE) and **GitHub Copilot CLI** (in the terminal) as force multipliers throughout the hackathon. Participants who opt into this track earn bonus points for demonstrating creative and effective use of AI-assisted development. See the [DevAI Track](#devai-track--github-copilot-for-chaos-engineering) section for full details.

### 🧰 Tool-Focused Extension Tracks

These are **optional add-ons** that teams can layer on top of their primary track for bonus points:

| Extension | Description | Bonus Points |
|-----------|-------------|:------------:|
| **Azure Chaos Studio** | Use the managed service to define, schedule, and run experiments with portal-based orchestration | +200 |
| **Azure Load Testing** | Combine chaos experiments with load tests to observe degradation under realistic traffic patterns | +200 |
| **Azure SRE Agent** | Leverage the AI-powered SRE agent to assist with incident detection, root-cause analysis, or automated remediation | +150 |
| **Azure Health Models** | Build or use health models to define and monitor the health state of the application during experiments | +150 |

---

## Detailed Agenda

**Total Duration: 3 hours 45 minutes**

```
TIME          DURATION  ACTIVITY                                          FORMAT
─────────────────────────────────────────────────────────────────────────────────────
09:00–09:10   10 min    Welcome & Logistics                               Presentation
                        • WiFi, environment access, team formation
                        • Rules of engagement & safety guardrails

09:10–09:25   15 min    ⚡ Chaos Engineering in 15 Minutes                Presentation
                        • What it is (and what it isn't)
                        • The scientific method: hypothesis → experiment → observe → learn
                        • Principles of chaos: steady state, blast radius, abort conditions
                        • Real-world war stories (Azure/AKS specific)
                        • Quick demo: killing a pod, observing recovery

09:25–09:35   10 min    Environment Walkthrough & App Tour                Live Demo
                        • The "ResiliMart" sample microservices app
                        • Architecture overview (see Appendix A)
                        • Navigating the AKS cluster, dashboards, and tooling
                        • How scoring works

09:35–09:45   10 min    Team Setup & Track Selection                      Hands-On
                        • Verify cluster access (kubectl get nodes)
                        • Choose primary track (Green / Yellow / Red)
                        • Opt into extension tracks
                        • Pick first lab scenario

09:45–11:15   90 min    🔬 HACKATHON BLOCK 1 — Chaos Labs                Hands-On
                        • Teams work through chosen lab scenarios
                        • Facilitators rotate between teams
                        • Checkpoint at 60 min: "Show us your first experiment"
                        • Live leaderboard updates every 15 min

11:15–11:25   10 min    ☕ Break + Mid-Hackathon Leaderboard              Break

11:25–12:25   60 min    🔬 HACKATHON BLOCK 2 — Advanced Chaos & Fix      Hands-On
                        • Continue labs or attempt advanced scenarios
                        • Implement remediations and re-test
                        • Capture evidence for final presentation

12:25–12:45   20 min    🏆 Team Presentations & Judging                  Presentation
                        • Each team: 2-minute lightning talk
                          "What we broke, what we learned, what we fixed"
                        • Judging criteria: creativity, learning depth,
                          resilience improvement, Copilot usage

12:45–12:55   10 min    🎖️ Awards & Wrap-Up                              Presentation
                        • Announce winners (Most Resilient, Best Experiment,
                          Best Copilot Usage, Most Creative Chaos)
                        • Key takeaways & next steps for your real projects
                        • Resources & continued learning paths
```

---

## Hands-On Lab Scenarios

All labs use **"ResiliMart"**, a sample e-commerce microservices application deployed on AKS. The architecture includes:

- **Frontend** (React SPA) → **API Gateway** (NGINX Ingress)
- **Order Service** (Node.js) → **Inventory Service** (Go) → **PostgreSQL**
- **Payment Service** (C#/.NET) → External Payment API (mocked)
- **Notification Service** (Python) → Azure Service Bus → Email/SMS (mocked)
- **Observability Stack**: Prometheus + Grafana + Azure Monitor + distributed tracing

Each lab follows the **Chaos Experiment Scientific Method**:

```
1. Define Steady State     → What does "normal" look like? (metrics, SLOs)
2. Form a Hypothesis       → "We believe that when X fails, the system will Y"
3. Design the Experiment   → Fault type, blast radius, duration, abort conditions
4. Run the Experiment      → Inject the fault
5. Observe & Measure       → Dashboards, logs, traces, alerts
6. Analyze & Learn         → Was the hypothesis correct? What surprised us?
7. Remediate & Re-Test     → Fix the weakness, run the experiment again
```

---

### Lab 1 — Pod Failure & Self-Healing

**🏷️ Difficulty:** 🟢 Beginner &nbsp;|&nbsp; **⏱️ Estimated Time:** 25–35 min &nbsp;|&nbsp; **🎯 Points:** 100

#### Description

The most fundamental chaos experiment: what happens when pods die unexpectedly? Kubernetes promises self-healing through ReplicaSets and Deployments — but does your application actually recover gracefully? This lab tests whether your services handle pod termination without user-visible errors, data loss, or prolonged downtime.

#### What It Tests / Validates

- Kubernetes self-healing via Deployment replica management
- Graceful shutdown handling (`SIGTERM` → drain connections → exit)
- Liveness and readiness probe configuration effectiveness
- Client-side retry and connection handling
- Impact on in-flight requests during pod termination

#### Step-by-Step Outline

**Phase 1: Establish Steady State**
1. Generate baseline traffic to the Order Service using a load generator (provided)
2. Record key metrics: request success rate, p50/p95/p99 latency, active pod count
3. Confirm all pods are `Running` and all health checks pass
4. Define SLO: 99.9% success rate, p99 latency < 500ms

**Phase 2: Form Hypothesis**
> *"We believe that when 1 of 3 Order Service pods is killed, the remaining pods will absorb the traffic with no more than a 1% increase in error rate and no more than a 2x increase in p99 latency, and the killed pod will be replaced within 30 seconds."*

**Phase 3: Run the Experiment**
1. **Single pod kill:** `kubectl delete pod <order-service-pod> --grace-period=0`
2. Observe recovery time, error rate spike, and latency impact
3. **Rolling pod kills:** Kill pods one at a time with 10-second intervals
4. **Simultaneous multi-pod kill:** Kill 2 of 3 pods simultaneously
5. (Advanced) Use `PodChaos` resource or Azure Chaos Studio to automate

**Phase 4: Observe**
- Grafana dashboard: request rate, error rate, latency percentiles
- `kubectl get pods -w` to watch pod lifecycle
- Application logs for connection errors, retry attempts
- Distributed traces for failed requests

**Phase 5: Remediate & Re-Test**
- Tune `terminationGracePeriodSeconds` for clean shutdown
- Add/fix `preStop` hooks for connection draining
- Configure `PodDisruptionBudget` to prevent simultaneous kills
- Adjust readiness probe timing to prevent premature traffic routing
- Increase replica count or configure HPA (Horizontal Pod Autoscaler)
- Re-run the experiment to validate improvement

#### Expected Outcomes & Learning Points

| Observation | Learning |
|-------------|----------|
| Pods restart within 20–30s, but errors spike during gap | Self-healing works, but startup time matters — optimize readiness probes |
| In-flight requests fail with 502/503 errors | Need graceful shutdown: `preStop` hook + `SIGTERM` handler to drain connections |
| Killing 2 of 3 pods causes cascading overload on remaining pod | Capacity planning matters — always have headroom; consider HPA |
| Load balancer routes traffic to terminating pods | Readiness probe must fail *before* pod begins draining |
| No data loss in database | Stateless service design is working correctly |

---

### Lab 2 — Network Chaos: Latency, Partitions & DNS Failures

**🏷️ Difficulty:** 🟡 Intermediate &nbsp;|&nbsp; **⏱️ Estimated Time:** 35–45 min &nbsp;|&nbsp; **🎯 Points:** 200

#### Description

Network issues are the most common cause of distributed system failures — yet they are the hardest to test for in development environments. This lab uses network fault injection to simulate real-world conditions: added latency between services, packet loss, complete network partitions between components, and DNS resolution failures. Participants discover whether their services degrade gracefully or cascade into total failure.

#### What It Tests / Validates

- Timeout configuration between services (are they set? are they appropriate?)
- Circuit breaker implementation and behavior
- Retry policies (with backoff and jitter)
- Behavior under partial network degradation vs. total partition
- DNS resolution failure handling and caching behavior
- Cascading failure prevention

#### Step-by-Step Outline

**Phase 1: Establish Steady State**
1. Baseline the end-to-end order flow: Frontend → API Gateway → Order Service → Inventory Service → DB
2. Record inter-service latency, DNS resolution time, overall request duration
3. Define SLO: end-to-end order placement < 2s, error rate < 0.1%

**Phase 2: Experiments (choose 2+ sub-experiments)**

**Experiment 2A — Latency Injection (between Order Service and Inventory Service)**
1. Inject 500ms network delay on traffic between Order and Inventory pods using a network chaos tool (e.g., `tc` via a sidecar, Chaos Mesh `NetworkChaos`, or Azure Chaos Studio)
2. Observe: Does the Order Service timeout? Does it retry? Does the user see slowness or errors?
3. Increase delay to 2s, then 5s — where does the system break?
4. **Remediate:** Implement timeouts, circuit breakers (e.g., Polly for .NET, `opossum` for Node.js), and bulkheads

**Experiment 2B — Packet Loss**
1. Introduce 10% packet loss on Inventory Service ingress
2. Observe TCP retransmission behavior, increased latency, and error rates
3. Increase to 30%, then 50% — identify the tipping point
4. **Remediate:** Tune TCP keepalive settings, implement application-level retries with idempotency

**Experiment 2C — Network Partition (Order Service ↔ PostgreSQL)**
1. Block all traffic between the Order Service pods and the PostgreSQL pod/service
2. Observe: How does the Order Service behave? Does it return errors immediately or hang?
3. Check: Are database connections pooled? What happens when the pool is exhausted?
4. **Remediate:** Configure connection pool limits, implement database connection timeouts, add a fallback path (e.g., queue orders for later processing)

**Experiment 2D — DNS Failure**
1. Corrupt or block DNS resolution for `inventory-service.default.svc.cluster.local`
2. Observe: Does the Order Service cache DNS? How long before it notices? What error does the user see?
3. **Remediate:** Configure DNS caching at the application or pod level, handle `UnknownHostException` gracefully

**Phase 3: Observe & Analyze**
- Network-level metrics: packet loss, retransmissions, connection timeouts
- Application metrics: circuit breaker state (open/closed/half-open), retry counts
- Distributed traces: identify where latency is being added
- Alert behavior: did alerts fire? Were they actionable?

#### Expected Outcomes & Learning Points

| Observation | Learning |
|-------------|----------|
| 500ms latency causes end-to-end response time to balloon to 10s+ | Missing or misconfigured timeouts; downstream latency is additive across the call chain |
| One slow service causes all upstream services to slow down | No bulkheading: thread/connection pool exhaustion propagates the failure |
| DNS failure causes immediate 500 errors with no recovery | No DNS caching and no graceful degradation for resolution failures |
| Network partition to DB causes pod to appear healthy but return errors | Liveness probe doesn't check downstream dependencies; "healthy" pod serves only errors |
| Circuit breaker opens after repeated failures and serves fallback | Correct resilience pattern; services degrade gracefully instead of failing completely |

---

### Lab 3 — Resource Exhaustion: CPU & Memory Stress

**🏷️ Difficulty:** 🟡 Intermediate &nbsp;|&nbsp; **⏱️ Estimated Time:** 30–40 min &nbsp;|&nbsp; **🎯 Points:** 200

#### Description

What happens when a service's container hits its CPU or memory limit? Does Kubernetes OOMKill it? Does the node become unresponsive? Does the HPA scale fast enough? This lab stresses individual pods and nodes to explore resource management, Quality of Service (QoS) classes, priority classes, and autoscaling behavior under pressure.

#### What It Tests / Validates

- Resource requests and limits configuration
- Kubernetes QoS class behavior (Guaranteed, Burstable, BestEffort)
- OOMKill behavior and pod restart policies
- HPA responsiveness and scaling speed
- Node-level resource pressure and eviction behavior
- Impact of noisy neighbors on co-located pods

#### Step-by-Step Outline

**Phase 1: Establish Steady State**
1. Review current resource requests/limits for all services (`kubectl describe pod`)
2. Baseline CPU and memory utilization per pod and per node
3. Confirm HPA configuration and current replica counts
4. Define SLO: Order Service maintains <1s p99 latency; no OOMKills in steady state

**Phase 2: Experiments**

**Experiment 3A — Memory Stress on a Single Pod**
1. Deploy a memory stress container in the Order Service pod (or use a stress tool like `stress-ng`)
2. Gradually increase memory consumption toward the pod's memory limit
3. Observe: At what point does the pod get OOMKilled? What happens to in-flight requests?
4. Check: Does the pod restart? How long until it's ready? What about a `CrashLoopBackOff`?
5. **Remediate:** Set appropriate memory limits, implement memory-aware caching, add memory usage alerting

**Experiment 3B — CPU Stress on the Node**
1. Run a CPU stress workload on one of the AKS nodes (all cores at 100%)
2. Observe: How do all pods on that node behave? Is there CPU throttling?
3. Check: Do resource requests guarantee minimum CPU for critical pods?
4. **Remediate:** Ensure all critical pods have CPU requests; use `PriorityClass` for critical workloads

**Experiment 3C — HPA Scaling Under Load**
1. Generate a traffic spike (3x–5x normal load) against the Order Service
2. Simultaneously inject CPU stress to simulate a computationally expensive request pattern
3. Observe: How quickly does HPA react? How long until new pods are ready?
4. Check: Is there a cold-start penalty? Does the cluster autoscaler add nodes if needed?
5. **Remediate:** Tune HPA `scaleUp`/`scaleDown` behavior, configure KEDA for event-driven scaling, pre-provision pod buffers

**Experiment 3D — Noisy Neighbor**
1. Deploy a rogue "noisy neighbor" pod on the same node as the Order Service (consuming excessive CPU/memory without limits)
2. Observe: Impact on Order Service latency and availability
3. **Remediate:** Enforce `LimitRange` and `ResourceQuota` at the namespace level, use dedicated node pools for critical workloads

**Phase 3: Observe**
- Node-level metrics: CPU %, memory %, disk pressure, PID pressure
- Pod-level: CPU throttling, OOMKill events, restart counts
- HPA status: `kubectl get hpa -w`
- Cluster Autoscaler logs: node provisioning events and timing

#### Expected Outcomes & Learning Points

| Observation | Learning |
|-------------|----------|
| Pod with no memory limit consumes all node memory, evicting other pods | Always set resource limits; BestEffort QoS pods are evicted first |
| OOMKilled pod enters CrashLoopBackOff, recovery takes minutes | Implement exponential backoff-aware health checks; consider PDB to maintain minimum replicas |
| HPA takes 2–3 minutes to scale; load spike causes errors in the meantime | HPA is reactive, not proactive — combine with predictive scaling or pod buffers |
| CPU throttling causes latency to spike 10x but no errors | CPU limits cause throttling; decide whether to set requests-only (burstable) or hard limits |
| Noisy neighbor degrades all pods on the node | Namespace-level resource quotas and dedicated node pools for workload isolation |

---

### Lab 4 — Dependency Failures: Database & External API Outages

**🏷️ Difficulty:** 🟡 Intermediate &nbsp;|&nbsp; **⏱️ Estimated Time:** 35–45 min &nbsp;|&nbsp; **🎯 Points:** 250

#### Description

Modern microservices depend on databases, caches, message queues, and external APIs. What happens when those dependencies become unavailable, slow, or start returning errors? This lab simulates dependency failures to test fallback paths, graceful degradation, and data consistency under partial outages.

#### What It Tests / Validates

- Graceful degradation when a backend dependency is unavailable
- Fallback logic (cached data, queued writes, default responses)
- Connection pool management and timeout configuration
- Data consistency during partial outages (eventual consistency, compensating transactions)
- External API failure handling (third-party payment gateway outage)

#### Step-by-Step Outline

**Phase 1: Establish Steady State**
1. Confirm all dependencies are healthy: PostgreSQL, Azure Service Bus, external Payment API (mock)
2. Run the full order flow: browse → add to cart → checkout → pay → confirm → notify
3. Record success rates, latency per service, and message queue depth

**Phase 2: Experiments**

**Experiment 4A — Database Outage**
1. Stop the PostgreSQL pod (or block network access from application pods to PostgreSQL)
2. Observe: Can users still browse the catalog? (read path — should use cache)
3. Observe: Can users place orders? (write path — should fail gracefully or queue)
4. Observe: What error messages do users see? Are they helpful?
5. Restore the database — check for data consistency
6. **Remediate:** Implement read-through cache for catalog, write-behind queue for orders, meaningful error messages

**Experiment 4B — Slow Database (Latency Injection)**
1. Inject 3-second delay on all database queries (using a proxy like `toxiproxy` or network delay)
2. Observe: Does connection pool exhaustion occur? Do all services slow down?
3. Check: Are database queries timed out? Is there a circuit breaker on the DB connection?
4. **Remediate:** Configure query timeouts, connection pool limits with overflow behavior, read replicas for read-heavy paths

**Experiment 4C — External Payment API Failure**
1. Configure the mock Payment API to return `503 Service Unavailable` for all requests
2. Observe: Can users still browse and add to cart? (should work)
3. Observe: What happens to checkout? Does the Order Service hang or fail fast?
4. Configure the mock to respond with 10s latency instead of errors
5. **Remediate:** Implement circuit breaker on payment calls, offer "pay later" fallback, async payment processing

**Experiment 4D — Message Queue (Service Bus) Failure**
1. Block connectivity to Azure Service Bus from the Notification Service
2. Observe: Do order placements fail? (they shouldn't — notifications are async)
3. Check: Are messages being queued? Will they be processed when connectivity is restored?
4. Restore connectivity — verify all notifications are eventually delivered (no message loss)
5. **Remediate:** Implement dead-letter queue handling, idempotent message processing, monitoring on queue depth

#### Expected Outcomes & Learning Points

| Observation | Learning |
|-------------|----------|
| Database outage causes immediate 500 errors on all endpoints | No caching layer, no fallback; every request hits the DB directly |
| Slow database causes thread pool exhaustion, cascading to all services | Unbounded connection pools and missing timeouts create cascading failures |
| Payment API failure blocks the entire checkout flow | Synchronous coupling to external dependency; consider async payment processing |
| Service Bus outage is invisible to users; notifications arrive after restore | Async, event-driven patterns provide natural resilience through decoupling |
| Data inconsistency after DB restore: some orders placed twice | Missing idempotency keys on retry logic; need exactly-once processing semantics |

---

### Lab 5 — Zone & Node Failures: Simulating Infrastructure Collapse

**🏷️ Difficulty:** 🔴 Advanced &nbsp;|&nbsp; **⏱️ Estimated Time:** 40–50 min &nbsp;|&nbsp; **🎯 Points:** 300

#### Description

AKS clusters often span multiple availability zones for high availability — but have you actually tested what happens when an entire zone goes down? This lab simulates zone-level and node-level failures to validate topology-aware scheduling, cross-zone data replication, and the cluster's ability to maintain service during infrastructure-level outages.

#### What It Tests / Validates

- Pod topology spread constraints and anti-affinity rules
- Cluster autoscaler behavior when nodes are lost
- Persistent volume (PV) handling across zone failures (zone-locked disks)
- Service mesh / load balancer behavior when backends in a zone disappear
- Recovery time objective (RTO) for infrastructure-level failures

#### Step-by-Step Outline

**Phase 1: Establish Steady State**
1. Map pod distribution across nodes and zones: `kubectl get pods -o wide` + node zone labels
2. Confirm pods are spread across at least 2 availability zones
3. Identify zone affinity of persistent volumes (PVs)
4. Baseline performance metrics and confirm multi-zone traffic distribution

**Phase 2: Experiments**

**Experiment 5A — Single Node Failure**
1. Cordon and drain a single AKS node: `kubectl cordon <node>` + `kubectl drain <node> --ignore-daemonsets --delete-emptydir-data`
2. Observe: How quickly are pods rescheduled? Do PDB constraints slow the drain?
3. Check: Are rescheduled pods placed in the same zone or distributed?
4. **Remediate:** Configure `topologySpreadConstraints`, ensure PDBs allow controlled draining

**Experiment 5B — Zone Failure (Simulated)**
1. Cordon all nodes in a single availability zone (simulating zone outage)
2. Drain all pods from those nodes simultaneously
3. Observe: Does the application remain available? What's the error rate spike?
4. Check: Can the remaining zones handle the full traffic load?
5. Check: What happens to PersistentVolumeClaims (PVCs) that were bound to the failed zone?
6. **Remediate:** Use zone-redundant storage (ZRS), topology-aware volume provisioning, ensure pod spread constraints require multi-zone distribution

**Experiment 5C — Cluster Autoscaler Under Zone Failure**
1. After draining a zone, trigger a traffic spike that requires scaling
2. Observe: Does the cluster autoscaler provision new nodes? In which zone?
3. Check: Is there enough quota/capacity in the remaining zones for scale-out?
4. **Remediate:** Pre-provision node pool capacity, configure autoscaler `--balance-similar-node-groups`

**Experiment 5D — Stateful Workload Zone Failure**
1. Identify which zone hosts the PostgreSQL primary (or the PV backing it)
2. Simulate failure of that zone
3. Observe: Does a standby replica promote? How long is the database unavailable?
4. Check: Is there data loss? (RPO)
5. **Remediate:** Use Azure Database for PostgreSQL Flexible Server with zone-redundant HA, or implement application-level multi-region writes

#### Expected Outcomes & Learning Points

| Observation | Learning |
|-------------|----------|
| All replicas of a service were on the same node → total outage when node fails | Missing pod anti-affinity / topology spread constraints |
| PVC fails to mount on new node in different zone | Zone-locked managed disks can't move across zones; use ZRS or replicated storage |
| Cluster autoscaler takes 5+ minutes to provision a new node | Node provisioning is slow; maintain warm node pools or use virtual nodes (ACI) for burst |
| Application survives zone failure with zero downtime | Properly configured topology constraints, zone-redundant storage, and sufficient capacity headroom |
| Database fails over but application hangs during failover | Application doesn't retry transient DB connection errors; need connection resilience |

---

### Lab 6 — Deployment Gone Wrong: Rollback & Certificate Expiry

**🏷️ Difficulty:** 🔴 Advanced &nbsp;|&nbsp; **⏱️ Estimated Time:** 40–50 min &nbsp;|&nbsp; **🎯 Points:** 300

#### Description

Not all chaos comes from infrastructure — sometimes we break our own systems with bad deployments, expired certificates, or misconfigured secrets. This lab simulates deployment failures, TLS certificate expiration, and secret rotation issues to test operational procedures and automated safeguards.

#### What It Tests / Validates

- Rolling deployment behavior with failing health checks
- Automatic rollback mechanisms
- TLS certificate expiry detection and impact
- Secret and config management resilience
- Deployment pipeline safeguards (canary analysis, progressive delivery)

#### Step-by-Step Outline

**Phase 2: Experiments**

**Experiment 6A — Bad Deployment (Crashing Container)**
1. Deploy a new version of Order Service with a bug that causes it to crash on startup (bad env var, missing secret, OOM on init)
2. Observe: Does the rolling deployment halt? (it should, if `maxUnavailable` is configured properly)
3. Check: Are old pods still running and serving traffic? Or did all pods get replaced?
4. Perform a manual rollback: `kubectl rollout undo deployment/order-service`
5. **Remediate:** Configure proper rolling deployment strategy (`maxSurge`, `maxUnavailable`), add `minReadySeconds`, use `progressDeadlineSeconds` for automatic failure detection

**Experiment 6B — Bad Deployment (Subtle Bug — Increased Error Rate)**
1. Deploy a version that starts successfully but returns 500 errors on 30% of requests
2. Observe: Does Kubernetes detect this? (standard health checks won't catch it)
3. Check: How long until someone notices? Do alerts fire?
4. **Remediate:** Implement canary deployments with automatic rollback (Flagger/Argo Rollouts), use metric-based health checks (error rate, latency), not just binary liveness probes

**Experiment 6C — TLS Certificate Expiry**
1. Replace the Ingress TLS certificate with one that expires in the past (or in 1 minute)
2. Observe: What happens to HTTPS traffic? What error do clients see?
3. Check: Is there monitoring on certificate expiry? Would anyone be alerted before expiry?
4. **Remediate:** Implement cert-manager with automatic renewal, add certificate expiry monitoring and alerting (alert at 30d, 7d, 1d before expiry), use Azure Key Vault for certificate management

**Experiment 6D — Secret Rotation**
1. Rotate the database password in PostgreSQL *without* updating the Kubernetes secret
2. Observe: How quickly do application pods lose database connectivity?
3. Check: Do pods need to restart to pick up new secrets? Or is there a live-reload mechanism?
4. **Remediate:** Use Azure Key Vault with CSI Secret Store driver for live secret sync, implement database credential rotation with zero-downtime (dual credentials during rotation window)

#### Expected Outcomes & Learning Points

| Observation | Learning |
|-------------|----------|
| Bad deployment replaces all pods → total outage | `maxUnavailable: 100%` is the default for Recreate strategy; use RollingUpdate with conservative values |
| Subtle bug passes health checks, serves errors for 20 minutes before anyone notices | Liveness/readiness probes only check binary health; need metric-based canary analysis for quality-of-service |
| Expired certificate causes immediate SSL errors; no monitoring alerted | Certificate lifecycle management must be automated; monitoring expiry is table stakes |
| Rotated DB secret causes pods to fail; need rolling restart to pick up new secret | Volume-mounted secrets auto-update, but env var-based secrets require pod restart; design for live reloading |

---

## Optional Tool Extensions

These integrations are **not required** for any lab but provide bonus points and deeper learning. Facilitators will provide quickstart guides for each.

### 🧪 Azure Chaos Studio

**Integration Points:**
- Use Chaos Studio's **Experiment Designer** in the Azure Portal to define fault injection experiments declaratively
- Run **agent-based faults** (CPU pressure, memory pressure, process kill) on AKS node VMs
- Run **service-direct faults** (AKS Chaos Mesh faults) for pod-level chaos
- Use **experiment scheduling** for repeatable, time-boxed chaos runs
- View experiment results and metrics directly in the portal

**Example Usage in Labs:**
- Lab 1: Create a "Pod Kill" experiment targeting Order Service pods
- Lab 3: Create a "CPU Stress" experiment with configurable pressure percentage and duration
- Lab 5: Create a "Network Disconnect" experiment targeting nodes in a specific zone

### 📊 Azure Load Testing

**Integration Points:**
- Create a JMeter or URL-based load test that simulates realistic user traffic
- Run the load test **concurrently with a chaos experiment** to observe degradation under realistic conditions
- Use Azure Load Testing's built-in **metrics integration** with Application Insights to correlate load patterns with failure events
- Compare baseline vs. chaos test results to quantify resilience

**Example Usage:**
- Before any lab: Establish a baseline load test result (throughput, latency, error rate)
- During Lab 2: Run load test while injecting network latency — observe latency amplification
- During Lab 3: Run load test while stressing CPU — observe throughput degradation

### 🤖 Azure SRE Agent

**Integration Points:**
- After injecting a fault, invoke the SRE Agent to perform root-cause analysis
- Compare the SRE Agent's automated diagnosis against your manual observations
- Explore how the agent recommends remediation actions
- Use the agent to assist with automated incident response during chaos experiments

### ❤️ Azure Health Models

**Integration Points:**
- Define a health model for the ResiliMart application (health hierarchy, dependencies, health signals)
- Visualize the application's health state in real-time during chaos experiments
- Observe how fault injection changes the health model's state (Healthy → Degraded → Unhealthy)
- Use health model state transitions as triggers for automated remediation

---

## DevAI Track — GitHub Copilot for Chaos Engineering

### Overview

The DevAI overlay track demonstrates how **GitHub Copilot** (IDE-integrated AI pair programmer) and **GitHub Copilot CLI** (terminal-based AI assistant) can dramatically accelerate chaos engineering workflows. Participants who opt into this track use Copilot throughout the hackathon and earn bonus points for effective AI-assisted development.

### GitHub Copilot Use Cases Across the Workshop

#### 🔧 1. Generating Chaos Experiment Configurations

**In the IDE (GitHub Copilot in VS Code):**
- Write a comment like `// Create a Chaos Mesh NetworkChaos resource that adds 500ms latency between order-service and inventory-service` and let Copilot generate the YAML
- Use Copilot Chat to ask: *"Generate a Kubernetes PodDisruptionBudget for order-service that ensures at least 2 replicas are always available"*
- Auto-complete Azure Chaos Studio ARM/Bicep experiment definitions

**In the Terminal (GitHub Copilot CLI):**
```bash
# Ask Copilot CLI to help construct chaos experiments
gh copilot suggest "kubectl command to delete a random pod from the order-service deployment"
gh copilot explain "kubectl drain node01 --ignore-daemonsets --delete-emptydir-data"
gh copilot suggest "create a Chaos Mesh StressChaos YAML that uses 2 CPU cores for 60 seconds on inventory-service"
```

#### 🛡️ 2. Writing Resilience Code (Remediations)

**In the IDE:**
- After discovering a missing circuit breaker, ask Copilot Chat: *"Add a Polly circuit breaker policy to this HttpClient call that opens after 5 failures and waits 30 seconds before half-opening"*
- Generate retry logic with exponential backoff: *"Wrap this database call with a retry policy: 3 retries, exponential backoff starting at 200ms, with jitter"*
- Implement graceful shutdown handlers: *"Add a SIGTERM handler to this Node.js Express server that stops accepting new connections, waits for in-flight requests to complete (max 30s), then exits"*
- Generate health check endpoints: *"Create a /healthz endpoint that checks database connectivity, service bus connectivity, and downstream service availability, returning a structured JSON response"*

#### 📊 3. Creating Monitoring & Observability

**In the IDE:**
- Generate Grafana dashboard JSON: *"Create a Grafana dashboard panel that shows request error rate by service with a 99.9% SLO threshold line"*
- Write PromQL queries: *"Write a PromQL query for p99 latency of HTTP requests to order-service, broken down by response status code"*
- Create alert rules: *"Generate a Prometheus AlertManager rule that fires when error rate exceeds 1% for more than 2 minutes"*
- Build Azure Monitor KQL queries: *"Write a KQL query for Application Insights that shows dependency failures grouped by dependency type in the last hour"*

#### 🔍 4. Troubleshooting & Analysis

**In the Terminal (GitHub Copilot CLI):**
```bash
# Debug pod issues
gh copilot suggest "kubectl command to show why the order-service pod is in CrashLoopBackOff"
gh copilot explain "kubectl describe pod order-service-7f8b9c6d4-x2z1a"

# Analyze network issues
gh copilot suggest "command to capture network traffic between two Kubernetes pods"
gh copilot suggest "kubectl command to check if DNS resolution is working inside a pod"

# Investigate resource issues
gh copilot suggest "kubectl command to show nodes sorted by CPU usage"
gh copilot suggest "kubectl top pods --sort-by=memory in the default namespace"
```

#### 📝 5. Authoring Experiment Documentation

**In the IDE:**
- Use Copilot to generate experiment runbooks from code comments
- Auto-generate post-experiment reports: *"Summarize the following chaos experiment results into a structured markdown report with sections: Hypothesis, What Happened, Root Cause, Remediation, Action Items"*
- Create Architecture Decision Records (ADRs) for resilience improvements

### Scoring for DevAI Track

| Action | Points |
|--------|:------:|
| Use Copilot CLI to construct a chaos experiment command (screenshot required) | +25 |
| Use Copilot to generate a working Chaos Mesh / Chaos Studio YAML definition | +50 |
| Use Copilot to write a resilience fix (circuit breaker, retry policy, PDB, etc.) | +50 |
| Use Copilot to create a Grafana dashboard or PromQL/KQL query | +50 |
| Use Copilot to troubleshoot a failure during an experiment (show the conversation) | +25 |
| Demonstrate a creative / novel use of Copilot in a chaos engineering context | +75 |
| Use Copilot CLI to explain a complex kubectl command to a teammate (knowledge sharing) | +25 |

**Maximum DevAI bonus: 300 points per team**

---

## Pre-Requisites & Environment Setup

### Participant Pre-Requisites

| Requirement | Details |
|-------------|---------|
| **Skill Level** | Comfortable with basic Kubernetes concepts (pods, deployments, services) and CLI usage |
| **Laptop** | Personal or corporate laptop with admin rights to install tools |
| **Azure Subscription** | Provided for the workshop (shared resource group per team) |
| **GitHub Account** | Required for Copilot access (Copilot license must be active) |
| **IDE** | VS Code with GitHub Copilot extension installed |

### Tools to Install Before the Workshop

```bash
# Required Tools
az              # Azure CLI (v2.50+)
kubectl         # Kubernetes CLI (v1.27+)
helm            # Helm package manager (v3.12+)
gh              # GitHub CLI (v2.30+) — for Copilot CLI integration

# Recommended Tools
k9s             # Terminal UI for Kubernetes (makes observation easier)
jq              # JSON processor (for parsing kubectl output)
kubectx/kubens  # Quick context/namespace switching

# GitHub Copilot CLI
gh extension install github/gh-copilot   # Install the Copilot CLI extension
```

### Environment Architecture (Provided)

Each team receives:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TEAM ENVIRONMENT                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  AKS Cluster (3 nodes, 3 availability zones)                       │
│  ├── Namespace: team-{N}                                           │
│  │   ├── ResiliMart Application (all microservices)                │
│  │   ├── PostgreSQL (in-cluster, single replica)                   │
│  │   └── Load Generator (configurable traffic)                     │
│  │                                                                  │
│  ├── Namespace: observability                                       │
│  │   ├── Prometheus + Grafana (shared, team-specific dashboards)   │
│  │   └── Jaeger (distributed tracing)                              │
│  │                                                                  │
│  └── Namespace: chaos-mesh                                          │
│      └── Chaos Mesh (chaos experiment CRDs)                        │
│                                                                     │
│  Azure Resources:                                                   │
│  ├── Azure Chaos Studio (experiments scope: team namespace)        │
│  ├── Azure Load Testing (pre-configured test plan)                 │
│  ├── Azure Monitor + Application Insights                          │
│  └── Azure Service Bus (team-specific queue)                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Setup Validation Checklist

Participants run this on arrival:

```bash
# 1. Login to Azure
az login
az account set --subscription "Chaos-Hackathon-Sub"

# 2. Get AKS credentials
az aks get-credentials --resource-group rg-chaos-hack --name aks-chaos-hack

# 3. Verify cluster access
kubectl get nodes                          # Should show 3 nodes
kubectl get pods -n team-{N}               # Should show ResiliMart pods
kubectl get pods -n chaos-mesh             # Should show Chaos Mesh components

# 4. Verify observability
kubectl port-forward svc/grafana 3000:3000 -n observability &
# Open http://localhost:3000 — should see pre-built dashboards

# 5. Verify Copilot CLI
gh copilot suggest "list all pods in my namespace"

# 6. Run the smoke test
curl http://<ingress-ip>/api/health        # Should return {"status":"healthy"}
```

---

## Scoring & Gamification

### 🎮 Points System

Scoring incentivizes the **full chaos engineering lifecycle**: not just breaking things, but learning from them and hardening the system.

```
CATEGORY               POINTS    CRITERIA
──────────────────────────────────────────────────────────────────────
Experiment Design        50      Clear hypothesis, defined blast radius, abort conditions
Experiment Execution    100      Successfully injected fault and observed impact
Observation Quality      75      Captured metrics, logs, and/or traces as evidence
Root Cause Analysis      75      Correctly identified why the system behaved as it did
Remediation             100      Implemented a fix that addresses the root cause
Validation              100      Re-ran experiment post-fix and demonstrated improvement
Documentation            50      Written experiment report (hypothesis, result, learnings)
──────────────────────────────────────────────────────────────────────
TOTAL PER LAB           550      (varies by lab difficulty multiplier)
```

**Difficulty Multipliers:**
- 🟢 Green labs: 1.0x
- 🟡 Yellow labs: 1.5x
- 🔴 Red labs: 2.0x

### 🏆 Awards Categories

| Award | Criteria | Prize |
|-------|----------|-------|
| **🥇 Most Resilient System** | Highest total score across all completed labs | Grand prize |
| **🧪 Best Experiment** | Most creative and insightful chaos experiment (judge vote) | Prize |
| **🤖 Best Copilot Usage** | Most effective and creative use of GitHub Copilot (DevAI track) | Prize |
| **💥 Most Creative Chaos** | Most imaginative failure scenario or combination attack | Prize |
| **📊 Best Post-Mortem** | Best experiment documentation and root-cause analysis | Prize |
| **⚡ Speed Demon** | First team to complete 3 experiments end-to-end | Prize |

### 📊 Live Leaderboard

A live-updating leaderboard will be displayed on a shared screen throughout the hackathon. Teams can see:
- Their current score and rank
- Which labs each team has completed
- Bonus points earned (tool extensions, DevAI track)
- Time-based bonus: early completions earn a 10% bonus

### 🎲 Chaos Joker Cards (Surprise Challenges)

At two random points during the hackathon, the facilitator will announce a **Chaos Joker** — a surprise, time-boxed challenge that all teams must respond to simultaneously:

- **"Joker 1: The Cascade"** — A pre-injected failure hits the shared infrastructure (e.g., DNS service degraded). Teams must diagnose, mitigate, and recover within 10 minutes. First team to full recovery gets 200 bonus points.
- **"Joker 2: The Mystery"** — A silent fault is injected into each team's environment. Teams have 15 minutes to detect, identify, and fix it. The fault could be anything: a memory leak, a misconfigured secret, a cert about to expire, or a rogue pod consuming resources.

---

## Success Metrics

### Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| **Participation Rate** | ≥ 90% of registered attendees complete at least 1 lab | Lab completion tracking |
| **Lab Completion** | Average of ≥ 2.5 labs completed per team | Scoring system |
| **Remediation Rate** | ≥ 60% of experiments include a successful remediation | Scoring system |
| **Environment Stability** | Zero unrecoverable environment failures during the event | Facilitator monitoring |
| **Net Promoter Score (NPS)** | ≥ 50 (post-workshop survey) | Survey tool |
| **Satisfaction Score** | ≥ 4.2 / 5.0 average rating | Post-workshop survey |

### Qualitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|--------------------|
| **Skill Uplift** | Participants self-report improved confidence in chaos engineering (pre/post survey delta ≥ 1.5 points on 5-point scale) | Pre/post survey |
| **Follow-Up Adoption** | ≥ 30% of teams run a chaos experiment on their own services within 30 days | Follow-up survey at 30 days |
| **Tool Adoption** | ≥ 3 teams adopt Azure Chaos Studio or Chaos Mesh for regular use within 60 days | Follow-up survey at 60 days |
| **Knowledge Sharing** | ≥ 50% of participants share learnings with their broader team within 2 weeks | Follow-up survey at 14 days |
| **Copilot Awareness** | ≥ 80% of DevAI track participants continue using Copilot CLI regularly | Follow-up survey at 30 days |

### Post-Workshop Deliverables

1. **Experiment Library** — All participant-written chaos experiments compiled into a shared repository for reuse
2. **Resilience Patterns Catalog** — Documented remediation patterns discovered during the hackathon
3. **Team Retrospective Reports** — Each team's experiment reports and learnings
4. **Workshop Improvement Backlog** — Facilitator notes on what to improve for the next iteration
5. **Recorded Lightning Talks** — Video recordings of team presentations for asynchronous sharing

---

## Appendix

### Appendix A — ResiliMart Application Architecture

```
                                    ┌──────────────┐
                                    │   Frontend   │
                                    │  (React SPA) │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │ API Gateway  │
                                    │(NGINX Ingress)│
                                    └──┬───┬───┬───┘
                           ┌───────────┘   │   └───────────┐
                    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────────┐
                    │   Order     │ │  Inventory  │ │  Notification   │
                    │  Service    │ │  Service    │ │  Service        │
                    │ (Node.js)   │ │  (Go)       │ │  (Python)       │
                    └──┬──────┬──┘ └──────┬──────┘ └────────┬────────┘
                       │      │           │                  │
                ┌──────▼──┐ ┌─▼──────────▼─┐        ┌──────▼────────┐
                │ Payment │ │ PostgreSQL    │        │ Azure Service │
                │ Service │ │ (in-cluster)  │        │ Bus           │
                │ (C#)    │ └──────────────┘        └───────────────┘
                └────┬────┘
                     │
              ┌──────▼────────┐
              │ External      │
              │ Payment API   │
              │ (Mock)        │
              └───────────────┘
```

### Appendix B — Facilitator Checklist

- [ ] AKS cluster provisioned with 3 nodes across 3 AZs
- [ ] ResiliMart application deployed and smoke-tested per team namespace
- [ ] Chaos Mesh installed and verified
- [ ] Azure Chaos Studio experiments pre-configured (templates)
- [ ] Observability stack deployed (Prometheus, Grafana, Jaeger)
- [ ] Azure Load Testing plan created and validated
- [ ] Team Azure credentials and RBAC configured
- [ ] Load generators deployed and tested
- [ ] Grafana dashboards pre-built (one per team + shared overview)
- [ ] GitHub Copilot licenses verified for all participants
- [ ] Lab instruction handouts printed / shared digitally
- [ ] Scoring spreadsheet / leaderboard app ready
- [ ] Chaos Joker challenges prepared and tested
- [ ] Backup plan for environment failures (second cluster on standby)
- [ ] Prize procurement complete

### Appendix C — Recommended Reading & Resources

| Resource | Link |
|----------|------|
| Principles of Chaos Engineering | [principlesofchaos.org](https://principlesofchaos.org) |
| Chaos Mesh Documentation | [chaos-mesh.org](https://chaos-mesh.org/docs/) |
| Azure Chaos Studio Documentation | [learn.microsoft.com/azure/chaos-studio](https://learn.microsoft.com/en-us/azure/chaos-studio/) |
| GitHub Copilot CLI Documentation | [docs.github.com/copilot/github-copilot-in-the-cli](https://docs.github.com/en/copilot/github-copilot-in-the-cli) |
| Kubernetes Pod Disruption Budgets | [kubernetes.io/docs/tasks/run-application/configure-pdb](https://kubernetes.io/docs/tasks/run-application/configure-pdb/) |
| Azure Well-Architected Framework: Reliability | [learn.microsoft.com/azure/well-architected/reliability](https://learn.microsoft.com/en-us/azure/well-architected/reliability/) |
| *Chaos Engineering* (O'Reilly) by Casey Rosenthal et al. | O'Reilly Media |

---

*Document Version: 1.0 · Author: Cloud Solution Architecture Team · Date: 2025 · Status: DRAFT — Pending Leadership Approval*
