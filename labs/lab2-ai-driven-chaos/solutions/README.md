# Lab 2 — AI-Driven Chaos Experiments: Solutions Walkthrough

> **App:** Oranje Markt on AKS — namespace `oranje-markt`
> **Backend:** Express.js on port 4000, deployment `backend`, health endpoint `/api/health`
> **Frontend:** Next.js on port 3000
> **AI Tools:** GitHub Copilot (VS Code), GitHub Copilot CLI (`gh copilot suggest`, `gh copilot explain`)

---

## Solution 1 — Generate Chaos Experiments with GitHub Copilot CLI

In this challenge you use GitHub Copilot CLI to generate chaos-engineering commands. Review every suggestion before running it.

### Prompt 1: Delete a random pod

```powershell
gh copilot suggest -t shell "Delete a random backend pod from namespace oranje-markt using kubectl"
```

**Expected generated command:**

```bash
kubectl delete pod -n oranje-markt -l app=backend
```

Run the command, then watch pods recover:

```bash
kubectl get pods -n oranje-markt -w
```

### Prompt 2: CPU stress test

```powershell
gh copilot suggest -t shell "Create a Kubernetes Job that runs a CPU stress test using busybox in namespace oranje-markt"
```

**Expected generated command (something like):**

```bash
kubectl run cpu-stress --image=busybox --restart=Never -n oranje-markt -- /bin/sh -c "while true; do :; done"
```

Or Copilot may generate a full Job manifest. Either way, run it and observe resource usage:

```bash
kubectl top pods -n oranje-markt
```

### Prompt 3: Scale to 0 and back

```powershell
gh copilot suggest -t shell "Scale the backend deployment to 0 replicas in namespace oranje-markt then wait 30 seconds then scale back to 1"
```

**Expected generated command:**

```bash
kubectl scale deployment backend -n oranje-markt --replicas=0 && sleep 30 && kubectl scale deployment backend -n oranje-markt --replicas=1
```

### Prompt 4: Explain a command

```powershell
gh copilot explain "kubectl drain node1 --ignore-daemonsets --delete-emptydir-data --grace-period=30"
```

**Expected output:** A detailed explanation of the `kubectl drain` command and each flag:

- `--ignore-daemonsets` — don't fail if DaemonSet-managed pods exist on the node
- `--delete-emptydir-data` — allow deletion of pods that use emptyDir volumes
- `--grace-period=30` — give each pod 30 seconds to shut down gracefully

### Clean up

```bash
kubectl delete pod -n oranje-markt cpu-stress --ignore-not-found
```

### Discussion: Risks of running AI-generated commands without review

**Risks:**

- Wrong namespace — could affect production workloads
- Wrong resource selectors — could delete the wrong pods or services
- Missing safety flags — no `--grace-period`, no `--ignore-daemonsets`
- Destructive commands without confirmation prompts

**Guardrails:**

- Always use `--dry-run=server` first to preview changes
- Require explicit namespace specification
- Code-review generated manifests before applying
- Use RBAC to limit the blast radius of any command

---

## Solution 2 — Diagnose Broken Deployments with AI

Three broken deployments are provided. For each one, deploy it, observe the failure, gather context, ask Copilot for a diagnosis, and apply the fix.

---

### Broken Deployment 1 — CrashLoopBackOff

#### Step 1: Deploy the broken manifest

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/01-crashloop.yaml
```

#### Step 2: Observe

```bash
kubectl get pods -n oranje-markt -l app=chaos-crashloop -w
```

**Expected output:**

```
NAME                               READY   STATUS             RESTARTS   AGE
chaos-crashloop-xxxxxxxxxx-xxxxx   0/1     CrashLoopBackOff   3          2m
```

The restart count increases over time as Kubernetes keeps trying to start the container.

#### Step 3: Gather context

```powershell
$POD = kubectl get pods -n oranje-markt -l app=chaos-crashloop `
  -o jsonpath='{.items[0].metadata.name}'

kubectl describe pod -n oranje-markt $POD
kubectl logs -n oranje-markt $POD --previous
```

**Key findings from the output:**

- **Command:** `/bin/start-backend` — this binary doesn't exist in the image
- **Last State:** Terminated, Reason: `StartError`, Exit Code: `128`
- **Logs:** no output (container never started successfully)

#### Step 4: Ask Copilot

Open GitHub Copilot Chat in VS Code and paste:

```
My pod is in CrashLoopBackOff. Here's the describe output:
- Command: ["/bin/start-backend"]
- Last State: Terminated, Reason: StartError, Exit Code: 128
- Image: devaihackathonacr.azurecr.io/oranje-markt-backend:latest

What's wrong and how do I fix it?
```

**Expected Copilot response:**

> The command `/bin/start-backend` doesn't exist in the container image.
> The image has its own default entrypoint, so you should remove the custom `command` from your deployment spec to let the image's built-in entrypoint run.

#### Step 5: Apply the fix

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/01-crashloop-fix.yaml
```

Verify the pod is running:

```bash
kubectl get pods -n oranje-markt -l app=chaos-crashloop
```

**Expected output:**

```
NAME                               READY   STATUS    RESTARTS   AGE
chaos-crashloop-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
```

---

### Broken Deployment 2 — ImagePullBackOff

#### Step 1: Deploy the broken manifest

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/02-imagepull.yaml
```

#### Step 2: Observe and diagnose

```bash
kubectl get pods -n oranje-markt -l app=chaos-imagepull -w
```

**Expected output:**

```
NAME                               READY   STATUS             RESTARTS   AGE
chaos-imagepull-xxxxxxxxxx-xxxxx   0/1     ImagePullBackOff   0          1m
```

Gather more detail:

```bash
kubectl describe pod -n oranje-markt -l app=chaos-imagepull
```

**Key finding from Events:**

```
Failed to pull image "devaihackathonacr.azurecr.io/oranje-markt-backend:v99-does-not-exist":
  manifest unknown: manifest tagged by "v99-does-not-exist" is not found
```

The image tag `v99-does-not-exist` does not exist in the container registry.

#### Step 3: Ask Copilot

Paste the describe output into Copilot Chat and ask:

```
Why is my pod in ImagePullBackOff?
```

**Expected Copilot response:**

> The image tag `v99-does-not-exist` doesn't exist in the registry. Use a valid tag such as `latest`.

#### Step 4: Apply the fix

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/02-imagepull-fix.yaml
```

Verify:

```bash
kubectl get pods -n oranje-markt -l app=chaos-imagepull
```

**Expected output:**

```
NAME                               READY   STATUS    RESTARTS   AGE
chaos-imagepull-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
```

---

### Broken Deployment 3 — Pending (Resource Constraints)

#### Step 1: Deploy the broken manifest

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/03-resource-constraint.yaml
```

#### Step 2: Observe

```bash
kubectl get pods -n oranje-markt -l app=chaos-resource
```

**Expected output:**

```
NAME                              READY   STATUS    RESTARTS   AGE
chaos-resource-xxxxxxxxxx-xxxxx   0/1     Pending   0          1m
```

The pod stays in `Pending` indefinitely. Describe the pod:

```bash
kubectl describe pod -n oranje-markt -l app=chaos-resource
```

**Key finding from Events:**

```
Warning  FailedScheduling  0/3 nodes are available:
  3 Insufficient memory. preemption: 0/3 nodes are available:
  3 No preemption victims found for incoming pod.
```

The pod requests **64Gi** of memory, but each node (`Standard_D2s_v3`) only has **~8GiB**.

#### Step 3: Ask Copilot

```
Pod is Pending with event FailedScheduling: 0/3 nodes available:
3 Insufficient memory. It requests 64Gi memory and 32 CPU.
Our nodes are Standard_D2s_v3 with 8GiB each.
How do I fix this?
```

**Expected Copilot response:**

> The resource requests far exceed what any node can provide. Reduce memory and CPU requests to values that fit on your nodes — for example, `128Mi` memory and `100m` CPU.

#### Step 4: Apply the fix

```bash
kubectl apply -f labs/lab2-ai-driven-chaos/solutions/manifests/03-resource-constraint-fix.yaml
```

Verify:

```bash
kubectl get pods -n oranje-markt -l app=chaos-resource
```

**Expected output:**

```
NAME                              READY   STATUS    RESTARTS   AGE
chaos-resource-xxxxxxxxxx-xxxxx   1/1     Running   0          30s
```

### Discussion: Minimum context for accurate AI diagnosis

For the most accurate diagnosis, provide Copilot with:

1. **Pod status** — the current state (CrashLoopBackOff, ImagePullBackOff, Pending, etc.)
2. **Events** — from `kubectl describe` (the Events section at the bottom)
3. **Container logs** — both current and previous (`--previous` flag)
4. **Pod spec** — especially image, command, resources, and environment variables
5. **Timeline** — when the problem started and what changed

More context always produces a better diagnosis. The YAML spec is crucial for misconfiguration issues because it shows the intended state.

---

## Solution 3 — Generate Load Test Scripts with AI

### Step 1: Ask Copilot for a simple load test

```powershell
gh copilot suggest -t shell `
  "Create a kubectl run command that sends 100 HTTP requests to http://backend:4000/api/products from inside namespace oranje-markt"
```

**Expected generated command:**

```bash
kubectl run load-test --image=busybox --restart=Never -n oranje-markt -- /bin/sh -c "for i in $(seq 1 100); do wget -q -O- http://backend:4000/api/products; done"
```

### Step 2: Run and monitor

Run the generated command, then observe resource usage:

```bash
kubectl top pods -n oranje-markt
```

### Step 3: Iterate — ask for sustained load

Open Copilot Chat and ask:

```
Modify this load test to run continuously for 2 minutes with 10 concurrent workers,
each sending requests in a loop to http://backend:4000/api/products
```

Copilot should generate a more advanced command or script that spawns multiple background processes inside the container.

### Step 4: Clean up

```bash
kubectl delete pod -n oranje-markt -l run=load-test --ignore-not-found
```

### Discussion: AI-generated vs. professional load testing tools

**AI-generated load tests** are great for:

- Quick, ad-hoc smoke tests
- Validating basic endpoint availability under light load
- Rapid prototyping of test scenarios

**For production load testing**, use dedicated tools:

- **k6** — scriptable, developer-friendly, good CI/CD integration
- **Locust** — Python-based, distributed load testing
- **Azure Load Testing** — managed service with built-in Azure Monitor integration

**Where AI struggles:**

- Realistic user journeys with multiple steps
- Proper data setup and teardown
- Authentication and session management flows
- Accurate concurrency control and rate limiting
- Statistical analysis and reporting

---

## Solution 4 — Context Engineering for Better AI Results

This challenge demonstrates why *how* you prompt matters as much as *what* you ask.

### Experiment 1: Vague prompt

Open Copilot Chat and type:

```
My app is broken, fix it
```

**Expected response:** Generic advice like:

> Check your pod status with `kubectl get pods`. Look at the logs with `kubectl logs`. Describe the pod with `kubectl describe pod`...

This is not actionable — it tells you what you already know.

### Experiment 2: Structured prompt

Now use the **Symptoms → Expected → Context → Tried** framework:

```
SYMPTOMS: My backend pod in namespace oranje-markt is returning 500 errors on /api/products.

EXPECTED: The endpoint should return a JSON array of products with HTTP 200.

CONTEXT:
- Pod logs show: "Error: connect ECONNREFUSED 10.0.0.15:5432"
- kubectl describe shows: Ready 1/1, Running, 0 restarts
- The postgres pod was restarted 5 minutes ago
- DATABASE_URL env var points to postgres:5432

TRIED:
- Restarted the backend pod — same error
- Verified postgres service exists (kubectl get svc postgres -n oranje-markt returns ClusterIP)

What is the root cause and how do I fix it?
```

**Expected response:** A precise, actionable diagnosis:

> The backend pod's connection pool has stale connections pointing to the old postgres pod's IP address (`10.0.0.15`). When postgres restarted, it got a new IP, but the backend's connection pool still holds the old one.
>
> **Fix:** Restart the backend pod to force it to establish new connections to the current postgres IP. Long-term, implement connection retry logic or use a connection pool library that handles reconnection automatically.

### Key insight

The structured prompt produced a **specific, actionable diagnosis** pointing to the exact root cause (stale connection pool after postgres restart). The vague prompt produced **generic troubleshooting steps** that could apply to any application. The difference is dramatic.

### Discussion: Applying context engineering to daily DevOps

Lessons from the [Azure SRE Agent blog](https://learn.microsoft.com/en-us/azure/sre/) apply to everyday work:

1. **Gather all signals before concluding** — don't stop at the first error message
2. **Structure context by type** — symptoms, logs, timeline, environment
3. **Iterate and refine** — if the first response isn't helpful, add more context
4. **Teaching your team:**
   - Create prompt templates for common scenarios (pod crashes, networking issues, deployment failures)
   - Share examples of good vs. bad prompts in your team wiki
   - Document what context is needed for each failure type
   - Practice "context-first" troubleshooting: gather data *before* asking for help

---

## Solution 5 — Cleanup

Remove all chaos engineering resources:

```bash
kubectl delete deployment -n oranje-markt chaos-crashloop chaos-imagepull chaos-resource --ignore-not-found
kubectl delete pod -n oranje-markt -l run=load-test --ignore-not-found
kubectl delete pod -n oranje-markt cpu-stress --ignore-not-found
```

Verify only the original Oranje Markt pods remain:

```bash
kubectl get pods -n oranje-markt
```

**Expected output:**

```
NAME                        READY   STATUS    RESTARTS   AGE
backend-xxxxxxxxxx-xxxxx    1/1     Running   0          ...
frontend-xxxxxxxxxx-xxxxx   1/1     Running   0          ...
```

All chaos deployments have been removed. The application should be healthy.
