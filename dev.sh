#!/bin/bash

# Development script for xtyl-creativity-machine
# Uses Supabase (cloud DB) and Cloudflare R2 (cloud storage)
# Only Redis runs locally in Docker for caching

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

# Load environment variables from .env
load_env() {
    if [ -f "$PROJECT_ROOT/.env" ]; then
        set -a
        while IFS='=' read -r key value; do
            # Skip empty lines and comments
            [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
            # Remove leading/trailing whitespace from key
            key=$(echo "$key" | xargs)
            # Only export if key is valid
            if [[ "$key" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
                export "$key=$value"
            fi
        done < "$PROJECT_ROOT/.env"
        set +a
    else
        print_error ".env file not found!"
        exit 1
    fi
}

# Start Redis (only local infrastructure needed)
start_redis() {
    print_status "Starting Redis for caching..."

    # Check if Redis container exists
    if docker ps -a --format '{{.Names}}' | grep -q '^xtyl-redis$'; then
        # Container exists, start it if not running
        if ! docker ps --format '{{.Names}}' | grep -q '^xtyl-redis$'; then
            docker start xtyl-redis
        fi
    else
        # Create new container
        docker run -d --name xtyl-redis -p 6379:6379 redis:alpine
    fi

    # Wait for Redis to be ready
    until docker exec xtyl-redis redis-cli ping &> /dev/null; do
        sleep 1
    done
    print_success "Redis is ready"
}

# Stop Redis
stop_redis() {
    print_status "Stopping Redis..."
    docker stop xtyl-redis 2>/dev/null || true
    print_success "Redis stopped"
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

# Kill processes on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pids" ]; then
        print_status "Killing processes on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Run backend
run_backend() {
    cd "$PROJECT_ROOT/backend"

    # Activate venv if exists
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi

    load_env

    print_status "Starting backend on http://localhost:8000"
    print_status "Using Supabase database (cloud)"
    uvicorn main:app --reload --port 8000
}

# Run frontend
run_frontend() {
    cd "$PROJECT_ROOT/frontend"
    load_env

    print_status "Starting frontend on http://localhost:3000"
    npm run dev
}

# Main command handler
case "${1:-}" in
    redis)
        start_redis
        ;;
    redis-stop)
        stop_redis
        ;;
    infra)
        # Now just starts Redis
        start_redis
        ;;
    infra-stop)
        stop_redis
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

        start_redis
        setup_backend
        setup_frontend
        print_success "Setup complete! Run './dev.sh start' to start development servers"
        ;;
    start)
        print_status "Starting all services..."

        # Kill any existing processes on our ports
        kill_port 8000
        kill_port 3000

        # Start Redis for caching
        start_redis

        echo ""
        print_status "Starting backend and frontend..."
        echo ""

        load_env

        # Run backend in background
        cd "$PROJECT_ROOT/backend"
        if [ -d "venv" ]; then
            source venv/bin/activate
        fi

        uvicorn main:app --reload --port 8000 &
        BACKEND_PID=$!

        # Give backend a moment to start
        sleep 2

        # Run frontend in background
        cd "$PROJECT_ROOT/frontend"
        npm run dev &
        FRONTEND_PID=$!

        echo ""
        print_success "All services started!"
        echo ""
        echo "  Frontend: http://localhost:3000"
        echo "  Backend:  http://localhost:8000"
        echo ""
        echo "  Database: Supabase (cloud)"
        echo "  Storage:  Cloudflare R2 (cloud)"
        echo "  Cache:    Redis (local Docker)"
        echo ""
        print_warning "Press Ctrl+C to stop all services"

        # Trap SIGINT to clean up
        cleanup() {
            echo ""
            print_status "Shutting down..."
            kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
            stop_redis
            print_success "All services stopped"
            exit 0
        }
        trap cleanup SIGINT SIGTERM

        # Wait for processes
        wait
        ;;
    stop)
        print_status "Stopping all services..."
        # Kill any running uvicorn/node processes for this project
        kill_port 8000
        kill_port 3000
        stop_redis
        print_success "All services stopped"
        ;;
    status)
        echo ""
        echo "Service Status:"
        echo "---------------"

        # Check backend
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            print_success "Backend:  Running on http://localhost:8000"
        else
            print_error "Backend:  Not running"
        fi

        # Check frontend
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "Frontend: Running on http://localhost:3000"
        else
            print_error "Frontend: Not running"
        fi

        # Check Redis
        if docker exec xtyl-redis redis-cli ping > /dev/null 2>&1; then
            print_success "Redis:    Running on localhost:6379"
        else
            print_error "Redis:    Not running"
        fi

        echo ""
        ;;
    *)
        echo "Usage: ./dev.sh <command>"
        echo ""
        echo "Commands:"
        echo "  setup         - Initial setup (install dependencies)"
        echo "  start         - Start all services (Redis + backend + frontend)"
        echo "  stop          - Stop all services"
        echo "  status        - Check status of all services"
        echo "  redis         - Start only Redis"
        echo "  redis-stop    - Stop Redis"
        echo "  backend       - Start only backend"
        echo "  frontend      - Start only frontend"
        echo ""
        echo "Architecture:"
        echo "  Database: Supabase (cloud PostgreSQL)"
        echo "  Storage:  Cloudflare R2 (cloud object storage)"
        echo "  Cache:    Redis (local Docker container)"
        echo ""
        echo "For development, run in separate terminals:"
        echo "  Terminal 1: ./dev.sh redis"
        echo "  Terminal 2: ./dev.sh backend"
        echo "  Terminal 3: ./dev.sh frontend"
        ;;
esac
