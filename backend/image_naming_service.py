"""
Image Naming Service

Uses a fast, cheap LLM to generate descriptive titles for images
based on the generation prompt.
"""

import os
import httpx
from typing import Optional

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Default model for naming - fast and cheap
DEFAULT_NAMING_MODEL = "openai/gpt-5-nano"


def get_api_key() -> Optional[str]:
    """Get API key at runtime to ensure env vars are loaded."""
    return os.getenv("OPENROUTER_API_KEY")

SYSTEM_PROMPT = """Você é um especialista em nomear arquivos de imagem.
Dado o prompt de geração, crie um título conciso (3-8 palavras) em português.
O título deve ser descritivo e fácil de identificar na lista de arquivos.
NÃO inclua palavras como "imagem", "gerada", "criada", "ilustração".
NÃO use aspas no título.
Apenas retorne o título, sem explicações ou pontuação extra."""


async def generate_image_title(
    prompt: str,
    context: Optional[str] = None,
    model: str = DEFAULT_NAMING_MODEL
) -> str:
    """
    Uses LLM to generate a descriptive and concise title for an image.

    Args:
        prompt: The image generation prompt
        context: Optional context (e.g., project name, document type)
        model: LLM model to use (default: openai/gpt-4.1-nano)

    Returns:
        A concise title (3-8 words) in Portuguese
    """
    api_key = get_api_key()
    if not api_key:
        # Fallback when no API key
        print("[ImageNamingService] No API key found, using fallback title")
        return _fallback_title(prompt)

    user_message = f"Prompt de geração: {prompt}"
    if context:
        user_message += f"\nContexto: {context}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message}
    ]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "https://xtyl.com",
                    "X-Title": "XTYL Creativity Machine"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 50  # Title should be short
                }
            )
            response.raise_for_status()
            data = response.json()

            title = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

            # Clean up the title
            title = title.strip('"\'')  # Remove quotes if present
            title = title.split('\n')[0]  # Take only first line

            if title and len(title) > 3:
                return title
            else:
                return _fallback_title(prompt)

    except Exception as e:
        print(f"[ImageNamingService] Error generating title: {e}")
        return _fallback_title(prompt)


def _fallback_title(prompt: str) -> str:
    """
    Fallback title generation when LLM is unavailable.
    Uses first 50 chars of prompt.
    """
    if len(prompt) > 50:
        return f"{prompt[:47]}..."
    return prompt
