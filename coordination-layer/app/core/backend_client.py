import httpx
from httpx import AsyncClient, Timeout
from app.config.settings import settings
import logging
import asyncio

logger = logging.getLogger(__name__)

class BackendClient:
    def __init__(self):
        self.timeout = Timeout(
            connect=settings.backend_connect_timeout,
            read=settings.backend_read_timeout,
            write=5.0,
            pool=5.0
        )
        self.client = AsyncClient(
            base_url=settings.backend_api_url,
            timeout=self.timeout
        )

    async def _request(self, method: str, url: str, retries: int = settings.backend_retry_count, **kwargs):
        for attempt in range(retries + 1):
            try:
                response = await self.client.request(method, url, **kwargs)
                response.raise_for_status()
                return response
            except httpx.HTTPStatusError as e:
                # Do not retry on 4xx errors, pass them through
                if 400 <= e.response.status_code < 500:
                    raise e
                if attempt == retries:
                    logger.error(f"Backend request failed after {retries} retries: {e}")
                    raise e
            except httpx.RequestError as e:
                if attempt == retries:
                    logger.error(f"Backend connection error after {retries} retries: {e}")
                    raise e
                logger.warning(f"Backend request failed (attempt {attempt + 1}/{retries + 1}): {e}")
                await asyncio.sleep(0.5 * (attempt + 1))

    async def get(self, url: str, **kwargs):
        return await self._request("GET", url, **kwargs)
        
    async def post(self, url: str, **kwargs):
        return await self._request("POST", url, **kwargs)

    async def put(self, url: str, **kwargs):
        return await self._request("PUT", url, **kwargs)

    async def delete(self, url: str, **kwargs):
        return await self._request("DELETE", url, **kwargs)
        
    async def close(self):
        await self.client.aclose()

backend_client = BackendClient()
