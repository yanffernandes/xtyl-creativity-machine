import os
import httpx
from typing import List, Dict, Any
from fastapi import HTTPException

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

async def list_models():
    """
    Fetch available models from OpenRouter with pricing information.
    Returns models with id, name, and pricing data.
    """
    if not OPENROUTER_API_KEY:
        # Return a default list if no key is present (for dev/testing without key)
        return [
            {
                "id": "openai/gpt-3.5-turbo",
                "name": "GPT-3.5 Turbo",
                "pricing": {"prompt": "0.0005", "completion": "0.0015"}
            },
            {
                "id": "openai/gpt-4",
                "name": "GPT-4",
                "pricing": {"prompt": "0.03", "completion": "0.06"}
            },
            {
                "id": "anthropic/claude-2",
                "name": "Claude 2",
                "pricing": {"prompt": "0.008", "completion": "0.024"}
            },
            {
                "id": "meta-llama/llama-2-70b-chat",
                "name": "Llama 2 70B",
                "pricing": {"prompt": "0.0007", "completion": "0.0009"}
            },
        ]

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{OPENROUTER_BASE_URL}/models",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://xtyl.com", # Required by OpenRouter
                    "X-Title": "XTYL Creativity Machine"
                }
            )
            response.raise_for_status()
            data = response.json()
            # OpenRouter returns models with full data including pricing
            return data.get("data", [])
        except Exception as e:
            print(f"Error fetching models: {e}")
            # Fallback
            return [
                {
                    "id": "openai/gpt-3.5-turbo",
                    "name": "GPT-3.5 Turbo",
                    "pricing": {"prompt": "0.0005", "completion": "0.0015"}
                },
                {
                    "id": "openai/gpt-4",
                    "name": "GPT-4",
                    "pricing": {"prompt": "0.03", "completion": "0.06"}
                },
            ]

async def chat_completion(
    messages: List[Dict[str, str]],
    model: str = "openai/gpt-3.5-turbo",
    temperature: float = 0.7,
    tools: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send a chat completion request to OpenRouter.
    """
    if not OPENROUTER_API_KEY:
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
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://xtyl.com",
                    "X-Title": "XTYL Creativity Machine",
                    "Content-Type": "application/json"
                },
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
    if not OPENROUTER_API_KEY:
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

    async with httpx.AsyncClient(timeout=300.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://xtyl.com",
                    "X-Title": "XTYL Creativity Machine",
                    "Content-Type": "application/json"
                },
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
            print(f"OpenRouter API Error: {e.response.text if hasattr(e.response, 'text') else e}")
            raise HTTPException(status_code=e.response.status_code if hasattr(e.response, 'status_code') else 500,
                              detail=f"OpenRouter API Error")
        except Exception as e:
            print(f"Error calling OpenRouter: {e}")
            raise HTTPException(status_code=500, detail=str(e))
