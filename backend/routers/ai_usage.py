from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from database import get_db
from models import User
from schemas import AIUsageLog, AIUsageStats, AIUsageSummary
from supabase_auth import get_current_user
from ai_usage_service import get_usage_stats, get_usage_logs, get_daily_usage_trend

router = APIRouter(
    prefix="/ai-usage",
    tags=["ai-usage"],
)


@router.get("/stats", response_model=AIUsageStats)
def get_stats(
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get aggregated AI usage statistics.

    Filters:
    - workspace_id: Filter by workspace
    - project_id: Filter by project
    - start_date: Filter from this date (ISO format)
    - end_date: Filter to this date (ISO format)
    """
    return get_usage_stats(
        db=db,
        user_id=str(current_user.id),
        workspace_id=workspace_id,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/summary", response_model=AIUsageSummary)
def get_summary(
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get usage summary for today, this week, this month, and all time.
    """
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = now - timedelta(days=now.weekday())
    month_start = datetime(now.year, now.month, 1)

    # Get stats for each period
    today_stats = get_usage_stats(
        db=db,
        user_id=str(current_user.id),
        workspace_id=workspace_id,
        project_id=project_id,
        start_date=today_start,
        end_date=now
    )

    week_stats = get_usage_stats(
        db=db,
        user_id=str(current_user.id),
        workspace_id=workspace_id,
        project_id=project_id,
        start_date=week_start,
        end_date=now
    )

    month_stats = get_usage_stats(
        db=db,
        user_id=str(current_user.id),
        workspace_id=workspace_id,
        project_id=project_id,
        start_date=month_start,
        end_date=now
    )

    all_time_stats = get_usage_stats(
        db=db,
        user_id=str(current_user.id),
        workspace_id=workspace_id,
        project_id=project_id
    )

    return AIUsageSummary(
        today=today_stats,
        this_week=week_stats,
        this_month=month_stats,
        all_time=all_time_stats
    )


@router.get("/logs", response_model=List[AIUsageLog])
def get_logs(
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get individual AI usage log records.

    Pagination:
    - limit: Number of records to return (1-1000, default 100)
    - offset: Number of records to skip (default 0)

    Filters:
    - workspace_id: Filter by workspace
    - project_id: Filter by project
    - start_date: Filter from this date (ISO format)
    - end_date: Filter to this date (ISO format)
    """
    return get_usage_logs(
        db=db,
        user_id=str(current_user.id),
        workspace_id=workspace_id,
        project_id=project_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )


@router.get("/trend")
def get_trend(
    days: int = Query(30, ge=1, le=365),
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get daily usage trend for the last N days.

    Args:
    - days: Number of days to include (1-365, default 30)
    - workspace_id: Filter by workspace
    - project_id: Filter by project

    Returns:
    List of daily aggregates with date, requests, tokens, cost
    """
    return get_daily_usage_trend(
        db=db,
        days=days,
        user_id=str(current_user.id),
        workspace_id=workspace_id,
        project_id=project_id
    )
