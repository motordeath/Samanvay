from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from contextlib import asynccontextmanager
from app.core.backend_client import backend_client
from app.cache.redis_client import redis_client
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.logging import StructuredLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.api import health, dashboard
from app.websocket.manager import ws_manager
from app.core.errors import backend_exception_handler
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

# Exception Handlers
app.add_exception_handler(httpx.HTTPStatusError, backend_exception_handler)

# Middleware (Order matters: outermost first)
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(RateLimitMiddleware)

# Routers
app.include_router(health.router)
app.include_router(dashboard.router, prefix="/api")

# Websocket endpoint
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
            # Coordination layer mainly pushes updates, but can acknowledge pings
            data = await websocket.receive_text()
            # We don't process mutations here, just infrastructure signals
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, org_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
