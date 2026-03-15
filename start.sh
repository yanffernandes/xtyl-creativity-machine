#!/bin/bash

# ============================================================================
#  XTYL Creativity Machine - Local Development Launcher
# ============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

MODE="${1:-modern}"

# ---------------------------------------------------------------------------
# Colors & Formatting
# ---------------------------------------------------------------------------
RESET='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'

# Service log prefixes (fixed width for alignment)
PREFIX_REDIS="${DIM}${WHITE}[redis]   ${RESET}"
PREFIX_API="${CYAN}[api]     ${RESET}"
PREFIX_WORKER="${BLUE}[worker]  ${RESET}"
PREFIX_AGNO="${YELLOW}[agno]    ${RESET}"
PREFIX_FRONT="${MAGENTA}[frontend]${RESET}"
PREFIX_ADMIN="${GREEN}[admin]   ${RESET}"
PREFIX_LEGACY="${RED}[legacy]  ${RESET}"
PREFIX_SYS="${WHITE}[system]  ${RESET}"

API_PORT=3000
FRONTEND_PORT=4000
ADMIN_PORT=5174
AGNO_PORT=7777
LEGACY_PORT=8000

API_PID=""
WORKER_PID=""
AGNO_PID=""
FRONTEND_PID=""
ADMIN_PID=""
LEGACY_PID=""
REDIS_RUNNING=false

# ---------------------------------------------------------------------------
# Output helpers
# ---------------------------------------------------------------------------
banner() {
    echo ""
    echo -e "${BOLD}${BLUE}  ╔══════════════════════════════════════════════════════╗${RESET}"
    echo -e "${BOLD}${BLUE}  ║${RESET}${BOLD}${WHITE}         XTYL Creativity Machine                    ${RESET}${BOLD}${BLUE}║${RESET}"
    echo -e "${BOLD}${BLUE}  ║${RESET}${DIM}         Local Development Server                    ${RESET}${BOLD}${BLUE}║${RESET}"
    echo -e "${BOLD}${BLUE}  ╚══════════════════════════════════════════════════════╝${RESET}"
    echo ""
}

info()    { echo -e "${PREFIX_SYS}${WHITE}$1${RESET}"; }
success() { echo -e "${PREFIX_SYS}${GREEN}$1${RESET}"; }
warn()    { echo -e "${PREFIX_SYS}${YELLOW}$1${RESET}"; }
fail()    { echo -e "${PREFIX_SYS}${RED}$1${RESET}"; }

separator() {
    echo -e "${DIM}  ──────────────────────────────────────────────────────${RESET}"
}

usage() {
    echo "Usage: ./start.sh [modern|legacy]"
    echo "  modern: apps/api + api-worker + apps/agno + apps/web"
    echo "  legacy: backend Python legado + apps/web"
}

# ---------------------------------------------------------------------------
# Prerequisite checks (Docker is optional)
# ---------------------------------------------------------------------------
check_prereqs() {
    info "Checking prerequisites..."

    local required_missing=0
    local required_cmds=("bun" "uv")

    if [ "$MODE" = "legacy" ]; then
        required_cmds+=("python3")
    fi

    for cmd in "${required_cmds[@]}"; do
        if command -v "$cmd" &>/dev/null; then
            local ver=""
            case "$cmd" in
                bun) ver=$(bun --version 2>/dev/null) ;;
                uv) ver=$(uv --version 2>/dev/null | awk '{print $2}') ;;
                python3) ver=$(python3 --version 2>/dev/null | cut -d' ' -f2) ;;
            esac
            echo -e "${PREFIX_SYS}  ${GREEN}+${RESET} $cmd ${DIM}($ver)${RESET}"
        else
            echo -e "${PREFIX_SYS}  ${RED}x${RESET} $cmd ${RED}not found${RESET}"
            required_missing=1
        fi
    done

    if command -v docker &>/dev/null; then
        local ver
        ver=$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')
        echo -e "${PREFIX_SYS}  ${GREEN}+${RESET} docker ${DIM}($ver) - optional${RESET}"
    else
        echo -e "${PREFIX_SYS}  ${DIM}-${RESET} docker ${DIM}not found (optional, used for Redis cache)${RESET}"
    fi

    if [ "$required_missing" -eq 1 ]; then
        echo ""
        fail "Install missing dependencies and try again."
        usage
        exit 1
    fi

    echo ""
}

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
load_env() {
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        fail ".env file not found. Copy .env.example and configure it first."
        echo -e "  ${DIM}cp .env.example .env${RESET}"
        exit 1
    fi

    set -a
    while IFS='=' read -r key value; do
        [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
        key=$(echo "$key" | xargs)
        [[ "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] && export "$key=$value"
    done < "$PROJECT_ROOT/.env"
    set +a
}

# ---------------------------------------------------------------------------
# Free ports
# ---------------------------------------------------------------------------
free_port() {
    local port=$1
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        warn "Port $port in use. Freeing it..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# ---------------------------------------------------------------------------
# Redis (optional - tries Docker, then local redis-cli, then skips)
# ---------------------------------------------------------------------------
try_start_redis() {
    # Check if Redis is already accessible (local or Docker) before doing anything
    if command -v redis-cli &>/dev/null && redis-cli ping &>/dev/null 2>&1; then
        echo -e "${PREFIX_REDIS}${GREEN}Ready${RESET} ${DIM}(already running on localhost:6379)${RESET}"
        REDIS_RUNNING=true
        return
    fi

    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        info "Starting Redis via Docker..."

        if docker ps --format '{{.Names}}' | grep -q '^xtyl-redis$'; then
            echo -e "${PREFIX_REDIS}${DIM}Already running${RESET}"
        elif docker ps -a --format '{{.Names}}' | grep -q '^xtyl-redis$'; then
            docker start xtyl-redis >/dev/null 2>&1 || true
            echo -e "${PREFIX_REDIS}${GREEN}Container resumed${RESET}"
        else
            docker run -d --name xtyl-redis -p 6379:6379 redis:7-alpine >/dev/null 2>&1 || true
            echo -e "${PREFIX_REDIS}${GREEN}Container created${RESET}"
        fi

        local retries=0
        while ! docker exec xtyl-redis redis-cli ping &>/dev/null; do
            retries=$((retries + 1))
            if [ "$retries" -gt 15 ]; then
                warn "Redis failed to start via Docker. Continuing without it."
                return
            fi
            sleep 1
        done

        echo -e "${PREFIX_REDIS}${GREEN}Ready${RESET} ${DIM}on localhost:6379${RESET}"
        REDIS_RUNNING=true
        return
    fi

    if command -v redis-cli &>/dev/null && redis-cli ping &>/dev/null 2>&1; then
        echo -e "${PREFIX_REDIS}${GREEN}Ready${RESET} ${DIM}(local redis-server detected)${RESET}"
        REDIS_RUNNING=true
        return
    fi

    if command -v redis-server &>/dev/null; then
        info "Starting local redis-server..."
        redis-server --daemonize yes --loglevel warning >/dev/null 2>&1 || true
        sleep 1
        if redis-cli ping &>/dev/null 2>&1; then
            echo -e "${PREFIX_REDIS}${GREEN}Ready${RESET} ${DIM}(local redis-server)${RESET}"
            REDIS_RUNNING=true
            return
        fi
    fi

    warn "Redis not available (no Docker, no local redis-server)"
    echo -e "${PREFIX_REDIS}${DIM}Skipped. Queue/SSE progress features may be degraded.${RESET}"
    REDIS_RUNNING=false
}

# ---------------------------------------------------------------------------
# Setup helpers
# ---------------------------------------------------------------------------
ensure_workspace_deps() {
    cd "$PROJECT_ROOT"

    if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
        info "Installing Bun workspace dependencies..."
        bun install 2>&1 | while IFS= read -r line; do
            echo -e "${PREFIX_SYS}${DIM}$line${RESET}"
        done
        success "Workspace dependencies installed"
    fi
}

ensure_agno_env() {
    cd "$PROJECT_ROOT"

    if [ ! -d "$PROJECT_ROOT/apps/agno" ]; then
        warn "apps/agno not found, skipping Agno setup."
        return
    fi

    if [ ! -d "$PROJECT_ROOT/apps/agno/.venv" ]; then
        info "Syncing Agno environment..."
        uv sync --project "$PROJECT_ROOT/apps/agno" 2>&1 | while IFS= read -r line; do
            echo -e "${PREFIX_AGNO}${DIM}$line${RESET}"
        done
        success "Agno environment ready"
    fi
}

ensure_legacy_backend() {
    cd "$PROJECT_ROOT/backend"

    if [ ! -d "venv" ]; then
        info "Creating legacy Python virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        info "Installing legacy backend dependencies..."
        pip install -r requirements.txt -q 2>&1 | while IFS= read -r line; do
            echo -e "${PREFIX_LEGACY}${DIM}$line${RESET}"
        done
        success "Legacy backend dependencies installed"
    fi
}

# ---------------------------------------------------------------------------
# Run services with prefixed output
# ---------------------------------------------------------------------------
run_api() {
    cd "$PROJECT_ROOT/apps/api"

    bun run dev 2>&1 | while IFS= read -r line; do
        case "$line" in
            *"ERROR"*|*"error"*|*"Error"*)
                echo -e "${PREFIX_API}${RED}$line${RESET}" ;;
            *"WARN"*|*"warning"*|*"Warning"*)
                echo -e "${PREFIX_API}${YELLOW}$line${RESET}" ;;
            *)
                echo -e "${PREFIX_API}$line" ;;
        esac
    done &
    API_PID=$!
}

run_worker() {
    cd "$PROJECT_ROOT/apps/api"

    bun run dev:worker 2>&1 | while IFS= read -r line; do
        case "$line" in
            *"ERROR"*|*"error"*|*"Error"*)
                echo -e "${PREFIX_WORKER}${RED}$line${RESET}" ;;
            *"WARN"*|*"warning"*|*"Warning"*)
                echo -e "${PREFIX_WORKER}${YELLOW}$line${RESET}" ;;
            *)
                echo -e "${PREFIX_WORKER}$line" ;;
        esac
    done &
    WORKER_PID=$!
}

run_agno() {
    if [ ! -d "$PROJECT_ROOT/apps/agno" ]; then
        echo -e "${PREFIX_AGNO}${DIM}Skipped (apps/agno not found)${RESET}"
        return
    fi

    cd "$PROJECT_ROOT/apps/agno"

    uv run uvicorn main:app --reload --host 0.0.0.0 --port "$AGNO_PORT" 2>&1 | while IFS= read -r line; do
        case "$line" in
            *"ERROR"*|*"error"*|*"Error"*)
                echo -e "${PREFIX_AGNO}${RED}$line${RESET}" ;;
            *"WARN"*|*"warning"*|*"Warning"*)
                echo -e "${PREFIX_AGNO}${YELLOW}$line${RESET}" ;;
            *)
                echo -e "${PREFIX_AGNO}$line" ;;
        esac
    done &
    AGNO_PID=$!
}

run_frontend() {
    cd "$PROJECT_ROOT/apps/web"

    bun run dev -- --port "$FRONTEND_PORT" 2>&1 | while IFS= read -r line; do
        case "$line" in
            *"ERROR"*|*"error"*|*"Error"*)
                echo -e "${PREFIX_FRONT}${RED}$line${RESET}" ;;
            *"WARN"*|*"warning"*|*"Warning"*)
                echo -e "${PREFIX_FRONT}${YELLOW}$line${RESET}" ;;
            *)
                echo -e "${PREFIX_FRONT}$line" ;;
        esac
    done &
    FRONTEND_PID=$!
}

run_admin() {
    cd "$PROJECT_ROOT/apps/admin"

    bun run dev 2>&1 | while IFS= read -r line; do
        case "$line" in
            *"ERROR"*|*"error"*|*"Error"*)
                echo -e "${PREFIX_ADMIN}${RED}$line${RESET}" ;;
            *"WARN"*|*"warning"*|*"Warning"*)
                echo -e "${PREFIX_ADMIN}${YELLOW}$line${RESET}" ;;
            *)
                echo -e "${PREFIX_ADMIN}$line" ;;
        esac
    done &
    ADMIN_PID=$!
}

run_legacy_backend() {
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate

    uvicorn main:app --reload --port "$LEGACY_PORT" 2>&1 | while IFS= read -r line; do
        case "$line" in
            *"ERROR"*|*"error"*|*"Error"*)
                echo -e "${PREFIX_LEGACY}${RED}$line${RESET}" ;;
            *"WARN"*|*"warning"*|*"Warning"*)
                echo -e "${PREFIX_LEGACY}${YELLOW}$line${RESET}" ;;
            *)
                echo -e "${PREFIX_LEGACY}$line" ;;
        esac
    done &
    LEGACY_PID=$!
}

# ---------------------------------------------------------------------------
# Cleanup on exit
# ---------------------------------------------------------------------------
cleanup() {
    echo ""
    separator
    info "Shutting down..."

    for pid_var in API_PID WORKER_PID AGNO_PID FRONTEND_PID ADMIN_PID LEGACY_PID; do
        pid="${!pid_var:-}"
        if [ -n "$pid" ]; then
            kill "$pid" 2>/dev/null || true
        fi
    done

    free_port "$API_PORT"
    free_port "$FRONTEND_PORT"
    free_port "$ADMIN_PORT"
    free_port "$AGNO_PORT"
    free_port "$LEGACY_PORT"

    [ -n "$API_PID" ] && echo -e "${PREFIX_API}${DIM}Stopped${RESET}"
    [ -n "$WORKER_PID" ] && echo -e "${PREFIX_WORKER}${DIM}Stopped${RESET}"
    [ -n "$AGNO_PID" ] && echo -e "${PREFIX_AGNO}${DIM}Stopped${RESET}"
    [ -n "$FRONTEND_PID" ] && echo -e "${PREFIX_FRONT}${DIM}Stopped${RESET}"
    [ -n "$ADMIN_PID" ] && echo -e "${PREFIX_ADMIN}${DIM}Stopped${RESET}"
    [ -n "$LEGACY_PID" ] && echo -e "${PREFIX_LEGACY}${DIM}Stopped${RESET}"

    if [ "$REDIS_RUNNING" = true ]; then
        echo -e "${PREFIX_REDIS}${DIM}Still running (reused on next start)${RESET}"
    fi

    echo ""
    success "See you next time!"
    echo ""
    exit 0
}

trap cleanup SIGINT SIGTERM

# ---------------------------------------------------------------------------
# Main modes
# ---------------------------------------------------------------------------
start_modern_stack() {
    separator
    try_start_redis
    separator

    info "Preparing modern stack..."
    echo ""

    free_port "$API_PORT"
    free_port "$FRONTEND_PORT"
    free_port "$ADMIN_PORT"
    free_port "$AGNO_PORT"

    ensure_workspace_deps
    ensure_agno_env

    separator
    echo ""
    info "Launching modern stack..."
    echo ""

    run_api
    sleep 2

    run_worker
    sleep 2

    run_agno
    sleep 2

    run_frontend
    sleep 2

    run_admin
    sleep 3

    echo ""
    separator
    echo ""
    echo -e "${BOLD}${WHITE}  Services running (modern stack):${RESET}"
    echo ""
    echo -e "    ${CYAN}API     ${RESET} ${DIM}........${RESET} ${WHITE}http://localhost:${API_PORT}${RESET}  ${DIM}(NestJS + Bun)${RESET}"
    echo -e "    ${BLUE}Worker  ${RESET} ${DIM}........${RESET} ${WHITE}apps/api BullMQ runtime${RESET}"
    echo -e "    ${YELLOW}Agno    ${RESET} ${DIM}........${RESET} ${WHITE}http://localhost:${AGNO_PORT}${RESET}  ${DIM}(chat runtime sidecar)${RESET}"
    echo -e "    ${MAGENTA}Frontend${RESET} ${DIM}........${RESET} ${WHITE}http://localhost:${FRONTEND_PORT}${RESET}  ${DIM}(React + Vite dev)${RESET}"
    echo -e "    ${GREEN}Admin   ${RESET} ${DIM}........${RESET} ${WHITE}http://localhost:${ADMIN_PORT}${RESET}  ${DIM}(React + Vite dev)${RESET}"

    if [ "$REDIS_RUNNING" = true ]; then
        echo -e "    ${DIM}Redis    ........ localhost:6379   (cache + BullMQ)${RESET}"
    else
        echo -e "    ${DIM}Redis    ........ ${YELLOW}skipped${RESET}${DIM}          (queue features degraded)${RESET}"
    fi

    echo ""
    echo -e "    ${DIM}Database ........ Supabase (cloud)${RESET}"
    echo -e "    ${DIM}Storage  ........ Cloudflare R2 (cloud)${RESET}"
    echo ""
    separator
    echo ""
    echo -e "  ${YELLOW}This mode uses the new backend by default.${RESET}"
    echo -e "  ${YELLOW}Use the chat toggle to switch between native and Agno runtimes.${RESET}"
    echo -e "  ${YELLOW}Ctrl+C${RESET} to stop all services"
    echo ""

    wait
}

start_legacy_stack() {
    separator
    try_start_redis
    separator

    info "Preparing legacy stack..."
    echo ""

    free_port "$LEGACY_PORT"
    free_port "$FRONTEND_PORT"

    ensure_workspace_deps
    ensure_legacy_backend

    separator
    echo ""
    info "Launching legacy stack..."
    echo ""

    run_legacy_backend
    sleep 2

    run_frontend
    sleep 3

    echo ""
    separator
    echo ""
    echo -e "${BOLD}${WHITE}  Services running (legacy stack):${RESET}"
    echo ""
    echo -e "    ${RED}Legacy  ${RESET} ${DIM}........${RESET} ${WHITE}http://localhost:${LEGACY_PORT}${RESET}  ${DIM}(FastAPI + uvicorn)${RESET}"
    echo -e "    ${MAGENTA}Frontend${RESET} ${DIM}........${RESET} ${WHITE}http://localhost:${FRONTEND_PORT}${RESET}  ${DIM}(React + Vite dev)${RESET}"

    if [ "$REDIS_RUNNING" = true ]; then
        echo -e "    ${DIM}Redis    ........ localhost:6379   (legacy cache)${RESET}"
    else
        echo -e "    ${DIM}Redis    ........ ${YELLOW}skipped${RESET}${DIM}          (optional)${RESET}"
    fi

    echo ""
    separator
    echo ""
    echo -e "  ${YELLOW}This mode does not use Agno or the Nest backend.${RESET}"
    echo -e "  ${YELLOW}Ctrl+C${RESET} to stop all services"
    echo ""

    wait
}

# ============================================================================
# Entrypoint
# ============================================================================

banner

case "$MODE" in
    modern)
        check_prereqs
        load_env
        start_modern_stack
        ;;
    legacy)
        check_prereqs
        load_env
        start_legacy_stack
        ;;
    *)
        fail "Unknown mode: $MODE"
        usage
        exit 1
        ;;
esac
