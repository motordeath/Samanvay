import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.core.backend_client import backend_client
from app.cache.redis_client import redis_client
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.logging import StructuredLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.api import health, dashboard
from app.websocket.manager import ws_manager
from app.core.errors import backend_exception_handler
from app.config.settings import settings
import httpx

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await redis_client.connect()
    yield
    # Shutdown
    await redis_client.close()
    await backend_client.close()

app = FastAPI(lifespan=lifespan, title="Samanvay Coordination Layer")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Other Middleware (Order matters: outermost first)
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RateLimitMiddleware)

# Health routes
app.include_router(health.router)

# Exception handlers
app.add_exception_handler(httpx.HTTPStatusError, backend_exception_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error"}
    )

# API routers
app.include_router(dashboard.router, prefix="/api")

# Websocket setup
@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: str = Query(..., description="JWT Token for auth"), 
    org_id: str = Query(..., description="Organization Context")
):
    connected = await ws_manager.connect(websocket, token, org_id)
    if not connected:
        return
        
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, org_id)

if __name__ == "__main__":
    import uvicorn
    PORT = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False
    )
