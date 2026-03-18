#!/bin/sh
set -e

# --- Configuration via environment variables ---
SCENARIOS="${SCENARIOS:-browse,search,register,checkout,unauth}"
USERS="${USERS:-3}"
DURATION="${DURATION:-30}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
SLEEP_BETWEEN_RUNS="${SLEEP_BETWEEN_RUNS:-30}"

# Resolve Docker/internal hostnames to IP addresses.
# Chromium's HSTS preload list forces HTTPS for certain hostnames (e.g. "app"
# conflicts with the .app TLD). Using the resolved IP bypasses this.
resolve_base_url() {
  PROTO=$(echo "$BASE_URL" | sed -n 's|\(https\{0,1\}://\).*|\1|p')
  HOST_PORT=$(echo "$BASE_URL" | sed 's|https\{0,1\}://||')
  HOST=$(echo "$HOST_PORT" | sed 's|:.*||')
  PORT=$(echo "$HOST_PORT" | grep ':' | sed 's|.*:||')

  # Skip if already an IP or localhost
  if echo "$HOST" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' || [ "$HOST" = "localhost" ]; then
    return
  fi

  RESOLVED_IP=$(getent hosts "$HOST" 2>/dev/null | awk '{print $1}' | head -1)
  if [ -n "$RESOLVED_IP" ]; then
    if [ -n "$PORT" ]; then
      BASE_URL="${PROTO}${RESOLVED_IP}:${PORT}"
    else
      BASE_URL="${PROTO}${RESOLVED_IP}"
    fi
    echo "  DNS: $HOST → $RESOLVED_IP (BASE_URL rewritten to $BASE_URL)"
  fi
}

resolve_base_url
export BASE_URL

echo "============================================"
echo "  Oranje Markt — Traffic Generator"
echo "============================================"
echo "  Scenarios:          $SCENARIOS"
echo "  Users per scenario: $USERS"
echo "  Duration (sec):     $DURATION"
echo "  Base URL:           $BASE_URL"
echo "  Sleep between runs: ${SLEEP_BETWEEN_RUNS}s"
echo "============================================"
echo ""

# Graceful shutdown
RUNNING=true
cleanup() {
  echo ">>> Received shutdown signal, finishing current scenario..."
  RUNNING=false
}
trap cleanup TERM INT

ROUND=0

while [ "$RUNNING" = "true" ]; do
  ROUND=$((ROUND + 1))
  echo ""
  echo ">>> Round $ROUND starting at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""

  # Split SCENARIOS by comma and iterate (POSIX-compatible)
  OLD_IFS="$IFS"
  IFS=','
  for SCENARIO in $SCENARIOS; do
    IFS="$OLD_IFS"

    if [ "$RUNNING" != "true" ]; then
      break
    fi

    # Trim whitespace
    SCENARIO=$(echo "$SCENARIO" | tr -d ' ')
    echo "--- Running scenario: $SCENARIO (users=$USERS, duration=${DURATION}s) ---"
    npx tsx /app/load/load-test.ts --scenario="$SCENARIO" --users="$USERS" --duration="$DURATION" || true
    echo ""
  done
  IFS="$OLD_IFS"

  if [ "$RUNNING" = "true" ]; then
    echo ">>> Round $ROUND complete. Sleeping ${SLEEP_BETWEEN_RUNS}s..."
    sleep "$SLEEP_BETWEEN_RUNS" &
    wait $! 2>/dev/null || true
  fi
done

echo ">>> Traffic generator stopped gracefully."
