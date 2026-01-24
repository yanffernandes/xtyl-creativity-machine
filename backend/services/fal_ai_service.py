"""
fal.ai Service
Feature 029: Image Studio Evolution - fal.ai Migration

Unified client for all fal.ai image operations:
- Image generation (GPT Image, FLUX, Gemini)
- Inpainting with masks (FLUX Fill Pro)
- Natural language editing (FLUX Kontext)
- Utility functions (remove background, upscale, enhance)
"""

import os
import asyncio
import logging
from typing import Optional, Dict, Any, List
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

logger = logging.getLogger(__name__)

# Configuration
FAL_API_KEY = os.getenv("FAL_API_KEY")
FAL_BASE_URL = "https://queue.fal.run"
FAL_SYNC_URL = "https://fal.run"  # For synchronous requests

# Default models by operation type
DEFAULT_MODELS = {
    "generation": "fal-ai/gpt-image-1.5",
    "inpaint": "fal-ai/flux-pro/v1/fill",
    "edit": "fal-ai/flux-pro/kontext",
    "remove_bg": "fal-ai/bria/background/remove",
    "upscale": "fal-ai/clarity-upscaler",
    "enhance": "fal-ai/clarity-upscaler",
}


class FalAIError(Exception):
    """Base exception for fal.ai errors"""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class FalAIAuthError(FalAIError):
    """Authentication error (401)"""
    pass


class FalAICreditsError(FalAIError):
    """Insufficient credits error (402)"""
    pass


class FalAIRateLimitError(FalAIError):
    """Rate limit error (429)"""
    pass


class FalAIService:
    """
    fal.ai API client with retry logic and error handling.

    Usage:
        service = FalAIService()
        result = await service.generate_image(prompt="A sunset", project_id="...")
        result = await service.inpaint(image_url="...", mask_url="...", prompt="Add tree")
        result = await service.remove_background(image_url="...")
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or FAL_API_KEY
        if not self.api_key:
            logger.warning("FAL_API_KEY not set. fal.ai operations will fail.")

        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(120.0, connect=10.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
        )

    def _headers(self) -> Dict[str, str]:
        """Get authorization headers for fal.ai API"""
        return {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json"
        }

    def _handle_error(self, response: httpx.Response) -> None:
        """Handle HTTP errors from fal.ai API"""
        status = response.status_code

        try:
            error_data = response.json()
            message = error_data.get("message", error_data.get("error", "Unknown error"))
        except Exception:
            message = response.text or f"HTTP {status} error"

        if status == 401:
            logger.error(f"fal.ai auth error: {message}")
            raise FalAIAuthError(
                message="Invalid or missing FAL_API_KEY. Please check your API key.",
                status_code=401,
                details={"original_message": message}
            )
        elif status == 402:
            logger.error(f"fal.ai credits error: {message}")
            raise FalAICreditsError(
                message="Insufficient fal.ai credits. Please add credits to continue.",
                status_code=402,
                details={"original_message": message}
            )
        elif status == 429:
            logger.warning(f"fal.ai rate limit: {message}")
            raise FalAIRateLimitError(
                message="Rate limit exceeded. Please try again later.",
                status_code=429,
                details={"original_message": message}
            )
        else:
            logger.error(f"fal.ai error ({status}): {message}")
            raise FalAIError(
                message=f"fal.ai request failed: {message}",
                status_code=status,
                details={"original_message": message}
            )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        retry=retry_if_exception_type(FalAIRateLimitError),
        reraise=True
    )
    async def _make_request(
        self,
        model: str,
        payload: Dict[str, Any],
        use_queue: bool = True
    ) -> Dict[str, Any]:
        """
        Make a request to fal.ai API with retry logic.

        Args:
            model: Model endpoint (e.g., "fal-ai/flux-pro")
            payload: Request payload
            use_queue: If True, use queue API for async processing

        Returns:
            API response as dict
        """
        base_url = FAL_BASE_URL if use_queue else FAL_SYNC_URL
        url = f"{base_url}/{model}"

        logger.info(f"fal.ai request: {model} (queue={use_queue})")
        logger.debug(f"fal.ai payload: {payload}")

        try:
            response = await self.client.post(
                url,
                headers=self._headers(),
                json=payload
            )

            if response.status_code >= 400:
                self._handle_error(response)

            result = response.json()
            logger.info(f"fal.ai response received for {model}")
            logger.debug(f"fal.ai result: {result}")

            return result

        except httpx.TimeoutException as e:
            logger.error(f"fal.ai timeout for {model}: {e}")
            raise FalAIError(
                message="Request timed out. The operation is taking too long.",
                status_code=504,
                details={"model": model}
            )
        except httpx.RequestError as e:
            logger.error(f"fal.ai network error for {model}: {e}")
            raise FalAIError(
                message="Network error. Please check your connection.",
                status_code=503,
                details={"model": model, "error": str(e)}
            )

    # =========================================================================
    # Image Generation
    # =========================================================================

    async def generate_image(
        self,
        prompt: str,
        model: str = DEFAULT_MODELS["generation"],
        aspect_ratio: str = "1:1",
        num_images: int = 1,
        reference_image_urls: Optional[List[str]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate a new image from a text prompt.

        Args:
            prompt: Text description of the image
            model: Model to use (default: gpt-image-1.5)
            aspect_ratio: Image aspect ratio (1:1, 16:9, 9:16, etc.)
            num_images: Number of images to generate
            reference_image_urls: Optional reference images for style/context

        Returns:
            Dict with "images" list containing generated image URLs
        """
        payload = {
            "prompt": prompt,
            "image_size": aspect_ratio,
            "num_images": num_images,
            **kwargs
        }

        if reference_image_urls:
            payload["image_urls"] = reference_image_urls

        return await self._make_request(model, payload)

    # =========================================================================
    # Inpainting (Mask-based editing)
    # =========================================================================

    async def inpaint(
        self,
        image_url: str,
        mask_url: str,
        prompt: str,
        model: str = DEFAULT_MODELS["inpaint"],
        guidance_scale: float = 30.0,
        num_inference_steps: int = 50,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Edit an image using a mask (inpainting).
        White areas in mask will be edited, black areas preserved.

        Args:
            image_url: URL of the original image
            mask_url: URL of the mask image (white=edit, black=preserve)
            prompt: What to add/change in the masked area
            model: Model to use (default: FLUX Fill Pro)
            guidance_scale: How closely to follow the prompt (1-50)
            num_inference_steps: Number of denoising steps (10-100)

        Returns:
            Dict with "images" list containing edited image URLs
        """
        payload = {
            "image_url": image_url,
            "mask_url": mask_url,
            "prompt": prompt,
            "guidance_scale": guidance_scale,
            "num_inference_steps": num_inference_steps,
            **kwargs
        }

        logger.info(f"Inpainting with prompt: {prompt[:50]}...")
        return await self._make_request(model, payload)

    # =========================================================================
    # Natural Language Editing
    # =========================================================================

    async def edit(
        self,
        image_url: str,
        prompt: str,
        model: str = DEFAULT_MODELS["edit"],
        preserve_elements: Optional[List[str]] = None,
        guidance_scale: float = 3.5,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Edit an image using natural language instructions.

        Args:
            image_url: URL of the image to edit
            prompt: Natural language editing instruction
            model: Model to use (default: FLUX Kontext)
            preserve_elements: Elements to keep unchanged (e.g., ["face", "clothing"])
            guidance_scale: How closely to follow the prompt

        Returns:
            Dict with "images" list containing edited image URLs
        """
        # Build enhanced prompt with preservation instructions
        enhanced_prompt = prompt
        if preserve_elements:
            elements = ", ".join(preserve_elements)
            enhanced_prompt = f"{prompt}, while preserving the {elements}"

        payload = {
            "image_url": image_url,
            "prompt": enhanced_prompt,
            "guidance_scale": guidance_scale,
            **kwargs
        }

        logger.info(f"Editing image with prompt: {prompt[:50]}...")
        return await self._make_request(model, payload)

    # =========================================================================
    # Utility Functions
    # =========================================================================

    async def remove_background(
        self,
        image_url: str,
        model: str = DEFAULT_MODELS["remove_bg"],
        output_format: str = "png",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Remove the background from an image.

        Args:
            image_url: URL of the image
            model: Model to use (default: Bria RMBG 2.0)
            output_format: Output format (png for transparency, webp)

        Returns:
            Dict with "image" containing the result URL
        """
        payload = {
            "image_url": image_url,
            **kwargs
        }

        logger.info(f"Removing background from image")
        return await self._make_request(model, payload)

    async def upscale(
        self,
        image_url: str,
        scale_factor: float = 2.0,
        model: str = DEFAULT_MODELS["upscale"],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Upscale an image to higher resolution.

        Args:
            image_url: URL of the image
            scale_factor: Scale factor (2 or 4)
            model: Model to use (default: Clarity Upscaler)

        Returns:
            Dict with "image" containing the upscaled image URL
        """
        payload = {
            "image_url": image_url,
            "scale": scale_factor,
            # Clarity upscaler specific options
            "prompt": "masterpiece, best quality, highres",
            "negative_prompt": "blur, noise, artifacts, low quality",
            **kwargs
        }

        logger.info(f"Upscaling image by {scale_factor}x")
        return await self._make_request(model, payload)

    async def enhance(
        self,
        image_url: str,
        enhancement_type: str = "auto",
        model: str = DEFAULT_MODELS["enhance"],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Enhance image quality (sharpness, colors, details).

        Args:
            image_url: URL of the image
            enhancement_type: Type of enhancement (auto, faces, details, colors)
            model: Model to use

        Returns:
            Dict with "image" containing the enhanced image URL
        """
        # Build enhancement prompt based on type
        enhancement_prompts = {
            "auto": "enhance image quality, improve sharpness and colors",
            "faces": "enhance facial details, improve skin texture and clarity",
            "details": "enhance fine details, improve texture and sharpness",
            "colors": "enhance color vibrancy and contrast"
        }

        payload = {
            "image_url": image_url,
            "scale": 1.0,  # No upscaling, just enhancement
            "prompt": enhancement_prompts.get(enhancement_type, enhancement_prompts["auto"]),
            "negative_prompt": "blur, noise, artifacts, oversaturation",
            **kwargs
        }

        logger.info(f"Enhancing image with type: {enhancement_type}")
        return await self._make_request(model, payload)

    # =========================================================================
    # Cleanup
    # =========================================================================

    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


# Singleton instance for convenience
fal_service = FalAIService()
