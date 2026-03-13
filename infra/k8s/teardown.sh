#!/bin/bash
set -e

CLUSTER_NAME="oranje-markt"

echo "============================================"
echo "  Oranje Markt - K8s Teardown"
echo "============================================"

# Stop port-forwarding
echo ""
echo ">>> Stopping port-forwards..."
pkill -f "kubectl port-forward.*oranje-markt" 2>/dev/null || true

# Delete the cluster
echo ""
echo ">>> Deleting k3d cluster '$CLUSTER_NAME'..."
k3d cluster delete "$CLUSTER_NAME"

echo ""
echo ">>> Cluster deleted. Cleaned up."
