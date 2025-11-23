# Troubleshooting Docker Deployment

## Issues Fixed

### 1. Backend Import Errors
- **Problem**: LangChain module structure changed in recent versions
- **Solution**: Updated all imports to use correct modules:
  - `langchain_text_splitters` for text splitting
  - `langchain_core.documents` for Document class
- **Files Changed**: `backend/rag_service.py`, `backend/requirements.txt`

### 2. Frontend CSS Not Loading
- **Diagnosis**: Tailwind CSS configured correctly, but production build may be optimized differently
- **Root Cause**: The `layout.tsx` imports `./globals.css` correctly, but Tailwind needs to detect class usage

## Complete Rebuild Steps

Run these commands in order:

```bash
# 1. Stop all containers
docker-compose down

# 2. Remove old images (force clean rebuild)
docker-compose down --rmi all

# 3. Rebuild WITHOUT cache (critical for dependency changes)
docker-compose build --no-cache

# 4. Start containers
docker-compose up
```

## Expected Result

- **Backend**: Should start without errors on port 8000
- **Frontend**: Should load with full Tailwind styling on port 3000
- **Database**: PostgreSQL ready with pgvector extension
- **MinIO**: Object storage ready on port 9001

## Quick Test

1. Open `http://localhost:3000`
2. Should see styled login page with proper colors/buttons
3. Try registering a new user
4. Backend API docs at `http://localhost:8000/docs`
