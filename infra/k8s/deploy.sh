#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
K8S_DIR="$SCRIPT_DIR"
CLUSTER_NAME="oranje-markt"
TRAEFIK_FORWARD_PORTS=(3000 4000 3001 9090 3100)

wait_for_service_port() {
  local service_name="$1"
  local namespace="$2"
  local port="$3"
  local timeout_seconds="${4:-180}"
  local elapsed=0

  until kubectl get svc "$service_name" -n "$namespace" 2>/dev/null \
    -o jsonpath='{range .spec.ports[*]}{.port}{" "}{end}' | grep -Eq "(^| )${port}( |$)"; do
    if [ "$elapsed" -ge "$timeout_seconds" ]; then
      echo "Timed out waiting for service/$service_name in namespace $namespace to expose port $port" >&2
      exit 1
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done
}

echo "============================================"
echo "  Oranje Markt - K8s Deployment (k3d)"
echo "============================================"

# --- 1. Create k3d cluster ---
if k3d cluster list | grep -q "$CLUSTER_NAME"; then
  echo ""
  echo ">>> Cluster '$CLUSTER_NAME' already exists, reusing it."
else
  echo ""
  echo ">>> Creating k3d cluster '$CLUSTER_NAME'..."
  k3d cluster create "$CLUSTER_NAME" \
    --port "3000:3000@loadbalancer" \
    --port "4000:4000@loadbalancer" \
    --port "3001:3001@loadbalancer" \
    --port "9090:9090@loadbalancer" \
    --port "3100:3100@loadbalancer" \
    --wait
fi

echo ""
echo ">>> Setting kubectl context..."
kubectl config use-context "k3d-$CLUSTER_NAME"

echo ""
echo ">>> Configuring Traefik entrypoints for forwarded DevContainer ports..."
kubectl apply -f "$K8S_DIR/ingress/traefik-config.yaml"

echo ""
echo ">>> Waiting for Traefik to expose forwarded ports..."
for port in "${TRAEFIK_FORWARD_PORTS[@]}"; do
  wait_for_service_port traefik kube-system "$port"
done
kubectl rollout status deployment/traefik -n kube-system --timeout=180s

# --- 2. Build Docker images ---
echo ""
echo ">>> Building backend Docker image..."
docker build -t oranje-markt-backend:local "$REPO_ROOT/backend"

echo ""
echo ">>> Building frontend Docker image..."
docker build \
  --build-arg NEXT_PUBLIC_BACKEND_URL="http://localhost:4000" \
  -t oranje-markt-frontend:local "$REPO_ROOT/frontend"

# --- 3. Import images into k3d ---
echo ""
echo ">>> Importing images into k3d cluster..."
k3d image import oranje-markt-backend:local oranje-markt-frontend:local \
  --cluster "$CLUSTER_NAME"

# --- 4. Deploy K8s manifests ---
echo ""
echo ">>> Applying namespace..."
kubectl apply -f "$K8S_DIR/namespace.yaml"

echo ""
echo ">>> Deploying PostgreSQL..."
kubectl apply -f "$K8S_DIR/postgres/"

echo ""
echo ">>> Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres \
  -n oranje-markt --timeout=120s

echo ""
echo ">>> Deploying Backend..."
kubectl apply -f "$K8S_DIR/backend/"

echo ""
echo ">>> Deploying Frontend..."
kubectl apply -f "$K8S_DIR/frontend/"

echo ""
echo ">>> Deploying Observability stack..."
kubectl apply -f "$K8S_DIR/observability/prometheus/"
kubectl apply -f "$K8S_DIR/observability/loki/"
kubectl apply -f "$K8S_DIR/observability/postgres-exporter/"

# Create Grafana dashboard ConfigMap from JSON files
DASHBOARD_DIR="$SCRIPT_DIR/../../infra/observability/grafana/provisioning/dashboards"
kubectl delete configmap grafana-dashboard-files -n oranje-markt 2>/dev/null || true
kubectl create configmap grafana-dashboard-files \
  --from-file="$DASHBOARD_DIR/app-dashboard.json" \
  --from-file="$DASHBOARD_DIR/db-dashboard.json" \
  --from-file="$DASHBOARD_DIR/frontend-dashboard.json" \
  --from-file="$DASHBOARD_DIR/infra-dashboard.json" \
  -n oranje-markt

kubectl apply -f "$K8S_DIR/observability/grafana/"
kubectl apply -f "$K8S_DIR/observability/promtail/"

echo ""
echo ">>> Applying ingress routes..."
kubectl apply -f "$K8S_DIR/ingress/routes.yaml"

# --- 5. Wait for all pods ---
echo ""
echo ">>> Waiting for all pods to be ready..."
kubectl wait --for=condition=ready pod --all \
  -n oranje-markt --timeout=180s || true

# --- 6. Print status ---
echo ""
echo "============================================"
echo "  Deployment complete!"
echo "============================================"
echo ""
kubectl get pods -n oranje-markt
echo ""
echo "Ingress:"
kubectl get ingress -n oranje-markt
echo ""
echo "Services:"
echo "  Frontend:   http://localhost:3000"
echo "  Backend:    http://localhost:4000"
echo "  Grafana:    http://localhost:3001  (admin/admin)"
echo "  Prometheus: http://localhost:9090"
echo "  Loki:       http://localhost:3100"
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n oranje-markt"
echo "  kubectl get ingress -n oranje-markt"
echo "  kubectl logs -f deployment/backend -n oranje-markt"
echo "  kubectl logs -f deployment/frontend -n oranje-markt"
echo "  bash infra/k8s/teardown.sh   # to delete the cluster"
echo ""
