from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import places

def create_app() -> FastAPI:
    app = FastAPI(title="MoodMap Core Engine", version="2.0")

    # Connect to Vite Frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"], 
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(places.router, prefix="/api/v1")

    @app.get("/")
    def root():
        return {"status": "online", "message": "MoodMap Backend is live!"}

    return app

app = create_app()