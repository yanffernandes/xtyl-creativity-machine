from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, workspaces, documents, chat, folders, activity, ai_usage, templates, image_generation, visual_assets

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="XTYL Creativity Machine API")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(workspaces.router)
app.include_router(documents.router)
app.include_router(folders.router)
app.include_router(activity.router)
app.include_router(chat.router)
app.include_router(ai_usage.router)
app.include_router(templates.router)
app.include_router(image_generation.router)
app.include_router(visual_assets.router)

@app.get("/")
async def root():
    return {"message": "Welcome to XTYL Creativity Machine API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
