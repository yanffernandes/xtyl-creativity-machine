"""
Models Router

Provides endpoints for listing available AI models and their capabilities
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from services.model_config import ModelConfig, TaskType

router = APIRouter(prefix="/models", tags=["models"])

@router.get("/text", response_model=List[Dict[str, Any]])
async def list_text_models():
    """
    Get all available text generation models

    Returns detailed information about each model including:
    - Model ID and name
    - Provider
    - Capabilities (streaming, JSON mode, vision)
    - Token limits
    - Pricing information
    - Recommended use cases
    """
    return await ModelConfig.get_all_text_models()

@router.get("/image", response_model=List[Dict[str, Any]])
async def list_image_models():
    """
    Get all available image generation models
    """
    return ModelConfig.get_all_image_models()

@router.get("/{model_id}")
async def get_model_details(model_id: str):
    """
    Get detailed information about a specific model
    """
    model = ModelConfig.get_model_by_id(model_id)

    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"Model not found: {model_id}"
        )

    return {
        "id": model.model_id,
        "name": model.model_name,
        "provider": model.provider.value,
        "task_types": [t.value for t in model.task_types],
        "max_tokens": model.max_tokens,
        "context_window": model.context_window,
        "supports_streaming": model.supports_streaming,
        "supports_json_mode": model.supports_json_mode,
        "supports_vision": model.supports_vision,
        "description": model.description,
        "recommended_for": model.recommended_for,
        "pricing": {
            "input_per_1k_tokens": model.cost_per_1k_input_tokens,
            "output_per_1k_tokens": model.cost_per_1k_output_tokens
        }
    }

@router.get("/{model_id}/pricing")
async def get_model_pricing(model_id: str):
    """
    Get pricing information for a specific model
    """
    pricing = ModelConfig.get_model_pricing(model_id)

    if pricing["input"] == 0.0 and pricing["output"] == 0.0:
        raise HTTPException(
            status_code=404,
            detail=f"Model not found: {model_id}"
        )

    return pricing

@router.post("/{model_id}/estimate-cost")
async def estimate_generation_cost(
    model_id: str,
    input_tokens: int,
    output_tokens: int
):
    """
    Estimate cost for a generation task

    Params:
    - input_tokens: Estimated input token count
    - output_tokens: Estimated output token count

    Returns:
    - estimated_cost: Total cost in USD
    - breakdown: Cost breakdown by input/output
    """
    model = ModelConfig.get_model_by_id(model_id)

    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"Model not found: {model_id}"
        )

    total_cost = ModelConfig.estimate_cost(model_id, input_tokens, output_tokens)
    pricing = ModelConfig.get_model_pricing(model_id)

    input_cost = (input_tokens / 1000) * pricing["input"]
    output_cost = (output_tokens / 1000) * pricing["output"]

    return {
        "model_id": model_id,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "estimated_cost": round(total_cost, 6),
        "breakdown": {
            "input_cost": round(input_cost, 6),
            "output_cost": round(output_cost, 6)
        },
        "currency": "USD"
    }

@router.get("/defaults/{task_type}")
async def get_default_model(task_type: str):
    """
    Get recommended default model for a task type
    """
    try:
        task = TaskType(task_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid task type: {task_type}. Valid types: {[t.value for t in TaskType]}"
        )

    model = ModelConfig.get_default_model(task)

    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"No default model configured for task type: {task_type}"
        )

    return {
        "task_type": task_type,
        "default_model_id": model.model_id,
        "default_model_name": model.model_name
    }
