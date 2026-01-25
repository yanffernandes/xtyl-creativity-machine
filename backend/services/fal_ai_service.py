"""
fal.ai Service
Feature 029: Image Studio Evolution - fal.ai Migration

Unified client for all fal.ai image operations with 8 hardcoded models:
- 4 text-to-image models (GPT-Image 1.5, Gemini 3 Pro, Gemini 2.5 Flash, Seedream 4.5)
- 4 image-to-image/edit models (same providers with /edit suffix)

Only GPT-Image 1.5/edit supports mask_image_url for inpainting.
"""

import os
import asyncio
import logging
from typing import Optional, Dict, Any, List, Literal
from dataclasses import dataclass, field
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

logger = logging.getLogger(__name__)

# Configuration
FAL_API_KEY = os.getenv("FAL_API_KEY")
FAL_BASE_URL = "https://queue.fal.run"
FAL_SYNC_URL = "https://fal.run"  # For synchronous requests


# ============================================================================
# MODEL CONFIGURATION (8 hardcoded models)
# ============================================================================

ModelType = Literal["text-to-image", "image-to-image"]


@dataclass
class ModelConfig:
    """Configuration for a fal.ai model"""
    id: str
    name: str
    description: str
    provider: str
    model_type: ModelType
    supports_mask: bool = False
    max_images: int = 4
    default_params: Dict[str, Any] = field(default_factory=dict)


# Text-to-image models (no reference image required)
GEMINI_3_PRO_TEXT = ModelConfig(
    id="fal-ai/gemini-3-pro-image-preview",
    name="Gemini 3 Pro",
    description="Advanced Google model with spatial and semantic reasoning",
    provider="Google",
    model_type="text-to-image",
    supports_mask=False,
    max_images=4,
    default_params={
        "num_images": 1,
        "aspect_ratio": "1:1",
        "resolution": "1K",
    }
)

GEMINI_25_FLASH_TEXT = ModelConfig(
    id="fal-ai/gemini-25-flash-image",
    name="Gemini 2.5 Flash",
    description="Fast Google model with multi-image reasoning",
    provider="Google",
    model_type="text-to-image",
    supports_mask=False,
    max_images=4,
    default_params={
        "num_images": 1,
        "aspect_ratio": "1:1",
    }
)

GPT_IMAGE_15_TEXT = ModelConfig(
    id="fal-ai/gpt-image-1.5",
    name="GPT-Image 1.5",
    description="OpenAI multimodal model with high fidelity",
    provider="OpenAI",
    model_type="text-to-image",
    supports_mask=False,
    max_images=4,
    default_params={
        "num_images": 1,
        "image_size": "1024x1024",
        "quality": "medium",
        "background": "auto",
    }
)

SEEDREAM_45_TEXT = ModelConfig(
    id="fal-ai/bytedance/seedream/v4.5/text-to-image",
    name="Seedream 4.5",
    description="Bytedance model optimized for speed and quality",
    provider="Bytedance",
    model_type="text-to-image",
    supports_mask=False,
    max_images=6,
    default_params={
        "num_images": 1,
        "image_size": "square",  # Seedream uses named presets: square, square_hd, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9, auto_2K, auto_4K
        "enable_safety_checker": True,
    }
)

# Image-to-image / Edit models (require reference image)
GEMINI_3_PRO_EDIT = ModelConfig(
    id="fal-ai/gemini-3-pro-image-preview/edit",
    name="Gemini 3 Pro Edit",
    description="Advanced editing with spatial understanding",
    provider="Google",
    model_type="image-to-image",
    supports_mask=False,
    max_images=4,
    default_params={
        "num_images": 1,
        "aspect_ratio": "1:1",
        "resolution": "1K",
    }
)

GEMINI_25_FLASH_EDIT = ModelConfig(
    id="fal-ai/gemini-25-flash-image/edit",
    name="Gemini 2.5 Flash Edit",
    description="Fast editing with multi-image reasoning",
    provider="Google",
    model_type="image-to-image",
    supports_mask=False,
    max_images=4,
    default_params={
        "num_images": 1,
        "aspect_ratio": "1:1",
    }
)

GPT_IMAGE_15_EDIT = ModelConfig(
    id="fal-ai/gpt-image-1.5/edit",
    name="GPT-Image 1.5 Edit",
    description="High fidelity editing - SUPPORTS MASK (brush)",
    provider="OpenAI",
    model_type="image-to-image",
    supports_mask=True,  # ONLY model that supports mask_image_url
    max_images=4,
    default_params={
        "num_images": 1,
        "image_size": "1024x1024",
        "quality": "medium",
        "input_fidelity": "high",
    }
)

SEEDREAM_45_EDIT = ModelConfig(
    id="fal-ai/bytedance/seedream/v4.5/edit",
    name="Seedream 4.5 Edit",
    description="Fast editing with up to 10 reference images",
    provider="Bytedance",
    model_type="image-to-image",
    supports_mask=False,
    max_images=6,
    default_params={
        "num_images": 1,
        "image_size": "square",  # Seedream uses named presets: square, square_hd, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9, auto_2K, auto_4K
        "enable_safety_checker": True,
    }
)

# Model collections
TEXT_TO_IMAGE_MODELS = [
    GPT_IMAGE_15_TEXT,
    GEMINI_3_PRO_TEXT,
    GEMINI_25_FLASH_TEXT,
    SEEDREAM_45_TEXT,
]

IMAGE_TO_IMAGE_MODELS = [
    GPT_IMAGE_15_EDIT,
    GEMINI_3_PRO_EDIT,
    GEMINI_25_FLASH_EDIT,
    SEEDREAM_45_EDIT,
]

ALL_MODELS = TEXT_TO_IMAGE_MODELS + IMAGE_TO_IMAGE_MODELS

# Model lookup by ID
MODEL_BY_ID: Dict[str, ModelConfig] = {m.id: m for m in ALL_MODELS}

# Default models
DEFAULT_TEXT_MODEL = GPT_IMAGE_15_TEXT
DEFAULT_EDIT_MODEL = GPT_IMAGE_15_EDIT


def get_model_by_id(model_id: str) -> Optional[ModelConfig]:
    """Get model config by ID"""
    return MODEL_BY_ID.get(model_id)


def get_edit_model(text_model_id: str) -> Optional[ModelConfig]:
    """Get the edit counterpart of a text-to-image model"""
    edit_id = text_model_id if text_model_id.endswith("/edit") else f"{text_model_id}/edit"
    return MODEL_BY_ID.get(edit_id)


def get_text_model(edit_model_id: str) -> Optional[ModelConfig]:
    """Get the text-to-image counterpart of an edit model"""
    text_id = edit_model_id.replace("/edit", "")
    return MODEL_BY_ID.get(text_id)


def model_supports_mask(model_id: str) -> bool:
    """Check if a model supports mask/brush editing"""
    model = get_model_by_id(model_id)
    return model.supports_mask if model else False


def select_appropriate_model(
    has_reference_image: bool,
    preferred_model_id: Optional[str] = None
) -> ModelConfig:
    """
    Get appropriate model based on whether a reference image is provided.

    Args:
        has_reference_image: Whether the user has provided a reference image
        preferred_model_id: Optional preferred model ID

    Returns:
        Appropriate ModelConfig for the use case
    """
    if preferred_model_id:
        model = get_model_by_id(preferred_model_id)
        if model:
            # If model type matches use case, return it
            if has_reference_image and model.model_type == "image-to-image":
                return model
            if not has_reference_image and model.model_type == "text-to-image":
                return model
            # Otherwise, get the counterpart model
            if has_reference_image:
                return get_edit_model(preferred_model_id) or DEFAULT_EDIT_MODEL
            return get_text_model(preferred_model_id) or DEFAULT_TEXT_MODEL

    # Return default based on use case
    return DEFAULT_EDIT_MODEL if has_reference_image else DEFAULT_TEXT_MODEL


# ============================================================================
# EXCEPTIONS
# ============================================================================

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


# ============================================================================
# FAL.AI SERVICE
# ============================================================================

class FalAIService:
    """
    fal.ai API client with retry logic and error handling.

    Usage:
        service = FalAIService()
        result = await service.generate_image(prompt="A sunset", model_id="fal-ai/gpt-image-1.5")
        result = await service.edit_image(image_urls=["..."], prompt="Add tree", model_id="fal-ai/gpt-image-1.5/edit")
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
        model_id: str,
        payload: Dict[str, Any],
        use_queue: bool = True
    ) -> Dict[str, Any]:
        """
        Make a request to fal.ai API with retry logic.

        Args:
            model_id: Model endpoint (e.g., "fal-ai/gpt-image-1.5")
            payload: Request payload
            use_queue: If True, use queue API for async processing

        Returns:
            API response as dict
        """
        base_url = FAL_BASE_URL if use_queue else FAL_SYNC_URL
        url = f"{base_url}/{model_id}"

        logger.info(f"fal.ai request: {model_id} (queue={use_queue})")
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
            logger.info(f"fal.ai response received for {model_id}")
            logger.debug(f"fal.ai result: {result}")

            # If using queue, poll for completion
            if use_queue and result.get("status") in ["IN_QUEUE", "IN_PROGRESS"]:
                status_url = result.get("status_url")
                if not status_url:
                    raise FalAIError("Queue response missing status_url")

                logger.info(f"Polling fal.ai queue: {status_url}")
                result = await self._poll_queue(status_url, max_wait=300)

            return result

        except httpx.TimeoutException as e:
            logger.error(f"fal.ai timeout for {model_id}: {e}")
            raise FalAIError(
                message="Request timed out. The operation is taking too long.",
                status_code=504,
                details={"model": model_id}
            )
        except httpx.RequestError as e:
            logger.error(f"fal.ai network error for {model_id}: {e}")
            raise FalAIError(
                message="Network error. Please check your connection.",
                status_code=503,
                details={"model": model_id, "error": str(e)}
            )

    async def _poll_queue(
        self,
        status_url: str,
        max_wait: int = 300,
        poll_interval: float = 2.0
    ) -> Dict[str, Any]:
        """
        Poll fal.ai queue until job completes.

        Args:
            status_url: URL to poll for status
            max_wait: Maximum time to wait in seconds
            poll_interval: Seconds between polls

        Returns:
            Final result dict

        Raises:
            FalAIError: If polling times out or job fails
        """
        start_time = asyncio.get_event_loop().time()

        while True:
            # Check timeout
            elapsed = asyncio.get_event_loop().time() - start_time
            if elapsed > max_wait:
                raise FalAIError(
                    f"Queue polling timed out after {max_wait}s",
                    status_code=504
                )

            # Poll status
            try:
                response = await self.client.get(
                    status_url,
                    headers=self._headers()
                )

                if response.status_code >= 400:
                    self._handle_error(response)

                status_data = response.json()
                status = status_data.get("status")

                logger.debug(f"Queue status: {status} (elapsed: {elapsed:.1f}s)")

                if status == "COMPLETED":
                    logger.info(f"Queue job completed in {elapsed:.1f}s")
                    logger.info(f"Status data on completion: {status_data}")

                    # Check if result is already in status_data (data, output, or result field)
                    if "data" in status_data or "output" in status_data or "result" in status_data:
                        logger.info("Result found directly in status_data")
                        return status_data

                    # Otherwise, try to fetch from response_url
                    response_url = status_data.get("response_url")
                    if not response_url:
                        logger.warning("No response_url found, returning status_data as-is")
                        return status_data

                    # Fetch result from response_url (publicly accessible, no auth needed)
                    logger.info(f"Fetching result from: {response_url}")
                    result_response = await self.client.get(response_url)

                    logger.info(f"Result fetch status: {result_response.status_code}")

                    if result_response.status_code >= 400:
                        error_body = result_response.text
                        logger.error(f"Failed to fetch result: {result_response.status_code}")
                        logger.error(f"Error body: {error_body}")
                        # Return status_data if response_url fails
                        return status_data

                    final_result = result_response.json()
                    logger.info(f"Successfully fetched result with keys: {list(final_result.keys())}")
                    logger.debug(f"Full result: {final_result}")
                    return final_result

                elif status == "FAILED":
                    error_msg = status_data.get("error", "Unknown error")
                    raise FalAIError(f"Queue job failed: {error_msg}", status_code=500)

                # Still in queue/progress, wait and retry
                await asyncio.sleep(poll_interval)

            except httpx.RequestError as e:
                logger.warning(f"Polling error: {e}, retrying...")
                await asyncio.sleep(poll_interval)

    # =========================================================================
    # UNIFIED IMAGE GENERATION
    # =========================================================================

    async def generate_image(
        self,
        prompt: str,
        model_id: str = DEFAULT_TEXT_MODEL.id,
        image_urls: Optional[List[str]] = None,
        mask_url: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate or edit an image using the specified model.

        This is the unified method that handles both text-to-image and image-to-image.
        The endpoint is automatically selected based on the model type.

        Args:
            prompt: Text description or editing instruction
            model_id: Model to use (e.g., "fal-ai/gpt-image-1.5")
            image_urls: Reference images (required for edit models)
            mask_url: Mask image URL (only for GPT-Image 1.5/edit)
            params: Model-specific parameters (num_images, aspect_ratio, etc.)
            **kwargs: Additional parameters to pass to the model

        Returns:
            Dict with "images" list containing generated image URLs
        """
        # Get model config
        model = get_model_by_id(model_id)
        if not model:
            logger.warning(f"Unknown model {model_id}, using default")
            model = select_appropriate_model(has_reference_image=bool(image_urls))

        # Start with default params for this model
        payload = {**model.default_params}

        # Add prompt
        payload["prompt"] = prompt

        # Add user-specified params
        if params:
            payload.update(params)

        # Add kwargs
        payload.update(kwargs)

        # Add reference images for edit models
        if model.model_type == "image-to-image" and image_urls:
            payload["image_urls"] = image_urls

        # Add mask for GPT-Image edit (only model that supports it)
        if model.supports_mask and mask_url:
            payload["mask_image_url"] = mask_url

        logger.info(f"Generating image with {model.name} ({model_id})")
        return await self._make_request(model_id, payload)

    # =========================================================================
    # CONVENIENCE METHODS (backward compatibility)
    # =========================================================================

    async def inpaint(
        self,
        image_url: str,
        mask_url: str,
        prompt: str,
        model: str = GPT_IMAGE_15_EDIT.id,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Inpaint an image using mask. Only GPT-Image 1.5/edit supports this.

        Args:
            image_url: URL of the original image
            mask_url: URL of the mask image (white=edit, black=preserve)
            prompt: What to add/change in the masked area
            model: Model to use (should be GPT-Image 1.5/edit)

        Returns:
            Dict with generated image URLs
        """
        if not model_supports_mask(model):
            logger.warning(f"Model {model} does not support mask. Using GPT-Image 1.5/edit")
            model = GPT_IMAGE_15_EDIT.id

        return await self.generate_image(
            prompt=prompt,
            model_id=model,
            image_urls=[image_url],
            mask_url=mask_url,
            **kwargs
        )

    async def edit(
        self,
        image_url: str,
        prompt: str,
        model: str = DEFAULT_EDIT_MODEL.id,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Edit an image using natural language instructions (no mask).

        Args:
            image_url: URL of the image to edit
            prompt: Natural language editing instruction
            model: Model to use

        Returns:
            Dict with generated image URLs
        """
        return await self.generate_image(
            prompt=prompt,
            model_id=model,
            image_urls=[image_url],
            **kwargs
        )

    async def remove_background(
        self,
        image_url: str,
        output_format: str = "png",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Remove the background from an image.

        Args:
            image_url: URL of the image
            output_format: Output format (png for transparency, webp)

        Returns:
            Dict with "image" containing the result URL
        """
        payload = {
            "image_url": image_url,
            **kwargs
        }

        logger.info("Removing background from image")
        return await self._make_request("fal-ai/bria/background/remove", payload)

    async def upscale(
        self,
        image_url: str,
        scale_factor: float = 2.0,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Upscale an image to higher resolution.

        Args:
            image_url: URL of the image
            scale_factor: Scale factor (2 or 4)

        Returns:
            Dict with "image" containing the upscaled image URL
        """
        payload = {
            "image_url": image_url,
            "scale": scale_factor,
            "prompt": "masterpiece, best quality, highres",
            "negative_prompt": "blur, noise, artifacts, low quality",
            **kwargs
        }

        logger.info(f"Upscaling image by {scale_factor}x")
        return await self._make_request("fal-ai/clarity-upscaler", payload)

    async def enhance(
        self,
        image_url: str,
        enhancement_type: str = "auto",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Enhance image quality (sharpness, colors, details).

        Args:
            image_url: URL of the image
            enhancement_type: Type of enhancement (auto, faces, details, colors)

        Returns:
            Dict with "image" containing the enhanced image URL
        """
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
        return await self._make_request("fal-ai/clarity-upscaler", payload)

    # =========================================================================
    # CLEANUP
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
