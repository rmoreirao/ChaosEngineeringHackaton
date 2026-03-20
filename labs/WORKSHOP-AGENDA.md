# Chaos Engineering + GenAI Workshop — Agenda

> ~3.5-hour hands-on workshop in a sandbox environment. Each team gets their own AKS cluster.

---

## 13:00 – 13:15 | Introduction to Chaos Engineering (15 min)

- What is Chaos Engineering and why it matters
- Core principles: steady state, hypothesis, inject failure, observe, learn
- Real-world examples of chaos engineering in practice

## 13:15 – 13:30 | Workshop Environment & Architecture (15 min)

- **Oranje Markt** application overview: Frontend (Next.js) → Backend (Express) → PostgreSQL
- AKS cluster walkthrough: nodes, namespaces, deployments
- Observability stack: Prometheus, Grafana, Loki
- Intentional weaknesses in the architecture (your targets!)
- Lab structure and expected outcomes

## 13:30 – 14:30 | [Lab 1 — Manual Chaos Experiments](../labs/lab1-manual-chaos/) (~60 min)

Inject failures into Kubernetes microservices and observe results using the observability stack.

| Challenge | Topic |
|-----------|-------|
| 1 | Explore the environment & define steady state |
| 2 | Kill a pod — observe self-healing |
| 3 | Kill the database — observe cascading failure |
| 4 | Simulate network disruption |
| 5 | Drain a node — observe rescheduling |
| 6 | Load test to breaking point |
| 7 | Cleanup |

## 14:30 – 15:15 | [Lab 2 — AI-Driven Chaos Experiments](../labs/lab2-ai-driven-chaos/) (~45 min)

Use GenAI to guide you through the **complete chaos engineering lifecycle** — from risk analysis to experiment execution to results analysis.

| Challenge | CE Phase | Topic |
|-----------|----------|-------|
| 1 | Phase 0 — Risk | Failure Mode Analysis (FMA) with AI |
| 2 | Phase 1 — Hypothesis | Generate testable hypotheses from the FMA |
| 3 | Phase 2.1 — Steady State | Define & verify steady-state metrics with AI |
| 4 | Phase 2.2 — Disrupt | Plan & introduce disruptions using AI-generated scripts |
| 5 | Phase 2.3 — Observe | Observe & analyze results — produce experiment report |
| ⭐ Extra | All Phases | **Autonomous execution** — Copilot runs the full experiment lifecycle from a single prompt |
| 6 | — | Cleanup |

## 15:15 – 15:45 | [Lab 3 — AI-Driven Resilience Improvement](../labs/lab3-ai-driven-resilience/) (~30 min)

Now that experiments are done, it's time to **improve the system based on your learnings**. Use GenAI to analyze chaos experiment findings, recommend improvements across all layers, and implement quick wins.

| Challenge | Topic |
|-----------|-------|
| 1 | **From Experiments to Improvements** — Feed chaos findings + architecture to AI → get a prioritized resilience roadmap across all layers (K8s, infra, observability, code) |
| 2 | **Implement Quick Wins with AI** — Pick 1-2 top recommendations and use AI to generate & apply the fix (e.g., replicas + PDB, alerting rules, or code-level retries) |
| 3 | **Validate** — Re-run a Lab 1 chaos experiment and compare before/after results |
| 4 | Cleanup & wrap-up |

## 15:45 – 16:15 | Sharing Results & Lessons Learned (30 min)

- Each team presents: what they broke, what they learned, what they improved
- Group discussion on findings and real-world applications
- Key takeaways: hypothesis-driven experiments, AI as a co-pilot, defense in depth