#!/bin/bash
# detect-anomalies.sh — Simple anomaly detection for the Oranje Markt namespace
# Usage: ./detect-anomalies.sh [namespace]

NAMESPACE="${1:-oranje-markt}"
RESTART_THRESHOLD=3
ISSUES_FOUND=0

echo "============================================"
echo " Oranje Markt — Anomaly Detection Report"
echo " Namespace: ${NAMESPACE}"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "============================================"
echo ""

# --- Check 1: Pods not in Running state ---
echo "--- Check 1: Pod Status ---"
NON_RUNNING=$(kubectl get pods -n "${NAMESPACE}" --no-headers 2>/dev/null | awk '$3 != "Running" && $3 != "Completed" {print $1, $3}')
if [ -n "${NON_RUNNING}" ]; then
    echo "[CRITICAL] Pods NOT in Running state:"
    echo "${NON_RUNNING}" | while read -r pod status; do
        echo "  ⚠  ${pod} — ${status}"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "[OK] All pods are Running"
fi
echo ""

# --- Check 2: High restart counts ---
echo "--- Check 2: Restart Counts ---"
HIGH_RESTARTS=$(kubectl get pods -n "${NAMESPACE}" --no-headers 2>/dev/null | awk -v threshold="${RESTART_THRESHOLD}" '$4+0 > threshold {print $1, $4}')
if [ -n "${HIGH_RESTARTS}" ]; then
    echo "[WARNING] Pods with high restart counts (>${RESTART_THRESHOLD}):"
    echo "${HIGH_RESTARTS}" | while read -r pod restarts; do
        echo "  ⚠  ${pod} — ${restarts} restarts"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "[OK] No pods with excessive restarts"
fi
echo ""

# --- Check 3: Pods not ready ---
echo "--- Check 3: Readiness ---"
NOT_READY=$(kubectl get pods -n "${NAMESPACE}" --no-headers 2>/dev/null | awk '{split($2, a, "/"); if (a[1] != a[2] && $3 == "Running") print $1, $2}')
if [ -n "${NOT_READY}" ]; then
    echo "[WARNING] Pods Running but NOT Ready:"
    echo "${NOT_READY}" | while read -r pod ready; do
        echo "  ⚠  ${pod} — Ready: ${ready}"
    done
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "[OK] All running pods are ready"
fi
echo ""

# --- Check 4: Empty Service endpoints ---
echo "--- Check 4: Service Endpoints ---"
SERVICES=$(kubectl get svc -n "${NAMESPACE}" --no-headers 2>/dev/null | awk '{print $1}')
if [ -n "${SERVICES}" ]; then
    for svc in ${SERVICES}; do
        ENDPOINTS=$(kubectl get endpoints -n "${NAMESPACE}" "${svc}" -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null)
        if [ -z "${ENDPOINTS}" ]; then
            echo "[CRITICAL] Service '${svc}' has NO endpoints — no backends serving traffic"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        else
            ENDPOINT_COUNT=$(echo "${ENDPOINTS}" | wc -w)
            echo "[OK] Service '${svc}' — ${ENDPOINT_COUNT} endpoint(s)"
        fi
    done
else
    echo "[INFO] No services found in namespace"
fi
echo ""

# --- Check 5: Recent warning events ---
echo "--- Check 5: Recent Warning Events (last 5 min) ---"
WARNINGS=$(kubectl get events -n "${NAMESPACE}" --field-selector type=Warning --sort-by='.lastTimestamp' 2>/dev/null | tail -5)
if [ -n "${WARNINGS}" ] && [ "$(echo "${WARNINGS}" | wc -l)" -gt 1 ]; then
    echo "[WARNING] Recent warning events:"
    echo "${WARNINGS}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo "[OK] No recent warning events"
fi
echo ""

# --- Summary ---
echo "============================================"
if [ ${ISSUES_FOUND} -eq 0 ]; then
    echo " RESULT: All checks passed ✓"
else
    echo " RESULT: ${ISSUES_FOUND} issue(s) detected ✗"
fi
echo "============================================"

exit ${ISSUES_FOUND}
