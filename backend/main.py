from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import meals, restaurants, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database tables on startup."""
    await init_db()
    yield


app = FastAPI(
    title="AI Food Logging API",
    description="Backend API for the AI-powered food logging application.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploaded images
UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Routers
app.include_router(meals.router)
app.include_router(restaurants.router)
app.include_router(search.router)


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "message": "AI Food Logging API is running."}


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "healthy"}
