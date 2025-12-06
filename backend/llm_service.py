import os
import httpx
from typing import List, Dict, Any, Optional
from fastapi import HTTPException

from config import get_openrouter_headers

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Default model fallback (used if DB is unavailable)
_DEFAULT_CHAT_MODEL = "anthropic/claude-sonnet-4-20250514"


def get_api_key():
    """Get API key dynamically to ensure .env is loaded"""
    return os.getenv("OPENROUTER_API_KEY")


def get_default_chat_model() -> str:
    """
    Get the configured default chat model from database.

    Falls back to hardcoded default if database is unavailable.
    This function is used by routers to get the default model
    when the user doesn't specify one.
    """
    try:
        from services.model_config_service import get_default_model
        return get_default_model("chat")
    except Exception:
        return _DEFAULT_CHAT_MODEL

async def list_models():
    """
    Fetch available models from OpenRouter with pricing information.
    Returns models with id, name, and pricing data.
    Returns empty list if API key is not configured or API fails.
    """
    api_key = get_api_key()
    if not api_key:
        # Return empty list - frontend will show loading state
        print("Warning: OPENROUTER_API_KEY not configured")
        return []

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{OPENROUTER_BASE_URL}/models",
                headers=get_openrouter_headers(api_key)
            )
            response.raise_for_status()
            data = response.json()
            # OpenRouter returns models with full data including pricing
            return data.get("data", [])
        except Exception as e:
            print(f"Error fetching models from OpenRouter: {e}")
            # Return empty list - frontend will show loading state or retry
            return []


async def list_embedding_models():
    """
    Fetch available embedding models from OpenRouter.
    Uses the dedicated /embeddings/models endpoint.
    Returns empty list if API key is not configured or API fails.
    """
    api_key = get_api_key()
    if not api_key:
        print("Warning: OPENROUTER_API_KEY not configured")
        return []

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{OPENROUTER_BASE_URL}/embeddings/models",
                headers=get_openrouter_headers(api_key)
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
        except Exception as e:
            print(f"Error fetching embedding models from OpenRouter: {e}")
            return []

async def chat_completion(
    messages: List[Dict[str, str]],
    model: str = "openai/gpt-3.5-turbo",
    temperature: float = 0.7,
    tools: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send a chat completion request to OpenRouter.
    """
    api_key = get_api_key()
    if not api_key:
        # Mock response
        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": "I am a mock AI response. Please configure OPENROUTER_API_KEY to get real responses."
                }
            }]
        }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }

    if tools:
        payload["tools"] = tools

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=get_openrouter_headers(api_key),
                json=payload,
                timeout=60.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            print(f"OpenRouter API Error: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"OpenRouter API Error: {e.response.text}")
        except Exception as e:
            print(f"Error calling OpenRouter: {e}")
            raise HTTPException(status_code=500, detail=str(e))


async def chat_completion_stream(
    messages: List[Dict[str, str]],
    model: str = "openai/gpt-3.5-turbo",
    temperature: float = 0.7,
    tools: List[Dict[str, Any]] = None
):
    """
    Send a streaming chat completion request to OpenRouter.
    Yields chunks of text as they arrive from the model.
    """
    api_key = get_api_key()
    if not api_key:
        # Mock streaming response
        yield {
            "choices": [{
                "delta": {
                    "role": "assistant",
                    "content": "I am a mock AI response. "
                }
            }]
        }
        yield {
            "choices": [{
                "delta": {
                    "content": "Please configure OPENROUTER_API_KEY to get real responses."
                }
            }]
        }
        return

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True  # Enable streaming
    }

    if tools:
        payload["tools"] = tools

    # Debug: Log payload for troubleshooting
    import json as json_module
    print(f"🔍 LLM Request Payload (messages count: {len(messages)}):")
    for i, msg in enumerate(messages):
        role = msg.get('role', 'unknown')
        content_preview = str(msg.get('content', ''))[:100]
        has_tool_calls = 'tool_calls' in msg
        tool_call_id = msg.get('tool_call_id', None)
        print(f"  [{i}] role={role}, tool_call_id={tool_call_id}, has_tool_calls={has_tool_calls}, content={content_preview}...")

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers=get_openrouter_headers(api_key),
                json=payload
            ) as response:
                response.raise_for_status()

                # Read SSE stream from OpenRouter
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]  # Remove "data: " prefix

                        if data.strip() == "[DONE]":
                            break

                        try:
                            import json
                            chunk = json.loads(data)
                            yield chunk
                        except json.JSONDecodeError:
                            continue

        except httpx.HTTPStatusError as e:
            # For streaming responses, we need to read the content before accessing it
            error_detail = "OpenRouter API Error"
            status_code = 500
            try:
                if hasattr(e, 'response') and e.response:
                    status_code = e.response.status_code
                    # Try to read the response body for error details
                    try:
                        await e.response.aread()
                        error_detail = e.response.text
                    except Exception:
                        error_detail = str(e)
            except Exception:
                pass
            print(f"OpenRouter API Error: {error_detail}")
            raise HTTPException(status_code=status_code, detail=error_detail)
        except Exception as e:
            print(f"Error calling OpenRouter: {e}")
            raise HTTPException(status_code=500, detail=str(e))
