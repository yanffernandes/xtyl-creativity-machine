"""
Dynamic Pricing Service

Fetches model pricing from OpenRouter API instead of hardcoded values.
Includes caching to avoid excessive API calls.
"""

import httpx
import os
from typing import Dict, Tuple, Optional
from datetime import datetime, timedelta
from functools import lru_cache
import asyncio

# Cache for model pricing
_pricing_cache: Dict[str, Dict[str, float]] = {}
_cache_timestamp: Optional[datetime] = None
CACHE_TTL = timedelta(hours=1)  # Refresh pricing every hour


def get_api_key() -> str:
    """Get OpenRouter API key from environment."""
    return os.getenv("OPENROUTER_API_KEY", "")


async def fetch_models_pricing() -> Dict[str, Dict[str, float]]:
    """
    Fetch pricing for all models from OpenRouter /models endpoint.

    Returns:
        Dictionary mapping model IDs to their pricing:
        {"model_id": {"input": price_per_token, "output": price_per_token}}
    """
    api_key = get_api_key()
    if not api_key:
        return {}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://xtyl.app",
                    "X-Title": "XTYL Creativity Machine"
                }
            )
            response.raise_for_status()
            data = response.json()

            pricing = {}
            for model in data.get("data", []):
                model_id = model.get("id", "")
                model_pricing = model.get("pricing", {})

                # OpenRouter returns pricing as strings in price-per-token format
                prompt_price = float(model_pricing.get("prompt", "0") or "0")
                completion_price = float(model_pricing.get("completion", "0") or "0")

                pricing[model_id] = {
                    "input": prompt_price,
                    "output": completion_price
                }

            return pricing
    except Exception as e:
        print(f"Error fetching models pricing from OpenRouter: {e}")
        return {}


def fetch_models_pricing_sync() -> Dict[str, Dict[str, float]]:
    """Synchronous wrapper for fetch_models_pricing."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If already in async context, create new loop in thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, fetch_models_pricing())
                return future.result(timeout=30)
        else:
            return loop.run_until_complete(fetch_models_pricing())
    except RuntimeError:
        # No event loop, create one
        return asyncio.run(fetch_models_pricing())


def get_cached_pricing() -> Dict[str, Dict[str, float]]:
    """Get pricing from cache, refreshing if needed."""
    global _pricing_cache, _cache_timestamp

    now = datetime.utcnow()

    # Check if cache is valid
    if _pricing_cache and _cache_timestamp and (now - _cache_timestamp) < CACHE_TTL:
        return _pricing_cache

    # Refresh cache
    try:
        _pricing_cache = fetch_models_pricing_sync()
        _cache_timestamp = now
    except Exception as e:
        print(f"Error refreshing pricing cache: {e}")
        # Keep using old cache if refresh fails

    return _pricing_cache


def get_model_pricing(model: str) -> Tuple[float, float]:
    """
    Get pricing for a given model from OpenRouter.

    Args:
        model: Model identifier (e.g., "openai/gpt-4o", "anthropic/claude-3-5-sonnet")

    Returns:
        Tuple of (input_price_per_token, output_price_per_token)
    """
    pricing_cache = get_cached_pricing()

    if model in pricing_cache:
        p = pricing_cache[model]
        return p["input"], p["output"]

    # Try partial match (some models have version suffixes)
    for cached_model, p in pricing_cache.items():
        if model in cached_model or cached_model in model:
            return p["input"], p["output"]

    # Default: free (avoid charging for unknown models)
    return 0.0, 0.0


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> Tuple[float, float, float]:
    """
    Calculate cost for a model invocation using OpenRouter pricing.

    Args:
        model: Model identifier
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens

    Returns:
        Tuple of (input_cost, output_cost, total_cost) in USD
    """
    input_price, output_price = get_model_pricing(model)

    # Price is per token, so multiply directly
    input_cost = input_tokens * input_price
    output_cost = output_tokens * output_price
    total_cost = input_cost + output_cost

    return round(input_cost, 8), round(output_cost, 8), round(total_cost, 8)


def calculate_image_cost(model: str, size: str = "1024x1024", quality: str = "standard") -> float:
    """
    Calculate cost for image generation.

    For image models, OpenRouter uses per-image pricing in the "image" field.
    Falls back to a reasonable default if not found.

    Args:
        model: Model identifier
        size: Image dimensions
        quality: Image quality (standard, hd)

    Returns:
        Total cost in USD
    """
    # Default image pricing (conservative estimate)
    DEFAULT_IMAGE_PRICE = 0.04

    pricing_cache = get_cached_pricing()

    # Image models may have different pricing structure
    # For now, use a sensible default
    # TODO: Parse image-specific pricing from OpenRouter when available

    return DEFAULT_IMAGE_PRICE


async def fetch_generation_cost(generation_id: str, max_retries: int = 3, initial_delay: float = 1.0) -> Optional[float]:
    """
    Fetch the actual cost from OpenRouter's Generation API.

    OpenRouter needs a short delay to process generation data, so we retry
    with exponential backoff if we get a 404.

    Args:
        generation_id: The generation ID returned by the chat completion API
        max_retries: Maximum number of retry attempts (default 3)
        initial_delay: Initial delay in seconds before first retry (default 1.0)

    Returns:
        The total cost in USD, or None if fetch failed
    """
    api_key = get_api_key()
    if not api_key or not generation_id:
        return None

    delay = initial_delay

    for attempt in range(max_retries):
        try:
            # Wait before trying (OpenRouter needs time to process)
            if attempt > 0:
                await asyncio.sleep(delay)
                delay *= 2  # Exponential backoff

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"https://openrouter.ai/api/v1/generation?id={generation_id}",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                    }
                )

                # If 404, retry after delay
                if response.status_code == 404:
                    if attempt < max_retries - 1:
                        print(f"⏳ Generation not ready yet, retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
                        continue
                    else:
                        print(f"⚠️ Generation {generation_id} not found after {max_retries} attempts")
                        return None

                response.raise_for_status()
                data = response.json()

                # The cost is in data.data.total_cost
                total_cost = data.get("data", {}).get("total_cost")
                if total_cost is not None:
                    return float(total_cost)
                return None

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404 and attempt < max_retries - 1:
                print(f"⏳ Generation not ready yet, retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
                continue
            print(f"Error fetching generation cost: {e}")
            return None
        except Exception as e:
            print(f"Error fetching generation cost: {e}")
            return None

    return None


def fetch_generation_cost_sync(generation_id: str) -> Optional[float]:
    """Synchronous wrapper for fetch_generation_cost."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, fetch_generation_cost(generation_id))
                return future.result(timeout=10)
        else:
            return loop.run_until_complete(fetch_generation_cost(generation_id))
    except Exception as e:
        print(f"Error in sync wrapper for generation cost: {e}")
        return None


# Pre-warm cache on module import (in background)
def _prewarm_cache():
    """Pre-warm the pricing cache in background."""
    try:
        get_cached_pricing()
    except Exception:
        pass  # Silently fail on import


# Run prewarm in background thread to avoid blocking import
import threading
_prewarm_thread = threading.Thread(target=_prewarm_cache, daemon=True)
_prewarm_thread.start()
