"""
System Router - Public system information endpoints.

Provides endpoints for:
- Active system messages (maintenance, announcements)
- System status

These endpoints do NOT require authentication.
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/messages")
async def get_active_messages(
    db: Session = Depends(get_db),
):
    """
    Get active system messages for display to users.

    Returns only messages that are:
    - Active (is_active = true)
    - Within their display window (starts_at <= now <= ends_at)

    Sorted by priority (highest first) then creation date.
    No authentication required.
    """
    from models import SystemConfig

    config = db.query(SystemConfig).filter(SystemConfig.key == "system_messages").first()

    if not config or not config.value:
        return {"messages": []}

    messages = config.value.get("messages", [])
    now = datetime.now(timezone.utc)

    # Filter active and within time window
    active_messages = []
    for m in messages:
        if not m.get("is_active", True):
            continue

        # Check starts_at
        starts_at = m.get("starts_at")
        if starts_at:
            try:
                start_dt = datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
                if now < start_dt:
                    continue
            except (ValueError, TypeError):
                pass

        # Check ends_at
        ends_at = m.get("ends_at")
        if ends_at:
            try:
                end_dt = datetime.fromisoformat(ends_at.replace("Z", "+00:00"))
                if now > end_dt:
                    continue
            except (ValueError, TypeError):
                pass

        active_messages.append({
            "id": m.get("id"),
            "type": m.get("type"),
            "title": m.get("title"),
            "content": m.get("content"),
            "dismissible": m.get("dismissible", True),
            "priority": m.get("priority", 0),
        })

    # Sort by priority (desc)
    active_messages.sort(key=lambda x: -x.get("priority", 0))

    return {"messages": active_messages}
