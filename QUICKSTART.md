# XTYL Creativity Machine - Quick Reference

## Quick Start Commands

### Development Workflow
```bash
# Fast rebuild (only frontend - recommended for most changes)
./rebuild.sh

# Full rebuild (both frontend and backend)
./rebuild.sh full

# Fresh start (removes all data, complete rebuild)
./rebuild.sh fresh

# View logs
docker-compose logs -f frontend backend

# Check container status
docker-compose ps
```

### Manual Commands
```bash
# Start everything
docker-compose up -d

# Stop everything (keeps data)
docker-compose down

# Rebuild without cache
docker-compose build --no-cache

# Access container shell
docker-compose exec frontend sh
docker-compose exec backend bash
```

## URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)

## Common Issues

### 1. Frontend styles not loading
```bash
./rebuild.sh
```

### 2. Backend errors after dependency changes
```bash
./rebuild.sh full
```

### 3. Database migration issues
```bash
./rebuild.sh fresh  # WARNING: Deletes all data!
```

### 4. Port already in use
```bash
# Check what's using the port
lsof -i :3000  # or :8000
# Kill the process or stop other containers
docker-compose down
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set your `OPENROUTER_API_KEY`
3. Adjust other settings if needed

## Testing Features

### Register/Login
1. Go to http://localhost:3000
2. Click "Register"
3. Create account and login

### Create Content
1. Create a Workspace
2. Create a Project
3. Use "Creations" tab to create editable content
4. Use "Context Files" tab to upload reference documents

### AI Chat
1. Open a project
2. Use the chat sidebar on the right
3. Enable RAG to use project documents as context
4. Select specific documents for targeted context

### Smart Editor
1. Click any creation or context file
2. Edit content directly
3. Ask AI for suggestions via chat
4. Click "Suggest Edit" to see AI changes with diff view
5. Accept or reject suggested changes

## File Structure
```
├── frontend/          Next.js app
│   ├── src/
│   │   ├── app/      Pages and routes  
│   │   ├── components/   Reusable components
│   │   └── lib/      Utils and API client
│   └── Dockerfile
├── backend/           FastAPI app
│   ├── routers/      API endpoints
│   ├── models.py     Database models
│   └── Dockerfile
├── docker-compose.yml
└── rebuild.sh        Quick rebuild script
```
