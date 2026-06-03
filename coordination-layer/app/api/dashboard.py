from fastapi import APIRouter, Header
from app.core.backend_client import backend_client
from app.cache.redis_client import redis_client
import asyncio

router = APIRouter()


@router.get("/dashboard/event/{event_id}")
async def get_aggregated_dashboard(
    event_id: str,
    x_org_id: str = Header(...),
    Authorization: str = Header(...)
):
    """
    Shallow request aggregation for UI-focused operational summaries.
    Avoids recursively hydrating entire orchestration graphs.
    """

    # Cache lookup
    cached_data = await redis_client.get_cached_projection(
        org_id=x_org_id,
        user_id="dashboard",
        resource=f"event_{event_id}_summary"
    )

    if cached_data:
        return {
            "data": cached_data,
            "source": "cache"
        }

    # Forward headers to TS backend
    headers = {
    "Authorization": Authorization,
    "X-Org-ID": x_org_id,
} 

    try:
        # Concurrent shallow fetches
        event_req = backend_client.get(
            f"/api/events/{event_id}",
            headers=headers
        )

        readiness_req = backend_client.get(
            f"/api/events/{event_id}/readiness",
            headers=headers
        )

        event_res, readiness_res = await asyncio.gather(
            event_req,
            readiness_req
        )

        aggregated_payload = {
            "event": event_res.json(),
            "readiness_summary": readiness_res.json()
        }

        # Cache projection
        await redis_client.set_cached_projection(
            org_id=x_org_id,
            user_id="dashboard",
            resource=f"event_{event_id}_summary",
            data=aggregated_payload,
            expire=60
        )

        return {
            "data": aggregated_payload,
            "source": "backend"
        }

    except Exception as e:
        raise e