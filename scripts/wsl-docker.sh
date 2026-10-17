#!/usr/bin/env bash
# ========================================================
# TriageCI WSL Docker PostgreSQL Helper
# ========================================================

set -e

# Resolve project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

COMMAND="${1:-start}"

case "$COMMAND" in
  start)
    echo "========================================================"
    echo "Starting TriageCI PostgreSQL in WSL Docker..."
    echo "========================================================"
    docker compose up -d triageci-postgres
    echo "Waiting for PostgreSQL container to report healthy..."
    until [ "`docker inspect -f {{.State.Health.Status}} triageci-postgres 2>/dev/null`" == "healthy" ]; do
      sleep 1
      echo -n "."
    done
    echo ""
    echo "✅ TriageCI PostgreSQL is HEALTHY and listening on port 5434!"
    docker compose ps
    ;;
  stop)
    echo "Stopping TriageCI PostgreSQL container..."
    docker compose down
    echo "✅ PostgreSQL stopped."
    ;;
  restart)
    echo "Restarting PostgreSQL container..."
    docker compose down
    docker compose up -d triageci-postgres
    ;;
  logs)
    docker compose logs -f triageci-postgres
    ;;
  psql)
    echo "Connecting to PostgreSQL interactive shell..."
    docker exec -it triageci-postgres psql -U triageci -d triageci
    ;;
  status)
    docker compose ps
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|psql|status}"
    exit 1
    ;;
esac
