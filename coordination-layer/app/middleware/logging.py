import time
import logging
import json
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("samanvay.coordination")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
handler.setFormatter(logging.Formatter('%(message)s'))
logger.addHandler(handler)

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        request_id = getattr(request.state, "request_id", None)
        org_id = request.headers.get("X-Org-ID", "unknown")
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        
        log_data = {
            "request_id": request_id,
            "org_id": org_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "latency_ms": round(process_time * 1000, 2)
        }
        
        logger.info(json.dumps(log_data))
        return response
