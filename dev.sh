#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    return 0
}

load_env() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        set -a
        while IFS='=' read -r key value; do
            [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
            key=$(echo "$key" | xargs)
            if [[ "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
                export "$key=$value"
            fi
        done < "$PROJECT_ROOT/.env"
        set +a
    else
        print_warning ".env file not found - using current shell environment"
    fi
}

kill_port() {
    local port=$1
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        print_status "Killing processes on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

start_redis() {
    print_status "Starting Redis..."

    if docker ps -a --format '{{.Names}}' | grep -q '^xtyl-redis$'; then
        if ! docker ps --format '{{.Names}}' | grep -q '^xtyl-redis$'; then
            docker start xtyl-redis >/dev/null
        fi
    else
        docker run -d --name xtyl-redis -p 6379:6379 redis:7-alpine >/dev/null
    fi

    until docker exec xtyl-redis redis-cli ping >/dev/null 2>&1; do
        sleep 1
    done

    print_success "Redis is ready"
}

stop_redis() {
    print_status "Stopping Redis..."
    docker stop xtyl-redis >/dev/null 2>&1 || true
    print_success "Redis stopped"
}

setup_monorepo() {
    print_status "Installing Bun workspace dependencies..."
    bun install
    print_success "Bun workspace ready"
}

setup_agno() {
    print_status "Syncing Agno environment..."
    uv sync --project "$PROJECT_ROOT/apps/agno"
    print_success "Agno environment ready"
}

setup_legacy_backend() {
    print_status "Setting up legacy Python backend..."
    cd "$PROJECT_ROOT/backend"

    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi

    source venv/bin/activate
    pip install -r requirements.txt -q
    print_success "Legacy backend ready"
}

run_api() {
    load_env
    cd "$PROJECT_ROOT/apps/api"
    print_status "Starting apps/api on http://localhost:3000"
    bun run dev
}

run_worker() {
    load_env
    cd "$PROJECT_ROOT/apps/api"
    print_status "Starting BullMQ worker on apps/api runtime"
    bun run dev:worker
}

run_frontend() {
    load_env
    cd "$PROJECT_ROOT/apps/web"
    print_status "Starting apps/web on http://localhost:5173"
    bun run dev
}

run_agno() {
    load_env
    cd "$PROJECT_ROOT/apps/agno"
    print_status "Starting Agno sidecar on http://localhost:7777"
    uv run uvicorn main:app --reload --host 0.0.0.0 --port 7777
}

run_legacy_backend() {
    load_env
    cd "$PROJECT_ROOT/backend"

    if [ -d "venv" ]; then
        source venv/bin/activate
    fi

    print_status "Starting legacy backend on http://localhost:8000"
    uvicorn main:app --reload --port 8000
}

case "${1:-}" in
    setup)
        print_status "Checking requirements..."
        check_command docker
        check_command bun
        check_command uv
        check_command python3
        print_success "All requirements met"

        start_redis
        setup_monorepo
        setup_agno
        print_success "Setup complete"
        ;;
    redis)
        start_redis
        ;;
    redis-stop)
        stop_redis
        ;;
    api)
        start_redis
        run_api
        ;;
    web|frontend)
        run_frontend
        ;;
    agno)
        setup_agno
        run_agno
        ;;
    worker)
        run_worker
        ;;
    backend-legacy)
        setup_legacy_backend
        run_legacy_backend
        ;;
    start)
        print_status "Starting local stack..."
        kill_port 3000
        kill_port 5173
        kill_port 7777
        start_redis
        setup_agno
        load_env

        cd "$PROJECT_ROOT/apps/api"
        bun run dev &
        API_PID=$!

        sleep 2

        cd "$PROJECT_ROOT/apps/api"
        bun run dev:worker &
        WORKER_PID=$!

        sleep 2

        cd "$PROJECT_ROOT/apps/agno"
        uv run uvicorn main:app --reload --host 0.0.0.0 --port 7777 &
        AGNO_PID=$!

        sleep 2

        cd "$PROJECT_ROOT/apps/web"
        bun run dev &
        WEB_PID=$!

        print_success "All services started"
        echo ""
        echo "  Web:   http://localhost:5173"
        echo "  API:   http://localhost:3000"
        echo "  Worker: apps/api BullMQ runtime"
        echo "  Agno:  http://localhost:7777"
        echo "  Redis: redis://localhost:6379"
        echo ""
        print_warning "Press Ctrl+C to stop all services"

        cleanup() {
            echo ""
            print_status "Shutting down..."
            kill $API_PID $WORKER_PID $AGNO_PID $WEB_PID 2>/dev/null || true
            stop_redis
            print_success "All services stopped"
            exit 0
        }
        trap cleanup SIGINT SIGTERM

        wait
        ;;
    start-legacy)
        print_status "Starting legacy stack..."
        kill_port 8000
        kill_port 5173
        start_redis
        setup_legacy_backend
        load_env

        cd "$PROJECT_ROOT/backend"
        source venv/bin/activate
        uvicorn main:app --reload --port 8000 &
        BACKEND_PID=$!

        sleep 2

        cd "$PROJECT_ROOT/apps/web"
        bun run dev &
        WEB_PID=$!

        print_success "Legacy stack started"
        echo ""
        echo "  Web:      http://localhost:5173"
        echo "  Backend:  http://localhost:8000"
        echo ""
        print_warning "Press Ctrl+C to stop all services"

        cleanup() {
            echo ""
            print_status "Shutting down..."
            kill $BACKEND_PID $WEB_PID 2>/dev/null || true
            stop_redis
            print_success "All services stopped"
            exit 0
        }
        trap cleanup SIGINT SIGTERM

        wait
        ;;
    stop)
        print_status "Stopping local processes..."
        kill_port 3000
        kill_port 5173
        kill_port 7777
        kill_port 8000
        stop_redis
        print_success "All services stopped"
        ;;
    *)
        echo "Usage: ./dev.sh {setup|redis|redis-stop|api|web|agno|worker|backend-legacy|start|start-legacy|stop}"
        exit 1
        ;;
esac
