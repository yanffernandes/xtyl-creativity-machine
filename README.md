# XTYL Creativity Machine

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (optional, for local frontend dev outside docker)

### 1. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
*Note: If you have an OpenRouter API Key, add it to the `.env` file. Otherwise, the system will use mock responses.*

### 2. Run with Docker

#### Development Mode
For local development with hot reload:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

#### Production Mode (Recommended for Easypanel/VPS)
For production deployment:
```bash
docker-compose up --build
```

> **Note**: The main `docker-compose.yml` is optimized for production/Easypanel deployment (no `container_name` or `ports` to avoid conflicts).

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (User/Pass: minioadmin/minioadmin)

### 3. Development Notes
- **Frontend**: Located in `frontend/`. Built with Next.js + Shadcn/UI.
- **Backend**: Located in `backend/`. Built with FastAPI.
- **Database**: PostgreSQL with `pgvector` extension for AI memory.

### 4. Testing the Flow
1. Go to [http://localhost:3000](http://localhost:3000).
2. Register a new account.
3. Create a Workspace (e.g., "XTYL Agency").
4. Create a Project (e.g., "Client A").
5. Upload a PDF/TXT document in the Project.
6. Use the Chat Sidebar to ask questions about the document.
7. Ask the AI to generate content and use "Suggest Edit" to send it to the Smart Editor.
