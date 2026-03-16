#!/bin/bash
set -e

CLUSTER_NAME="oranje-markt"

echo "============================================"
echo "  Oranje Markt - K8s Teardown"
echo "============================================"

# Delete the cluster
echo ""
echo ">>> Deleting k3d cluster '$CLUSTER_NAME'..."
k3d cluster delete "$CLUSTER_NAME"

echo ""
echo ">>> Cluster deleted. Cleaned up."
