from fastapi import APIRouter
from app.core.backend_client import backend_client

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok", "layer": "coordination"}

@router.get("/backend-health")
async def backend_health():
    try:
        # Assuming backend has a /health endpoint
        response = await backend_client.get("/health")
        return response.json()
    except Exception as e:
        return {"status": "unhealthy", "backend_error": str(e)}
