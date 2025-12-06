"""
Vision service for processing images with AI models
Supports multiple providers with automatic fallback
"""
import os
from typing import Optional, List, Dict, Any
import anthropic
from image_service import image_service

# API configuration - Priority order
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Fallback default model (used if DB is unavailable)
_DEFAULT_VISION_MODEL = "openai/gpt-5-nano"


def get_default_vision_model() -> str:
    """
    Get the configured default vision model from database.

    Falls back to hardcoded default if database is unavailable.
    """
    try:
        from services.model_config_service import get_default_model
        return get_default_model("vision")
    except Exception:
        return _DEFAULT_VISION_MODEL


# Model selection - use configured default or env var override
VISION_MODEL = os.getenv("VISION_MODEL", _DEFAULT_VISION_MODEL)
# Options:
# - "openai/gpt-5-nano" (via OpenRouter) ⭐ DEFAULT - fast and accurate


class VisionService:
    """Service for analyzing images with AI vision models"""

    def __init__(self):
        self.client = None
        self.provider = None
        self.model = VISION_MODEL

        # OpenRouter is ALWAYS the priority (system default)
        # All models go through OpenRouter using OpenAI SDK format
        if OPENROUTER_API_KEY:
            try:
                from openai import OpenAI
                self.client = OpenAI(
                    api_key=OPENROUTER_API_KEY,
                    base_url="https://openrouter.ai/api/v1"
                )
                self.provider = "openrouter"
                print(f"✓ Vision service initialized: OpenRouter ({self.model})")
            except ImportError:
                print("⚠ OpenAI library not installed. Install with: pip install openai")

        elif OPENAI_API_KEY:
            # Fallback to native OpenAI if no OpenRouter key
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=OPENAI_API_KEY)
                self.provider = "openai"
                print(f"✓ Vision service initialized: OpenAI Direct ({self.model})")
            except ImportError:
                print("⚠ OpenAI library not installed. Install with: pip install openai")

        elif ANTHROPIC_API_KEY:
            # Fallback to Anthropic if no other keys
            self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            self.provider = "anthropic"
            # Override model to Claude if using Anthropic directly
            self.model = "claude-3-haiku-20240307"
            print(f"✓ Vision service initialized: Anthropic Direct ({self.model})")

        else:
            print("⚠ No vision API key configured. Vision features disabled.")

    def analyze_image(
        self,
        image_path: str,
        prompt: str = "Describe this image in detail.",
        max_tokens: int = 1024
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze an image using AI vision

        Args:
            image_path: Path to the image file
            prompt: The question/instruction for the AI
            max_tokens: Maximum tokens in response

        Returns:
            Dictionary with analysis results or None if failed
        """
        if not self.client:
            return {
                "success": False,
                "error": "No vision API configured"
            }

        # Convert image to base64
        image_base64 = image_service.image_to_base64(image_path)
        if not image_base64:
            return {
                "success": False,
                "error": "Failed to convert image to base64"
            }

        # Get image format
        import os
        ext = os.path.splitext(image_path)[1].lower()
        media_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        media_type = media_type_map.get(ext, 'image/jpeg')

        try:
            if self.provider == "anthropic":
                # Claude/Anthropic format (fallback only)
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": image_base64,
                                    },
                                },
                                {
                                    "type": "text",
                                    "text": prompt
                                }
                            ],
                        }
                    ],
                )

                return {
                    "success": True,
                    "analysis": response.content[0].text,
                    "model": self.model,
                    "provider": self.provider,
                    "usage": {
                        "input_tokens": response.usage.input_tokens,
                        "output_tokens": response.usage.output_tokens,
                    }
                }

            else:
                # OpenAI format - works for OpenRouter (default) and native OpenAI
                response = self.client.chat.completions.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{media_type};base64,{image_base64}"
                                    }
                                }
                            ]
                        }
                    ]
                )

                return {
                    "success": True,
                    "analysis": response.choices[0].message.content,
                    "model": self.model,
                    "provider": self.provider,
                    "usage": {
                        "input_tokens": response.usage.prompt_tokens if response.usage else 0,
                        "output_tokens": response.usage.completion_tokens if response.usage else 0,
                    }
                }

        except Exception as e:
            print(f"Vision analysis failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def analyze_images_batch(
        self,
        image_paths: List[str],
        prompt: str = "Describe these images.",
        max_tokens: int = 2048
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze multiple images in a single request
        Note: Only supported by Anthropic models

        Args:
            image_paths: List of paths to image files
            prompt: The question/instruction for the AI
            max_tokens: Maximum tokens in response

        Returns:
            Dictionary with analysis results or None if failed
        """
        if not self.client or self.provider not in ["anthropic", "openrouter"]:
            return {
                "success": False,
                "error": "Batch analysis only supported with Claude models"
            }

        # Build content array with multiple images
        content = []

        for image_path in image_paths:
            image_base64 = image_service.image_to_base64(image_path)
            if not image_base64:
                continue

            ext = os.path.splitext(image_path)[1].lower()
            media_type = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            }.get(ext, 'image/jpeg')

            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": media_type,
                    "data": image_base64,
                },
            })

        # Add text prompt at the end
        content.append({
            "type": "text",
            "text": prompt
        })

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[
                    {
                        "role": "user",
                        "content": content,
                    }
                ],
            )

            return {
                "success": True,
                "analysis": response.content[0].text,
                "model": self.model,
                "provider": self.provider,
                "images_analyzed": len(image_paths),
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                }
            }

        except Exception as e:
            print(f"Batch vision analysis failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def extract_structured_data(
        self,
        image_path: str,
        data_schema: str,
        max_tokens: int = 1024
    ) -> Optional[Dict[str, Any]]:
        """
        Extract structured data from an image (e.g., forms, receipts, charts)

        Args:
            image_path: Path to the image file
            data_schema: Description of the data structure to extract
            max_tokens: Maximum tokens in response

        Returns:
            Dictionary with extracted data or None if failed
        """
        prompt = f"""Analyze this image and extract the following structured data:

{data_schema}

Return the data in a clear, structured format."""

        return self.analyze_image(image_path, prompt, max_tokens)


    async def analyze_image_from_url(
        self,
        image_url: str,
        prompt: str = "Describe this image in detail.",
        max_tokens: int = 1024
    ) -> Dict[str, Any]:
        """
        Analyze an image from URL using AI vision.
        Downloads the image, converts to base64, and sends to vision API.

        Args:
            image_url: URL of the image to analyze (http/https or data URL)
            prompt: The question/instruction for the AI
            max_tokens: Maximum tokens in response

        Returns:
            Dictionary with analysis results
        """
        import httpx
        import base64

        if not self.client:
            return {
                "success": False,
                "error": "No vision API configured"
            }

        try:
            # Handle data URLs directly
            if image_url.startswith("data:"):
                data_url = image_url
                # Extract media type from data URL
                if "image/png" in image_url:
                    media_type = "image/png"
                elif "image/jpeg" in image_url or "image/jpg" in image_url:
                    media_type = "image/jpeg"
                elif "image/webp" in image_url:
                    media_type = "image/webp"
                elif "image/gif" in image_url:
                    media_type = "image/gif"
                else:
                    media_type = "image/png"
            else:
                # Fetch image from URL
                # Handle internal URLs (minio/localhost)
                fetch_url = image_url
                if "localhost:9000" in image_url:
                    fetch_url = image_url.replace("localhost:9000", "minio:9000")

                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(fetch_url)
                    response.raise_for_status()
                    image_bytes = response.content

                # Determine media type from content-type header or URL
                content_type = response.headers.get("content-type", "image/png")
                if "jpeg" in content_type or "jpg" in content_type:
                    media_type = "image/jpeg"
                elif "png" in content_type:
                    media_type = "image/png"
                elif "webp" in content_type:
                    media_type = "image/webp"
                elif "gif" in content_type:
                    media_type = "image/gif"
                else:
                    # Fallback to URL extension
                    if image_url.lower().endswith(('.jpg', '.jpeg')):
                        media_type = "image/jpeg"
                    elif image_url.lower().endswith('.webp'):
                        media_type = "image/webp"
                    elif image_url.lower().endswith('.gif'):
                        media_type = "image/gif"
                    else:
                        media_type = "image/png"

                # Convert to base64 data URL
                b64_data = base64.b64encode(image_bytes).decode('utf-8')
                data_url = f"data:{media_type};base64,{b64_data}"

            # Call vision API using OpenAI format (works for OpenRouter)
            if self.provider == "anthropic":
                # Extract base64 from data URL for Anthropic
                if ";base64," in data_url:
                    image_base64 = data_url.split(";base64,")[1]
                else:
                    return {"success": False, "error": "Invalid data URL format"}

                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": media_type,
                                        "data": image_base64,
                                    },
                                },
                                {
                                    "type": "text",
                                    "text": prompt
                                }
                            ],
                        }
                    ],
                )

                return {
                    "success": True,
                    "analysis": response.content[0].text,
                    "model": self.model,
                    "provider": self.provider,
                    "usage": {
                        "input_tokens": response.usage.input_tokens,
                        "output_tokens": response.usage.output_tokens,
                    }
                }
            else:
                # OpenAI/OpenRouter format
                response = self.client.chat.completions.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": data_url
                                    }
                                }
                            ]
                        }
                    ]
                )

                return {
                    "success": True,
                    "analysis": response.choices[0].message.content,
                    "model": self.model,
                    "provider": self.provider,
                    "usage": {
                        "input_tokens": response.usage.prompt_tokens if response.usage else 0,
                        "output_tokens": response.usage.completion_tokens if response.usage else 0,
                    }
                }

        except httpx.HTTPStatusError as e:
            return {
                "success": False,
                "error": f"Failed to fetch image: HTTP {e.response.status_code}"
            }
        except httpx.RequestError as e:
            return {
                "success": False,
                "error": f"Failed to fetch image: {str(e)}"
            }
        except Exception as e:
            print(f"Vision analysis from URL failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
vision_service = VisionService()
