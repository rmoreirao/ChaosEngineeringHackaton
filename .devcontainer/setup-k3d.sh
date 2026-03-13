#!/bin/sh
set -eu

if command -v k3d >/dev/null 2>&1; then
  echo "=== k3d already installed ==="
else
  echo "=== Installing k3d ==="
  curl -fsSL https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
fi

echo "=== k3d version ==="
k3d version

echo "=== Codespaces K8s environment ready ==="
echo "Run 'bash infra/k8s/deploy.sh' to create the cluster and deploy the app."