# Lab 2 — AI-Driven Chaos Experiments

## Objective

Learn how to leverage AI-powered developer tools to accelerate chaos engineering workflows. Use GitHub Copilot and GitHub Copilot CLI to generate chaos experiments, diagnose failures, and fix broken deployments faster.

By the end of this lab you will:
- Use GitHub Copilot CLI to generate `kubectl` chaos commands from natural language
- Diagnose intentionally broken Kubernetes deployments using AI-assisted workflows
- Generate load testing scripts with AI
- Apply context engineering principles for effective AI-assisted troubleshooting
- Understand the strengths and limitations of AI tools for infrastructure operations

## Prerequisites
- Completed Lab 1
- GitHub Copilot extension installed in VS Code
- GitHub Copilot CLI installed: `gh extension install github/gh-copilot`
- `kubectl` connected to the AKS cluster
- Oranje Markt application running

## Reference Documentation
- [GitHub Copilot CLI documentation](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line)
- [Context engineering lessons from Azure SRE Agent](https://techcommunity.microsoft.com/blog/appsonazureblog/context-engineering-lessons-from-building-azure-sre-agent/4481200)

---

## Challenge 1 — Generate Chaos Experiments with GitHub Copilot CLI

**Goal:** Use GitHub Copilot CLI to generate chaos experiment commands from natural language descriptions. Compare AI-generated commands with manual approaches from Lab 1.

**Requirements:**
1. Use `gh copilot suggest` to generate kubectl commands for chaos injection. Try these prompts:
   - "Delete a random pod from the backend deployment in namespace oranje-markt"
   - "Create a Kubernetes Job that runs a CPU stress test in namespace oranje-markt"
   - "Generate a kubectl command to scale the backend deployment to 0 replicas and back to 1"
   - "Create a command to add 5 seconds of network latency to the backend pod"
2. Review each generated command before running it
3. Run at least 2 of the generated experiments
4. Observe the results in Grafana — are they similar to your Lab 1 experiments?
5. Use `gh copilot explain` on any command you don't fully understand

**What to observe:**
- How accurate are the generated commands?
- Do they need modifications before running?
- How does the AI handle Kubernetes-specific concepts (namespaces, labels, selectors)?
- Are the generated experiments safe to run?

**Hints:**
- `gh copilot suggest -t shell "your prompt here"` generates shell commands
- `gh copilot explain "kubectl drain node-name --ignore-daemonsets"` explains what a command does
- Always review generated commands — check the namespace, labels, and resource names
- If a generated command is wrong, refine your prompt with more specifics

> **Discussion:** What are the risks of running AI-generated infrastructure commands without review? How would you build guardrails into an AI-assisted operations workflow?

---

## Challenge 2 — Diagnose Broken Deployments with AI

**Goal:** Three intentionally broken deployments have been prepared. Use GitHub Copilot to diagnose and fix each issue.

**Setup:**
```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/01-crashloop.yaml
```

**Broken Deployment 1 — CrashLoopBackOff:**

**Requirements:**
- Observe the broken pod: `kubectl get pods -n oranje-markt -l app=chaos-crashloop -w`
- Gather diagnostic context:
  ```bash
  kubectl describe pod -n oranje-markt -l app=chaos-crashloop
  kubectl logs -n oranje-markt -l app=chaos-crashloop --previous
  ```
- Paste the output into GitHub Copilot Chat and ask: "Why is this pod in CrashLoopBackOff? Here are the events and logs: [paste]"
- Apply the fix suggested by Copilot

**Broken Deployment 2 — ImagePullBackOff:**

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/02-imagepull.yaml
```

**Requirements:**
- Diagnose why the image cannot be pulled
- Ask Copilot: "What causes ImagePullBackOff and how do I fix this? Events: [paste kubectl describe output]"
- Fix the manifest with the correct image reference

**Broken Deployment 3 — Pending (Resource Constraints):**

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/03-resource-constraint.yaml
```

**Requirements:**
- Investigate why pods are stuck in `Pending` state
- Gather context: `kubectl describe pod`, `kubectl top nodes`
- Ask Copilot to analyze the scheduling failure
- Fix the resource requests to allow scheduling

**What to observe:**
- How quickly can Copilot identify root causes with good context?
- Does Copilot distinguish between different failure types?
- How does the quality of your diagnostic input affect the quality of the AI output?

**Hints:**
- Always start with `kubectl describe pod` and `kubectl logs`
- Provide Copilot with specific error messages, not just "it's broken"
- Compare fixing manually vs. with AI assistance — which is faster?

> **Discussion:** What is the minimum context an AI tool needs for accurate Kubernetes diagnosis? How does providing more context improve results?

---

## Challenge 3 — Generate Load Test Scripts with AI

**Goal:** Use GitHub Copilot to generate load testing scripts targeting the Oranje Markt API.

**Requirements:**
1. Ask GitHub Copilot (in VS Code or CLI) to generate a load test. Example prompts:
   - "Generate a shell script that sends 100 concurrent requests to http://backend:4000/api/products from inside a Kubernetes cluster"
   - "Create a kubectl run command that generates sustained HTTP load against the backend service for 2 minutes"
2. Review and run the generated script
3. Monitor the impact in Grafana (request rate, latency, error rate)
4. Iterate: ask Copilot to modify the script for different scenarios:
   - High concurrency (50+ simultaneous requests)
   - Large payloads (POST requests with big JSON bodies)
   - Sustained load over time (5 minutes)
5. Compare the AI-generated load test with the existing tests in `tests/load/`

**What to observe:**
- Quality of generated load test scripts — do they work out of the box?
- Can you use Copilot to iterate and refine the tests?
- Does the AI-generated load expose the same bottlenecks you found in Lab 1?

**Hints:**
- Simple approach: `kubectl run` with `wget` or `curl` in a loop
- More advanced: ask Copilot to generate a `k6` script or a Python script
- Remember to clean up load test pods after each run
- The existing `tests/load/` directory has Playwright-based load tests you can reference

> **Discussion:** How can AI-generated load tests complement traditional load testing tools? What scenarios are hard for AI to generate without domain knowledge?

---

## Challenge 4 — Context Engineering for Better AI Results

**Goal:** Practice structuring prompts to get the best results from AI diagnostic tools. Learn the difference between vague and structured prompts.

**Requirements:**

1. **Vague prompt experiment:**
   - Deploy a broken app (or use one from Challenge 2)
   - Ask Copilot: "My app is broken, fix it"
   - Record the response quality (generic? helpful? actionable?)

2. **Structured prompt experiment:**
   Apply the **Symptoms → Expected → Context → Tried** framework:
   ```
   SYMPTOMS: My backend pod in namespace oranje-markt is returning 500 errors 
   on the /api/products endpoint.
   
   EXPECTED: The endpoint should return a JSON array of products with HTTP 200.
   
   CONTEXT:
   - Pod logs show: "Error: connect ECONNREFUSED 10.0.0.15:5432"
   - The postgres pod was recently restarted
   - kubectl describe pod shows: Ready 1/1, Running
   - The DATABASE_URL env var points to postgres:5432
   
   TRIED:
   - Restarted the backend pod — same error after restart
   - Verified postgres service exists: kubectl get svc postgres -n oranje-markt
   
   What is the root cause and how do I fix it?
   ```
   - Record the response quality — compare with the vague prompt

3. **Iterate and refine:**
   - Start with a medium prompt, then add more context based on Copilot's follow-up questions
   - Document how each additional piece of context improved the diagnosis

**What to observe:**
- Night-and-day difference between vague and structured prompts
- Structured context produces specific, actionable diagnoses
- The AI's suggestions improve as you provide more relevant information
- Domain-specific language (Kubernetes terminology) helps the AI

**Key context engineering principles:**
- **Gather before concluding**: Collect logs, events, pod descriptions before asking
- **Structure your context**: Symptoms → Expected → Context → Tried
- **Be specific**: "pod X in namespace Y with label Z" beats "my pod"
- **Include the YAML**: Pod specs help diagnose misconfigurations
- **Iterate**: Use AI output to refine your next question

> **Discussion:** How does the context engineering approach from the Azure SRE Agent blog apply to daily DevOps work? How can you teach a team to write better prompts for infrastructure troubleshooting?

---

## Challenge 5 — Cleanup

Remove all broken deployments created during this lab:

```bash
kubectl delete deployment -n oranje-markt chaos-crashloop chaos-imagepull chaos-resource --ignore-not-found
kubectl delete pod -n oranje-markt -l run=load-test --ignore-not-found

# Verify only the original Oranje Markt pods remain
kubectl get pods -n oranje-markt
```

---

## Summary

| Concept | What You Should Have Learned |
|---------|------------------------------|
| **AI-generated chaos commands** | Copilot CLI can generate kubectl commands from natural language, but always review before running |
| **AI-assisted diagnosis** | Providing structured context (logs, events, YAML) dramatically improves AI diagnosis quality |
| **Load test generation** | AI can scaffold load tests quickly, but domain knowledge is needed for realistic scenarios |
| **Context engineering** | The Symptoms → Expected → Context → Tried framework produces the best AI results |
| **Human-in-the-loop** | AI is a co-pilot, not autopilot — always validate suggestions before applying to infrastructure |

## Key Takeaways

1. **Review before running**: AI-generated infrastructure commands must be reviewed for safety, correct namespaces, and correct resources
2. **Context is king**: The quality of AI assistance is directly proportional to the quality of context you provide
3. **Structure your prompts**: Use the Symptoms → Expected → Context → Tried framework for diagnosis
4. **Iterate with AI**: Start with a question, refine based on the response, add more context
5. **AI accelerates, doesn't replace**: AI tools make you faster, but Kubernetes knowledge is still essential

---

> **Stuck?** Check the [solutions](solutions/) folder for step-by-step walkthroughs, fixed manifests, and example Copilot prompts.
