# Chaos Engineering + GenAI Workshop
### Hands-on Reliability Engineering with AKS and AI Developer Tools

---

# Overview

This workshop introduces software engineers to **Chaos Engineering** principles and demonstrates how **Generative AI developer tools** can accelerate resilience testing, troubleshooting, and reliability improvements in cloud-native environments.

The session combines a short theoretical introduction with **hands-on experiments performed in a Kubernetes environment running on Azure Kubernetes Service (AKS)**.

Participants will use AI tools such as **GitHub Copilot and AI assistants** to:

- Generate chaos experiments
- Investigate failures
- Improve system resilience
- Automate reliability testing
- Design reliability experiments

The workshop emphasizes **learning by breaking systems safely**.

---

# Workshop Format

**Total Duration:** 60–90 minutes

| Phase | Activity | Duration |
|------|---------|--------|
| Introduction | Chaos Engineering fundamentals | 10–15 min |
| Architecture | System and observability overview | 5 min |
| Experiment Setup | AI generates chaos experiments | 10 min |
| Chaos Experiments | Engineers run failure scenarios | 30–40 min |
| Game Mode | Chaos team vs Reliability team | 15–20 min |
| Wrap-up | Lessons learned | 5 min |

---

# Learning Objectives

By the end of the workshop participants will:

- Understand **Chaos Engineering principles**
- Learn how to **define steady state**
- Formulate **resilience hypotheses**
- Inject failures into **Kubernetes microservices**
- Use **AI to generate chaos experiments**
- Use **AI to investigate failures**
- Apply **resilience engineering patterns**

Examples of resilience techniques:

- Retries
- Circuit breakers
- Timeouts
- Autoscaling
- Graceful degradation

---

# Chaos Engineering Fundamentals

Chaos Engineering improves system resilience by **deliberately introducing failures** and observing how systems behave.

Instead of waiting for incidents in production, teams **simulate failures proactively**.

---

## 1. Define the Steady State

Steady state represents **normal system behavior**.

Examples:

- Checkout success rate > 99%
- API latency < 200 ms
- Error rate < 1%

---

## 2. Form a Hypothesis

Example hypothesis:

> If a single payment service pod crashes, traffic will automatically route to another replica without affecting users.

---

## 3. Introduce Failure

Failures can include:

- Pod crashes
- Network latency
- CPU exhaustion
- Dependency failures
- DNS failures

---

## 4. Observe the System

Use observability tools:

- Metrics
- Logs
- Traces
- Dashboards

Example tools:

- Prometheus
- Grafana
- Azure Monitor

---

## 5. Learn and Improve

Apply resilience improvements such as:

- Retry policies
- Circuit breakers
- Autoscaling
- Caching
- Rate limiting

---

# Workshop Environment

The workshop runs a **microservices application on AKS**.

## Example Architecture
