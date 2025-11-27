#!/bin/bash

# Development script for xtyl-creativity-machine
# Runs infrastructure in Docker, frontend/backend locally

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if a command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "$1 is not installed"
        return 1
    fi
    return 0
}

# Start infrastructure
start_infra() {
    print_status "Starting infrastructure (PostgreSQL, Redis, MinIO)..."
    docker compose -f docker-compose.infra.yml up -d

    # Wait for postgres to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    until docker exec xtyl-db pg_isready -U xtyl &> /dev/null; do
        sleep 1
    done
    print_success "Infrastructure is ready"
}

# Stop infrastructure
stop_infra() {
    print_status "Stopping infrastructure..."
    docker compose -f docker-compose.infra.yml down
    print_success "Infrastructure stopped"
}

# Setup backend virtual environment
setup_backend() {
    print_status "Setting up backend..."
    cd "$PROJECT_ROOT/backend"

    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi

    source venv/bin/activate
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt -q
    print_success "Backend setup complete"
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    cd "$PROJECT_ROOT/frontend"

    if [ ! -d "node_modules" ]; then
        print_status "Installing npm dependencies..."
        npm install
    fi
    print_success "Frontend setup complete"
}

# Run backend
run_backend() {
    cd "$PROJECT_ROOT/backend"
    source venv/bin/activate

    export DATABASE_URL=postgresql://xtyl:xtylpassword@localhost:5432/xtyl_db
    export REDIS_URL=redis://localhost:6379/0
    export MINIO_ENDPOINT=localhost:9000
    export MINIO_ACCESS_KEY=minioadmin
    export MINIO_SECRET_KEY=minioadmin

    # Load .env if exists (handle inline comments)
    if [ -f "$PROJECT_ROOT/.env" ]; then
        set -a
        source <(grep -v '^#' "$PROJECT_ROOT/.env" | sed 's/#.*//' | sed 's/[[:space:]]*$//')
        set +a
    fi

    print_status "Starting backend on http://localhost:8000"
    uvicorn main:app --reload --port 8000
}

# Run frontend
run_frontend() {
    cd "$PROJECT_ROOT/frontend"

    print_status "Starting frontend on http://localhost:3000"
    NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
}

# Main command handler
case "${1:-}" in
    infra)
        start_infra
        ;;
    infra-stop)
        stop_infra
        ;;
    backend)
        setup_backend
        run_backend
        ;;
    frontend)
        setup_frontend
        run_frontend
        ;;
    setup)
        print_status "Checking requirements..."
        check_command docker
        check_command python3
        check_command node
        check_command npm
        print_success "All requirements met"

        start_infra
        setup_backend
        setup_frontend
        print_success "Setup complete! Run './dev.sh start' to start development servers"
        ;;
    start)
        print_status "Starting all services..."
        start_infra

        echo ""
        print_warning "Starting backend and frontend in background..."
        echo ""

        # Run backend in background
        cd "$PROJECT_ROOT/backend"
        source venv/bin/activate
        export DATABASE_URL=postgresql://xtyl:xtylpassword@localhost:5432/xtyl_db
        export REDIS_URL=redis://localhost:6379/0
        export MINIO_ENDPOINT=localhost:9000
        export MINIO_ACCESS_KEY=minioadmin
        export MINIO_SECRET_KEY=minioadmin
        if [ -f "$PROJECT_ROOT/.env" ]; then
            set -a
            source <(grep -v '^#' "$PROJECT_ROOT/.env" | sed 's/#.*//' | sed 's/[[:space:]]*$//')
            set +a
        fi
        uvicorn main:app --reload --port 8000 &
        BACKEND_PID=$!

        # Run frontend in background
        cd "$PROJECT_ROOT/frontend"
        NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev &
        FRONTEND_PID=$!

        echo ""
        print_success "All services started!"
        echo ""
        echo "  Frontend: http://localhost:3000"
        echo "  Backend:  http://localhost:8000"
        echo "  MinIO:    http://localhost:9001"
        echo ""
        print_warning "Press Ctrl+C to stop all services"

        # Trap SIGINT to clean up
        trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; stop_infra; exit 0" SIGINT

        # Wait for processes
        wait
        ;;
    stop)
        print_status "Stopping all services..."
        # Kill any running uvicorn/node processes for this project
        pkill -f "uvicorn main:app" 2>/dev/null || true
        pkill -f "next dev" 2>/dev/null || true
        stop_infra
        print_success "All services stopped"
        ;;
    *)
        echo "Usage: ./dev.sh <command>"
        echo ""
        echo "Commands:"
        echo "  setup      - Initial setup (install dependencies, start infra)"
        echo "  start      - Start all services (infra + backend + frontend)"
        echo "  stop       - Stop all services"
        echo "  infra      - Start only infrastructure (Docker)"
        echo "  infra-stop - Stop infrastructure"
        echo "  backend    - Start only backend (requires infra running)"
        echo "  frontend   - Start only frontend"
        echo ""
        echo "For development, run in separate terminals:"
        echo "  Terminal 1: ./dev.sh infra"
        echo "  Terminal 2: ./dev.sh backend"
        echo "  Terminal 3: ./dev.sh frontend"
        ;;
esac
