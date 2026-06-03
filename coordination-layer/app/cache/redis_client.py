import redis.asyncio as redis
from app.config.settings import settings
import json
from typing import Optional, Any

class RedisClient:
    def __init__(self):
        self.client: Optional[redis.Redis] = None

    async def connect(self):
        self.client = redis.from_url(settings.redis_url, decode_responses=True)

    async def close(self):
        if self.client:
            await self.client.close()

    def _build_key(self, org_id: str, user_id: str, resource: str) -> str:
        """
        Critical security point: 
        Always key cache by: org + user + resource 
        when caching anything related to an authenticated user payload.
        """
        return f"cache:org:{org_id}:user:{user_id}:res:{resource}"

    async def get_cached_projection(self, org_id: str, user_id: str, resource: str) -> Optional[Any]:
        if not self.client:
            return None
        try:
            key = self._build_key(org_id, user_id, resource)
            data = await self.client.get(key)
            if data:
                return json.loads(data)
        except Exception:
            pass
        return None

    async def set_cached_projection(self, org_id: str, user_id: str, resource: str, data: Any, expire: int = 300):
        if not self.client:
            return
        try:
            key = self._build_key(org_id, user_id, resource)
            await self.client.set(key, json.dumps(data), ex=expire)
        except Exception:
            pass

redis_client = RedisClient()
