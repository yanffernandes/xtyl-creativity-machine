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

# Model selection by cost/quality
VISION_MODEL = os.getenv("VISION_MODEL", "claude-3-haiku-20240307")
# Options:
# - "claude-3-5-sonnet-20241022" (best quality, $3/$15)
# - "claude-3-haiku-20240307" (best cost/benefit, $0.25/$1.25) ⭐ RECOMMENDED
# - "gpt-4o" (via OpenRouter, $2.50/$10)
# - "gpt-4o-mini" (via OpenRouter, $0.15/$0.60)
# - "google/gemini-flash-1.5" (via OpenRouter, $0.075/$0.30)

class VisionService:
    """Service for analyzing images with AI vision models"""

    def __init__(self):
        self.client = None
        self.provider = None
        self.model = VISION_MODEL

        # Initialize based on available API keys
        if ANTHROPIC_API_KEY and "claude" in self.model.lower():
            self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            self.provider = "anthropic"
            print(f"✓ Vision service initialized: Anthropic Direct ({self.model})")

        elif OPENROUTER_API_KEY:
            # OpenRouter supports multiple models
            self.client = anthropic.Anthropic(
                api_key=OPENROUTER_API_KEY,
                base_url="https://openrouter.ai/api/v1"
            )
            self.provider = "openrouter"
            print(f"✓ Vision service initialized: OpenRouter ({self.model})")

        elif OPENAI_API_KEY and "gpt" in self.model.lower():
            # Native OpenAI for GPT models
            try:
                from openai import OpenAI
                self.client = OpenAI(api_key=OPENAI_API_KEY)
                self.provider = "openai"
                print(f"✓ Vision service initialized: OpenAI ({self.model})")
            except ImportError:
                print("⚠ OpenAI library not installed. Install with: pip install openai")

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
            if self.provider in ["anthropic", "openrouter"]:
                # Claude/Anthropic format
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

            elif self.provider == "openai":
                # OpenAI format (GPT-4V)
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
                        "input_tokens": response.usage.prompt_tokens,
                        "output_tokens": response.usage.completion_tokens,
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


# Singleton instance
vision_service = VisionService()
