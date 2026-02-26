#!/bin/bash

# ============================================================================
#  XTYL Creativity Machine - Local Development Launcher
# ============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

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
PREFIX_BACK="${CYAN}[backend] ${RESET}"
PREFIX_FRONT="${MAGENTA}[frontend]${RESET}"
PREFIX_SYS="${BLUE}[system]  ${RESET}"

# State
BACKEND_PID=""
FRONTEND_PID=""
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

# ---------------------------------------------------------------------------
# Prerequisite checks (Docker is optional)
# ---------------------------------------------------------------------------
check_prereqs() {
    info "Checking prerequisites..."

    local required_missing=0

    for cmd in python3 node npm; do
        if command -v "$cmd" &>/dev/null; then
            local ver
            case "$cmd" in
                python3) ver=$(python3 --version 2>/dev/null | cut -d' ' -f2) ;;
                node)    ver=$(node --version 2>/dev/null) ;;
                npm)     ver=$(npm --version 2>/dev/null) ;;
            esac
            echo -e "${PREFIX_SYS}  ${GREEN}+${RESET} $cmd ${DIM}($ver)${RESET}"
        else
            echo -e "${PREFIX_SYS}  ${RED}x${RESET} $cmd ${RED}not found${RESET}"
            required_missing=1
        fi
    done

    # Docker is optional
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
        exit 1
    fi
    echo ""
}

# ---------------------------------------------------------------------------
# Load .env
# ---------------------------------------------------------------------------
load_env() {
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        fail ".env file not found! Copy .env.example and configure it:"
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
        warn "Port $port in use - freeing it..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# ---------------------------------------------------------------------------
# Redis (optional - tries Docker, then local redis-cli, then skips)
# ---------------------------------------------------------------------------
try_start_redis() {
    # 1. Try Docker
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        info "Starting Redis via Docker..."

        if docker ps --format '{{.Names}}' | grep -q '^xtyl-redis$'; then
            echo -e "${PREFIX_REDIS}${DIM}Already running${RESET}"
        elif docker ps -a --format '{{.Names}}' | grep -q '^xtyl-redis$'; then
            docker start xtyl-redis >/dev/null 2>&1
            echo -e "${PREFIX_REDIS}${GREEN}Container resumed${RESET}"
        else
            docker run -d --name xtyl-redis -p 6379:6379 redis:alpine >/dev/null 2>&1
            echo -e "${PREFIX_REDIS}${GREEN}Container created${RESET}"
        fi

        local retries=0
        while ! docker exec xtyl-redis redis-cli ping &>/dev/null; do
            retries=$((retries + 1))
            if [ "$retries" -gt 15 ]; then
                warn "Redis failed to start via Docker, continuing without it..."
                return
            fi
            sleep 1
        done

        echo -e "${PREFIX_REDIS}${GREEN}Ready${RESET} ${DIM}on localhost:6379${RESET}"
        REDIS_RUNNING=true
        return
    fi

    # 2. Try local redis-server already running
    if command -v redis-cli &>/dev/null && redis-cli ping &>/dev/null 2>&1; then
        echo -e "${PREFIX_REDIS}${GREEN}Ready${RESET} ${DIM}(local redis-server detected)${RESET}"
        REDIS_RUNNING=true
        return
    fi

    # 3. Try starting local redis-server
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

    # 4. Skip Redis entirely
    warn "Redis not available (no Docker, no local redis-server)"
    echo -e "${PREFIX_REDIS}${DIM}Skipped - batch image progress tracking will be disabled${RESET}"
    echo -e "${PREFIX_REDIS}${DIM}Install: brew install redis  OR  use Docker${RESET}"
    REDIS_RUNNING=false
}

# ---------------------------------------------------------------------------
# Backend setup
# ---------------------------------------------------------------------------
ensure_backend_venv() {
    cd "$PROJECT_ROOT/backend"

    if [ ! -d "venv" ]; then
        info "Creating Python virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        info "Installing Python dependencies (first run)..."
        pip install -r requirements.txt -q 2>&1 | while read -r line; do
            echo -e "${PREFIX_BACK}${DIM}$line${RESET}"
        done
        success "Backend dependencies installed"
    else
        source venv/bin/activate
    fi
}

# ---------------------------------------------------------------------------
# Frontend setup
# ---------------------------------------------------------------------------
ensure_frontend_deps() {
    cd "$PROJECT_ROOT/apps/web"

    if [ ! -d "node_modules" ]; then
        info "Installing npm dependencies (first run)..."
        npm install 2>&1 | while read -r line; do
            echo -e "${PREFIX_FRONT}${DIM}$line${RESET}"
        done
        success "Frontend dependencies installed"
    fi
}

# ---------------------------------------------------------------------------
# Run backend with prefixed output
# ---------------------------------------------------------------------------
run_backend() {
    cd "$PROJECT_ROOT/backend"

    if [ -d "venv" ]; then
        source venv/bin/activate
    fi

    uvicorn main:app --reload --port 8000 2>&1 | while IFS= read -r line; do
        case "$line" in
            *"ERROR"*|*"error"*|*"Error"*)
                echo -e "${PREFIX_BACK}${RED}$line${RESET}" ;;
            *"WARNING"*|*"warning"*|*"Warning"*)
                echo -e "${PREFIX_BACK}${YELLOW}$line${RESET}" ;;
            *"INFO"*|*"Uvicorn running"*|*"Started"*)
                echo -e "${PREFIX_BACK}${GREEN}$line${RESET}" ;;
            *)
                echo -e "${PREFIX_BACK}$line" ;;
        esac
    done &
    BACKEND_PID=$!
}

# ---------------------------------------------------------------------------
# Run frontend with prefixed output
# ---------------------------------------------------------------------------
run_frontend() {
    cd "$PROJECT_ROOT/apps/web"

    npm run dev 2>&1 | while IFS= read -r line; do
        case "$line" in
            *"error"*|*"Error"*|*"ERROR"*)
                echo -e "${PREFIX_FRONT}${RED}$line${RESET}" ;;
            *"warning"*|*"Warning"*|*"WARN"*)
                echo -e "${PREFIX_FRONT}${YELLOW}$line${RESET}" ;;
            *"ready"*|*"Ready"*|*"started"*|*"compiled"*)
                echo -e "${PREFIX_FRONT}${GREEN}$line${RESET}" ;;
            *"localhost"*|*"http://"*)
                echo -e "${PREFIX_FRONT}${GREEN}$line${RESET}" ;;
            *)
                echo -e "${PREFIX_FRONT}$line" ;;
        esac
    done &
    FRONTEND_PID=$!
}

# ---------------------------------------------------------------------------
# Cleanup on exit
# ---------------------------------------------------------------------------
cleanup() {
    echo ""
    separator
    info "Shutting down..."

    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi

    local back_pids front_pids
    back_pids=$(lsof -ti :8000 2>/dev/null || true)
    front_pids=$(lsof -ti :3000 2>/dev/null || true)
    [ -n "$back_pids" ] && echo "$back_pids" | xargs kill -9 2>/dev/null || true
    [ -n "$front_pids" ] && echo "$front_pids" | xargs kill -9 2>/dev/null || true

    echo -e "${PREFIX_BACK}${DIM}Stopped${RESET}"
    echo -e "${PREFIX_FRONT}${DIM}Stopped${RESET}"

    if [ "$REDIS_RUNNING" = true ]; then
        echo -e "${PREFIX_REDIS}${DIM}Still running (lightweight, reused on next start)${RESET}"
    fi

    echo ""
    success "See you next time!"
    echo ""
    exit 0
}

trap cleanup SIGINT SIGTERM

# ============================================================================
# Main
# ============================================================================

banner
check_prereqs
load_env

separator
try_start_redis
separator

info "Preparing services..."
echo ""

free_port 8000
free_port 3000

ensure_backend_venv
ensure_frontend_deps

separator
echo ""
info "Launching services..."
echo ""

run_backend

# Give backend a head start
sleep 2

run_frontend

# Wait for frontend to be reachable
sleep 3

echo ""
separator
echo ""
echo -e "${BOLD}${WHITE}  Services running:${RESET}"
echo ""
echo -e "    ${CYAN}Backend ${RESET} ${DIM}........${RESET} ${WHITE}http://localhost:8000${RESET}  ${DIM}(FastAPI + uvicorn)${RESET}"
echo -e "    ${MAGENTA}Frontend${RESET} ${DIM}........${RESET} ${WHITE}http://localhost:3000${RESET}  ${DIM}(React + Vite dev)${RESET}"

if [ "$REDIS_RUNNING" = true ]; then
    echo -e "    ${DIM}Redis    ........ localhost:6379   (cache)${RESET}"
else
    echo -e "    ${DIM}Redis    ........ ${YELLOW}skipped${RESET}${DIM}          (optional)${RESET}"
fi

echo ""
echo -e "    ${DIM}Database ........ Supabase (cloud)${RESET}"
echo -e "    ${DIM}Storage  ........ Cloudflare R2 (cloud)${RESET}"
echo ""
separator
echo ""
echo -e "  ${YELLOW}Ctrl+C${RESET} to stop all services"
echo ""

# Wait for child processes
wait
