"""
Audio transcription service using Groq's Whisper API.

This service handles audio transcription by sending audio data to Groq's
whisper-large-v3-turbo model for fast speech-to-text conversion.
"""

import httpx
import os
import time
from typing import Optional

GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
TRANSCRIPTION_MODEL = "whisper-large-v3-turbo"


def get_api_key() -> str:
    """Get Groq API key from environment."""
    return os.getenv("GROQ_API_KEY", "")


async def transcribe_audio(
    audio_data: bytes,
    audio_format: str,
    language_hint: Optional[str] = None
) -> dict:
    """
    Transcribe audio using Groq's Whisper API.

    Args:
        audio_data: Raw audio bytes
        audio_format: MIME type (e.g., "audio/webm")
        language_hint: Optional ISO 639-1 language code (e.g., "pt", "en")

    Returns:
        dict with text, duration_seconds, language, processing_time_ms

    Raises:
        ValueError: If API key is not configured
        httpx.HTTPStatusError: If API request fails
    """
    api_key = get_api_key()
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    start_time = time.time()

    # Determine file extension from MIME type
    format_extensions = {
        "audio/webm": "webm",
        "audio/mp3": "mp3",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/m4a": "m4a",
        "audio/mp4": "mp4",
        "audio/x-m4a": "m4a",
        "audio/ogg": "ogg",
    }
    # Handle MIME types with codecs (e.g., "audio/webm;codecs=opus")
    base_format = audio_format.split(";")[0].strip()
    extension = format_extensions.get(base_format, "webm")

    # Build multipart form data for Groq API
    files = {
        "file": (f"audio.{extension}", audio_data, audio_format),
    }
    data = {
        "model": TRANSCRIPTION_MODEL,
        "response_format": "verbose_json",
    }

    # Add language hint if provided (Groq uses ISO 639-1 codes)
    if language_hint:
        data["language"] = language_hint

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
            },
            files=files,
            data=data
        )
        response.raise_for_status()
        result = response.json()

    processing_time = int((time.time() - start_time) * 1000)

    # Groq returns: text, language, duration, segments, etc.
    transcribed_text = result.get("text", "").strip()
    duration = result.get("duration", 0.0)
    detected_language = result.get("language", language_hint or "auto")

    return {
        "text": transcribed_text,
        "duration_seconds": duration,
        "language": detected_language,
        "processing_time_ms": processing_time
    }
