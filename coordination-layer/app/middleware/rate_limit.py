from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.cache.redis_client import redis_client

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"
        
        # Simplified logic for demonstration: 100 requests per minute
        if redis_client.client:
            try:
                requests = await redis_client.client.incr(key)
                if requests == 1:
                    await redis_client.client.expire(key, 60)
                if requests > 100:
                    return JSONResponse(status_code=429, content={"detail": "Too Many Requests"})
            except Exception as e:
                # If Redis is down, fail open or close depending on requirements.
                # We fail open here so the app doesn't go completely down.
                pass
                
        response = await call_next(request)
        return response
