from fastapi import Request
from fastapi.responses import JSONResponse
import httpx

async def backend_exception_handler(request: Request, exc: httpx.HTTPStatusError):
    """
    Transparently passes backend errors to the frontend without swallowing orchestration errors.
    """
    try:
        # Try to forward the exact JSON payload from the backend
        detail = exc.response.json()
    except Exception:
        detail = {"detail": exc.response.text}
        
    return JSONResponse(
        status_code=exc.response.status_code,
        content=detail
    )
