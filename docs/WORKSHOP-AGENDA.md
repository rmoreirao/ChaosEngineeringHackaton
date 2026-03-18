# Chaos Engineering + GenAI Workshop — Agenda

> 3-hour hands-on workshop in a sandbox environment. Each team gets their own AKS cluster.

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

Use GitHub Copilot and GitHub Copilot CLI to generate chaos experiments, diagnose failures, and accelerate troubleshooting.

| Challenge | Topic |
|-----------|-------|
| 1 | Generate chaos experiments with GitHub Copilot CLI |
| 2 | Diagnose broken deployments with AI |
| 3 | Generate load test scripts with AI |
| 4 | Context engineering for better AI results |
| 5 | Cleanup |

## 15:15 – 15:30 | [Lab 3 — AI-Driven Resilience Improvement](../labs/lab3-ai-driven-resilience/) (~15 min)

Use AI tools to investigate failures from Labs 1-2 and improve system resilience.

| Challenge | Topic |
|-----------|-------|
| 1 | Generate resilience improvements with AI (replicas, PDB, HPA) |
| 2 | Harden the database |
| 3 | Build a simple detection script |
| 4 | Design a resilience runbook |
| 5 | Cleanup & final state |

## 15:30 – 16:00 | Sharing Results & Lessons Learned (30 min)

- Each team presents: what they broke, what they learned, what they improved
- Group discussion on findings and real-world applications
- Key takeaways: hypothesis-driven experiments, AI as a co-pilot, defense in depth