#!/bin/bash
set -e

echo "=== Installing k3d ==="
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

echo "=== k3d version ==="
k3d version

echo "=== Codespaces K8s environment ready ==="
echo "Run 'bash infra/k8s/deploy.sh' to create the cluster and deploy the app."
