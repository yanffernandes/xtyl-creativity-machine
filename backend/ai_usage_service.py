"""
AI Usage Tracking Service

Handles logging and querying AI usage data.
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from models import AIUsageLog as AIUsageLogModel
from schemas import AIUsageLogCreate, AIUsageStats
from pricing_service import calculate_cost
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid


def log_ai_usage(
    db: Session,
    user_id: str,
    model: str,
    provider: str,
    request_type: str,
    input_tokens: int,
    output_tokens: int,
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    prompt_preview: Optional[str] = None,
    response_preview: Optional[str] = None,
    tool_calls: Optional[List[str]] = None,
    duration_ms: Optional[int] = None,
    cost: Optional[float] = None
) -> Optional[AIUsageLogModel]:
    """
    Log an AI usage record.

    Args:
        db: Database session
        user_id: ID of the user making the request
        model: Model identifier (e.g., "anthropic/claude-3-5-sonnet")
        provider: Provider name ("openrouter", "anthropic", "openai")
        request_type: Type of request ("chat", "vision", "tool_call", "image")
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        workspace_id: Optional workspace context
        project_id: Optional project context
        prompt_preview: Optional preview of the prompt (first 500 chars)
        response_preview: Optional preview of the response (first 500 chars)
        tool_calls: Optional list of tool names used
        duration_ms: Optional response time in milliseconds
        cost: Optional explicit cost (overrides calculation)

    Returns:
        Created AIUsageLog instance or None if logging failed
    """
    try:
        # Calculate costs
        if cost is not None:
            total_cost = cost
            input_cost = 0.0
            output_cost = cost
        else:
            input_cost, output_cost, total_cost = calculate_cost(model, input_tokens, output_tokens)

        total_tokens = input_tokens + output_tokens

        # Create log entry
        usage_log = AIUsageLogModel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            workspace_id=workspace_id,
            project_id=project_id,
            model=model,
            provider=provider,
            request_type=request_type,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            input_cost=input_cost,
            output_cost=output_cost,
            total_cost=total_cost,
            prompt_preview=prompt_preview[:500] if prompt_preview else None,
            response_preview=response_preview[:500] if response_preview else None,
            tool_calls=tool_calls,
            duration_ms=duration_ms
        )

        db.add(usage_log)
        db.commit()
        db.refresh(usage_log)

        print(f"📊 AI Usage logged: {model} | {input_tokens}+{output_tokens} tokens | ${total_cost:.6f}")

        return usage_log
    except Exception as e:
        print(f"❌ Failed to log AI usage: {e}")
        # Try to rollback if possible
        try:
            db.rollback()
        except:
            pass
        return None


def get_usage_stats(
    db: Session,
    user_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> AIUsageStats:
    """
    Get aggregated usage statistics.

    Args:
        db: Database session
        user_id: Filter by user ID
        workspace_id: Filter by workspace ID
        project_id: Filter by project ID
        start_date: Filter from this date
        end_date: Filter to this date

    Returns:
        AIUsageStats object with aggregated data
    """
    # Build query filters
    filters = []
    if user_id:
        filters.append(AIUsageLogModel.user_id == user_id)
    if workspace_id:
        filters.append(AIUsageLogModel.workspace_id == workspace_id)
    if project_id:
        filters.append(AIUsageLogModel.project_id == project_id)
    if start_date:
        filters.append(AIUsageLogModel.created_at >= start_date)
    if end_date:
        filters.append(AIUsageLogModel.created_at <= end_date)

    # Get total aggregates
    query = db.query(
        func.count(AIUsageLogModel.id).label('total_requests'),
        func.sum(AIUsageLogModel.total_tokens).label('total_tokens'),
        func.sum(AIUsageLogModel.input_tokens).label('total_input_tokens'),
        func.sum(AIUsageLogModel.output_tokens).label('total_output_tokens'),
        func.sum(AIUsageLogModel.total_cost).label('total_cost')
    )

    if filters:
        query = query.filter(and_(*filters))

    result = query.first()

    # Get breakdown by model
    by_model_query = db.query(
        AIUsageLogModel.model,
        func.count(AIUsageLogModel.id).label('requests'),
        func.sum(AIUsageLogModel.total_tokens).label('tokens'),
        func.sum(AIUsageLogModel.total_cost).label('cost')
    )
    if filters:
        by_model_query = by_model_query.filter(and_(*filters))

    by_model = {}
    for row in by_model_query.group_by(AIUsageLogModel.model).all():
        by_model[row.model] = {
            'requests': row.requests,
            'tokens': int(row.tokens or 0),
            'cost': float(row.cost or 0)
        }

    # Get breakdown by provider
    by_provider_query = db.query(
        AIUsageLogModel.provider,
        func.count(AIUsageLogModel.id).label('requests'),
        func.sum(AIUsageLogModel.total_tokens).label('tokens'),
        func.sum(AIUsageLogModel.total_cost).label('cost')
    )
    if filters:
        by_provider_query = by_provider_query.filter(and_(*filters))

    by_provider = {}
    for row in by_provider_query.group_by(AIUsageLogModel.provider).all():
        by_provider[row.provider] = {
            'requests': row.requests,
            'tokens': int(row.tokens or 0),
            'cost': float(row.cost or 0)
        }

    # Get breakdown by request type
    by_type_query = db.query(
        AIUsageLogModel.request_type,
        func.count(AIUsageLogModel.id).label('requests'),
        func.sum(AIUsageLogModel.total_tokens).label('tokens'),
        func.sum(AIUsageLogModel.total_cost).label('cost')
    )
    if filters:
        by_type_query = by_type_query.filter(and_(*filters))

    by_request_type = {}
    for row in by_type_query.group_by(AIUsageLogModel.request_type).all():
        by_request_type[row.request_type] = {
            'requests': row.requests,
            'tokens': int(row.tokens or 0),
            'cost': float(row.cost or 0)
        }

    return AIUsageStats(
        total_requests=result.total_requests or 0,
        total_tokens=int(result.total_tokens or 0),
        total_input_tokens=int(result.total_input_tokens or 0),
        total_output_tokens=int(result.total_output_tokens or 0),
        total_cost=float(result.total_cost or 0),
        by_model=by_model,
        by_provider=by_provider,
        by_request_type=by_request_type,
        start_date=start_date,
        end_date=end_date
    )


def get_usage_logs(
    db: Session,
    user_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0
) -> List[AIUsageLogModel]:
    """
    Get individual usage log records.

    Args:
        db: Database session
        user_id: Filter by user ID
        workspace_id: Filter by workspace ID
        project_id: Filter by project ID
        start_date: Filter from this date
        end_date: Filter to this date
        limit: Maximum number of records to return
        offset: Number of records to skip

    Returns:
        List of AIUsageLog records
    """
    query = db.query(AIUsageLogModel)

    # Apply filters
    if user_id:
        query = query.filter(AIUsageLogModel.user_id == user_id)
    if workspace_id:
        query = query.filter(AIUsageLogModel.workspace_id == workspace_id)
    if project_id:
        query = query.filter(AIUsageLogModel.project_id == project_id)
    if start_date:
        query = query.filter(AIUsageLogModel.created_at >= start_date)
    if end_date:
        query = query.filter(AIUsageLogModel.created_at <= end_date)

    # Order by most recent first
    query = query.order_by(AIUsageLogModel.created_at.desc())

    # Paginate
    query = query.limit(limit).offset(offset)

    return query.all()


def get_daily_usage_trend(
    db: Session,
    days: int = 30,
    user_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    project_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get daily usage trend for the last N days.

    Args:
        db: Database session
        days: Number of days to include
        user_id: Filter by user ID
        workspace_id: Filter by workspace ID
        project_id: Filter by project ID

    Returns:
        List of dictionaries with date, requests, tokens, cost
    """
    start_date = datetime.utcnow() - timedelta(days=days)

    query = db.query(
        func.date(AIUsageLogModel.created_at).label('date'),
        func.count(AIUsageLogModel.id).label('requests'),
        func.sum(AIUsageLogModel.total_tokens).label('tokens'),
        func.sum(AIUsageLogModel.total_cost).label('cost')
    ).filter(AIUsageLogModel.created_at >= start_date)

    if user_id:
        query = query.filter(AIUsageLogModel.user_id == user_id)
    if workspace_id:
        query = query.filter(AIUsageLogModel.workspace_id == workspace_id)
    if project_id:
        query = query.filter(AIUsageLogModel.project_id == project_id)

    query = query.group_by(func.date(AIUsageLogModel.created_at))
    query = query.order_by(func.date(AIUsageLogModel.created_at))

    results = []
    for row in query.all():
        results.append({
            'date': str(row.date),
            'requests': row.requests,
            'tokens': int(row.tokens or 0),
            'cost': float(row.cost or 0)
        })

    return results
