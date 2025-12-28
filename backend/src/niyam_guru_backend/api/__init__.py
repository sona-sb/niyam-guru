"""
Niyam Guru API Module

FastAPI routes for legal prediction services.
"""

from niyam_guru_backend.api.prediction_routes import router as prediction_router
from niyam_guru_backend.api.server import app

__all__ = ["prediction_router", "app"]
