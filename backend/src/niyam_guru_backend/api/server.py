"""
Niyam Guru Backend API Server

FastAPI application that provides endpoints for:
- Consumer complaint judgment prediction
- Multimodal document analysis with Google Gemini
- Case data management

Run with: uvicorn niyam_guru_backend.api.server:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from niyam_guru_backend.api.prediction_routes import router as prediction_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("\n" + "=" * 70)
    print("🚀 Niyam Guru Backend API Server Starting...")
    print("=" * 70)
    
    # Check environment variables
    google_api_key = os.environ.get("GOOGLE_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    
    if google_api_key:
        print("✅ GOOGLE_API_KEY is configured")
    else:
        print("⚠️ Warning: GOOGLE_API_KEY not set")
    
    if supabase_url:
        print("✅ SUPABASE_URL is configured")
    else:
        print("⚠️ Warning: SUPABASE_URL not set")
    
    print("=" * 70)
    print("📡 Server ready to accept requests")
    print("=" * 70 + "\n")
    
    yield
    
    # Shutdown
    print("\n🛑 Niyam Guru Backend API Server Shutting Down...")


# Create FastAPI application
app = FastAPI(
    title="Niyam Guru API",
    description="""
    AI-powered legal judgment prediction API for Indian Consumer Protection cases.
    
    ## Features
    - Analyze consumer complaints and predict likely judgments
    - Multimodal document analysis (PDFs, images passed directly to Gemini)
    - RAG-based retrieval from historical case database
    - Integration with Consumer Protection Act, 2019
    
    ## Endpoints
    - `/api/prediction/analyze` - Main prediction endpoint (JSON with base64 files)
    - `/api/prediction/analyze-multipart` - Multipart form data endpoint
    - `/api/prediction/health` - Health check
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",    # Vite dev server
        "http://localhost:3000",    # Alternative dev port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        # Add production frontend URL here
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(prediction_router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Niyam Guru API",
        "version": "1.0.0",
        "description": "AI-powered legal judgment prediction for consumer protection cases",
        "docs": "/docs",
        "health": "/api/prediction/health",
    }


@app.get("/health")
async def health():
    """Global health check."""
    return {"status": "healthy", "service": "niyam-guru-backend"}


# ========== Run Server ==========
if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or default to 8000
    port = int(os.environ.get("PORT", 8000))
    
    print(f"\n🚀 Starting Niyam Guru API Server on port {port}...")
    
    uvicorn.run(
        "niyam_guru_backend.api.server:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )
