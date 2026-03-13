# Operation Controlled Chaos: The Azure AKS Resilience Hackathon

## Executive Summary
**"Break it to build it better."**

This workshop is a high-intensity, hands-on hackathon designed for software engineers and SREs. The goal is simple: demystify Chaos Engineering by applying it directly to a live Azure Kubernetes Service (AKS) environment. Unlike traditional workshops laden with slides, this session devotes 90% of its time to practical "break-fix" scenarios. 

Participants will use industry-standard tools and Azure-native services (Chaos Studio, Load Testing) to inject failures, observe system behavior, and architect resilience. A dedicated **DevAI Track** introduces GitHub Copilot and GitHub Copilot CLI as force multipliers, demonstrating how AI can accelerate experiment design, automation, and root cause analysis.

## Learning Objectives
By the end of this workshop, participants will be able to:
1.  **Identify** single points of failure in microservices architectures on AKS.
2.  **Execute** controlled chaos experiments using Azure Chaos Studio and open-source tools.
3.  **Analyze** system behavior during failure using Azure Monitor and Application Insights.
4.  **Remediate** discovered weaknesses by implementing resilience patterns (circuit breakers, retries, fallbacks).
5.  **Leverage** GitHub Copilot to generate infrastructure-as-code, chaos definitions, and troubleshooting scripts rapidly.

---

## Agenda (Half-Day Format: 4 Hours)

| Time | Activity | Description |
| :--- | :--- | :--- |
| **09:00 - 09:15** | **Kickoff & Briefing** | Welcome, teams setup, and "Rules of Engagement". |
| **09:15 - 09:30** | **The Theory of Chaos** | *Brief* overview: Hypothesis -> Experiment -> Observation -> Fix. |
| **09:30 - 10:00** | **Environment & Tool Check** | Verifying access to AKS, Azure Portal, and Copilot CLI. Deploying the "Victim App". |
| **10:00 - 12:30** | **The Chaos Labs (Choose Your Path)** | Teams execute experiments from the catalog. Support is provided by floating mentors. |
| **12:30 - 13:00** | **Show & Tell + Scoring** | Teams present their coolest "break" and fix. Winners announced. |

---

## Tracks & Paths

Participants can choose a track based on their experience or focus area:

1.  **🔰 The Apprentice (Beginner)**
    *   Focus: Understanding basic Kubernetes failures.
    *   Tools: `kubectl` delete, simple Network Policies.
    *   Goal: Keep the app running while pods die.

2.  **🛡️ The Guardian (Intermediate/Advanced)**
    *   Focus: Complex failures, latency, and resource exhaustion.
    *   Tools: Azure Chaos Studio, Azure Load Testing.
    *   Goal: Maintain SLOs under heavy stress and partial outages.

3.  **🤖 The AI-Augmented Engineer (DevAI Focus)**
    *   Focus: Using AI to do the heavy lifting.
    *   Tools: GitHub Copilot, Copilot CLI.
    *   Goal: Complete challenges faster by prompting Copilot to write the chaos specs and fix the code.

---

## Hands-on Lab Scenarios

Teams must deploy the **"Victim App"** (a microservices-based e-commerce store) and then choose from the following experiments.

### Scenario 1: "The Vanishing Pod" (Pod Failure)
*   **Description:** Randomly terminate application pods in the checkout service.
*   **Validates:** ReplicaSet configuration, startup probes, and session persistence.
*   **Steps:**
    1.  Establish a baseline error rate.
    2.  Use Chaos Studio "AKS Chaos Mesh" fault to kill `checkout-service` pods every 60 seconds.
    3.  Observe user experience during the churn.
*   **Expected Outcome:** 500 errors appear if only 1 replica exists. Success = Zero downtime via `replicas: 3` and `podDisruptionBudget`.

### Scenario 2: "The Sloth" (Latency Injection)
*   **Description:** Inject 2 seconds of latency between the Frontend and the Product Catalog.
*   **Validates:** Timeouts, UX handling of slow responses, and cascading failures.
*   **Steps:**
    1.  Configure a network latency fault targeting the Product Catalog service port.
    2.  Browse the frontend. Does the whole page hang?
*   **Expected Outcome:** The page loads indefinitely (failure). Success = Frontend returns a cached version or a "Catalog Unavailable" message quickly (Circuit Breaker implementation).

### Scenario 3: "The Noisy Neighbor" (Resource Exhaustion)
*   **Description:** Simulate a rogue process consuming 100% CPU on a specific node.
*   **Validates:** Resource Limits/Requests, Horizontal Pod Autoscaler (HPA), and Node Autoscaling.
*   **Steps:**
    1.  Deploy a "stress" pod to a node hosting critical services.
    2.  Watch CPU metrics spike.
    3.  Observe if critical neighbors are throttled or evicted.
*   **Expected Outcome:** Critical apps slow down. Success = Strict `requests/limits` protect the critical app, and HPA triggers new pods on a healthy node.

### Scenario 4: "The DNS Blackhole" (Core Infrastructure Failure)
*   **Description:** Simulate a failure in resolving internal service names.
*   **Validates:** Application retry logic and DNS caching behavior.
*   **Steps:**
    1.  Block traffic to CoreDNS (UDP 53) for the Payment service.
    2.  Attempt a transaction.
*   **Expected Outcome:** Immediate connection failures. Success = App retries exponentially and logs a specific DNS error rather than a generic timeout.

### Scenario 5: "The Deprecated Secret" (Certificate Expiration)
*   **Description:** Simulate an expired TLS certificate for the internal API gateway.
*   **Validates:** Monitoring alerts and automated rotation logic (or manual panic response!).
*   **Steps:**
    1.  Replace the valid secret with an invalid/expired self-signed cert.
    2.  Monitor internal traffic.
*   **Expected Outcome:** TLS Handshake errors. Success = Azure Monitor triggers an alert *before* the swap (simulation) or rapid rollback capability is demonstrated.

---

## Integrating GitHub Copilot & Copilot CLI

For the **DevAI Track**, the workflow is entirely different. Participants must solve the challenges using AI assistance.

*   **Experiment Generation:**
    *   *Prompt:* "Write a Chaos Mesh YAML configuration that adds 500ms latency to all traffic going to the 'cart' service."
    *   *Copilot CLI:* `?? create a chaos experiment json for azure chaos studio to stop aks cluster`
*   **Resilience Code:**
    *   *Prompt:* "Refactor this HTTP client in Go to include a circuit breaker pattern using the Sony/gobreaker library with a 2-second timeout."
*   **Monitoring & Analysis:**
    *   *Prompt:* "Write a KQL query for Azure Application Insights to find the 99th percentile latency for requests that resulted in a 500 error."
*   **Troubleshooting:**
    *   *Copilot CLI:* `?? explain why this kubectl command failed with ImagePullBackOff`

## Pre-requisites & Setup

1.  **Azure Subscription:** Contributor access to a sandbox resource group.
2.  **Development Environment:** VS Code, Docker, Azure CLI, kubectl.
3.  **GitHub Access:** GitHub Copilot license active.
4.  **Baseline Architecture:** A Bicep/Terraform script will be provided to deploy the "Victim App" on AKS with Azure Monitor and Chaos Studio pre-wired.

## Gamification & Scoring

Teams earn points to win the "Chaos Champion" title.

| Criteria | Points |
| :--- | :--- |
| **Successful Break:** Executing a valid experiment that causes visible downtime. | 100 |
| **Successful Fix:** Deploying code/config that prevents the failure from affecting users. | 200 |
| **Observability Bonus:** Showing a dashboard that clearly pinpointed the root cause. | 50 |
| **Copilot Assist:** Using Copilot to generate the fix (must show prompt log). | 50 |
| **Creative Chaos:** Inventing a custom failure scenario not in the guide. | 150 |

## Success Metrics

*   **Participant Confidence:** % of attendees who feel ready to run a chaos experiment in Dev/Test.
*   **Resilience Score:** % of scenarios "survived" by the Victim App by the end of the session.
*   **AI Adoption:** Number of unique Copilot prompts used to solve challenges.
