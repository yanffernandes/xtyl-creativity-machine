"""
Image Generation Service - OpenRouter Integration
Handles image generation using OpenRouter API with support for multiple models
"""

import os
import httpx
import base64
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid
from storage_service import upload_file
from config import get_openrouter_headers

# Fallback default model (used if DB is unavailable)
_DEFAULT_IMAGE_MODEL = "google/gemini-3-pro-image-preview"


def get_default_image_model() -> str:
    """
    Get the configured default image generation model from database.

    Falls back to hardcoded default if database is unavailable.
    """
    try:
        from services.model_config_service import get_default_model
        return get_default_model("image_generation")
    except Exception:
        return _DEFAULT_IMAGE_MODEL


# Export DEFAULT_MODEL for backwards compatibility
DEFAULT_MODEL = _DEFAULT_IMAGE_MODEL

# Cache for models (updated periodically)
_models_cache = None
_models_cache_timestamp = None


async def fetch_openrouter_models() -> List[Dict[str, Any]]:
    """
    Fetch all available image generation models from OpenRouter

    Returns:
        List of models that support image generation
    """
    global _models_cache, _models_cache_timestamp

    # Use cache if less than 1 hour old
    if _models_cache and _models_cache_timestamp:
        if (datetime.utcnow() - _models_cache_timestamp).seconds < 3600:
            return _models_cache

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not configured")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers={
                    "Authorization": f"Bearer {api_key}"
                }
            )
            response.raise_for_status()
            data = response.json()

            # Filter models that support image generation
            # According to OpenRouter docs: models with "image" in architecture.output_modalities
            image_models = []
            for model in data.get("data", []):
                # Check architecture.output_modalities field
                architecture = model.get("architecture", {})
                output_modalities = architecture.get("output_modalities", [])

                # Include models that have "image" in their output_modalities
                if "image" in output_modalities:
                    image_models.append({
                        "id": model["id"],
                        "name": model.get("name", model["id"]),
                        "description": model.get("description", ""),
                        "context_length": model.get("context_length", 0),
                        "pricing": model.get("pricing", {}),
                        "created": model.get("created", 0),
                        "output_modalities": output_modalities
                    })

            # Update cache
            _models_cache = image_models
            _models_cache_timestamp = datetime.utcnow()

            return image_models

    except Exception as e:
        # Return fallback models if API fails
        print(f"Failed to fetch OpenRouter models: {e}")
        return get_fallback_models()


def get_fallback_models() -> List[Dict[str, Any]]:
    """Fallback models in case OpenRouter API is unavailable"""
    return [
        {
            "id": "black-forest-labs/flux-1.1-pro",
            "name": "Flux 1.1 Pro",
            "description": "High-quality image generation with excellent prompt following",
            "pricing": {"prompt": "0.000004", "completion": "0.000004"}
        },
        {
            "id": "black-forest-labs/flux-pro",
            "name": "Flux Pro",
            "description": "Professional-grade image generation",
            "pricing": {"prompt": "0.000005", "completion": "0.000005"}
        },
        {
            "id": "openai/dall-e-3",
            "name": "DALL-E 3",
            "description": "Advanced image generation with natural language understanding",
            "pricing": {"prompt": "0.00004", "completion": "0.00004"}
        },
    ]


async def generate_image_openrouter(
    prompt: str,
    model: str = DEFAULT_MODEL,
    aspect_ratio: str = "1:1",
    quality: str = "standard",
    style: Optional[str] = None,
    base_image_url: Optional[str] = None,
    reference_image_urls: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Generate image using OpenRouter API

    Args:
        prompt: Text description of the image to generate
        model: Full model ID from OpenRouter (e.g., "google/gemini-2.5-flash-image-preview")
        aspect_ratio: Image aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4, etc.) - Gemini format
        quality: Image quality (standard, hd)
        style: Image style (vivid, natural) - for DALL-E 3
        base_image_url: Optional URL of base image for refinement (can be data URL or http URL)
        reference_image_urls: Optional list of reference image URLs for style/context

    Returns:
        Dict with image data, URL, and metadata
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY not configured")

    model_name = model

    # Helper function to convert URL to base64
    async def url_to_base64(url: str) -> str:
        """Convert image URL to base64 data URL"""
        if url.startswith("http://localhost") or url.startswith("http://minio"):
            # Replace localhost with minio service name for internal Docker network
            internal_url = url.replace("localhost:9000", "minio:9000")
            print(f"Converting to base64: {internal_url}")

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(internal_url)
                    response.raise_for_status()
                    image_bytes = response.content

                    # Convert to base64 data URL
                    b64_data = base64.b64encode(image_bytes).decode('utf-8')
                    data_url = f"data:image/png;base64,{b64_data}"
                    print(f"✓ Converted to base64 (length: {len(b64_data)} chars)")
                    return data_url
            except Exception as e:
                print(f"✗ Failed to convert image to base64: {e}")
                raise ValueError(f"Failed to fetch image: {str(e)}")
        return url

    # Build message content with optional images
    message_content = []

    # Add base image if provided (for refinement)
    if base_image_url:
        base_image_url = await url_to_base64(base_image_url)
        message_content.append({
            "type": "image_url",
            "image_url": {"url": base_image_url}
        })

    # Add reference images if provided (for style/context)
    if reference_image_urls:
        print(f"Adding {len(reference_image_urls)} reference images")
        for ref_url in reference_image_urls:
            ref_data_url = await url_to_base64(ref_url)
            message_content.append({
                "type": "image_url",
                "image_url": {"url": ref_data_url}
            })

    # Add text prompt with explicit image generation instruction
    # This helps models like Gemini understand they should generate an image, not text
    image_prompt = f"Generate an image: {prompt}"
    message_content.append({
        "type": "text",
        "text": image_prompt
    })

    # If no images, use simple text format
    if len(message_content) == 1:
        message_content = prompt

    # Build request payload
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": message_content
            }
        ],
        "modalities": ["image", "text"],  # Enable image generation
    }

    # Add model-specific parameters
    if "dall-e" in model:
        # DALL-E uses size parameter (legacy format)
        payload["size"] = aspect_ratio  # For DALL-E, might need conversion
        payload["quality"] = quality
        if style:
            payload["style"] = style
    elif "gemini" in model.lower():
        # Gemini uses image_config with aspect_ratio
        payload["image_config"] = {
            "aspect_ratio": aspect_ratio
        }
    else:
        # For other models (Flux, etc.), try image_config format
        payload["image_config"] = {
            "aspect_ratio": aspect_ratio
        }

    headers = get_openrouter_headers(api_key)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()

            # Extract image from response
            # According to OpenRouter docs: images are in message.images field
            image_url = None
            image_data = None

            if "choices" in data and len(data["choices"]) > 0:
                choice = data["choices"][0]
                message = choice.get("message", {})

                # Check for images field (OpenRouter format)
                images = message.get("images", [])
                if images and len(images) > 0:
                    # Get first image
                    first_image = images[0]
                    if isinstance(first_image, dict):
                        # Format: {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
                        image_url_obj = first_image.get("image_url", {})
                        if isinstance(image_url_obj, dict):
                            image_url = image_url_obj.get("url")
                        else:
                            image_url = image_url_obj

                # Fallback: check content field
                if not image_url:
                    content = message.get("content", "")
                    if isinstance(content, list):
                        for item in content:
                            if isinstance(item, dict):
                                if item.get("type") == "image_url":
                                    image_url = item.get("image_url", {}).get("url")
                                    break

            if not image_url and not image_data:
                # Check if model returned text instead of image
                text_content = None
                if "choices" in data and len(data["choices"]) > 0:
                    text_content = data["choices"][0].get("message", {}).get("content", "")
                    if isinstance(text_content, str) and len(text_content) > 50:
                        # Model returned text instead of generating an image
                        raise ValueError(
                            f"O modelo retornou texto em vez de gerar uma imagem. "
                            f"Isso pode acontecer quando o prompt é muito descritivo ou parece uma pergunta. "
                            f"Tente reformular o prompt para ser mais visual, por exemplo: "
                            f"'Crie uma imagem de...' ou 'Uma ilustração mostrando...'"
                        )
                raise ValueError(f"Nenhuma imagem encontrada na resposta. O modelo pode não suportar geração de imagens.")

            return {
                "image_url": image_url,
                "image_data": image_data,
                "model": model_name,
                "prompt": prompt,
                "aspect_ratio": aspect_ratio,
                "quality": quality,
                "style": style,
                "usage": data.get("usage", {}),
                "raw_response": data
            }

    except httpx.HTTPStatusError as e:
        error_detail = e.response.text
        status_code = e.response.status_code

        # Parse error message for better user feedback
        try:
            error_json = e.response.json()
            error_message = error_json.get("error", {}).get("message", "")

            # Handle specific error codes
            if status_code == 402:
                raise Exception(
                    f"[ERRO 402 - CRÉDITOS INSUFICIENTES]\n\n"
                    f"Seus créditos da OpenRouter acabaram ou são insuficientes.\n\n"
                    f"Detalhes: {error_message}\n\n"
                    f"Por favor:\n"
                    f"1. Acesse: https://openrouter.ai/settings/credits\n"
                    f"2. Adicione mais créditos à sua conta\n"
                    f"3. Tente novamente\n\n"
                    f"Se o problema persistir, entre em contato com o suporte."
                )
            elif status_code == 401:
                raise Exception(
                    f"[ERRO 401 - AUTENTICAÇÃO]\n\n"
                    f"Sua chave da API OpenRouter é inválida ou expirou.\n\n"
                    f"Por favor, verifique a configuração da OPENROUTER_API_KEY."
                )
            elif status_code == 429:
                raise Exception(
                    f"[ERRO 429 - LIMITE DE REQUISIÇÕES]\n\n"
                    f"Você atingiu o limite de requisições.\n\n"
                    f"Aguarde alguns minutos e tente novamente."
                )
            elif status_code >= 500:
                raise Exception(
                    f"[ERRO {status_code} - SERVIDOR]\n\n"
                    f"Erro nos servidores da OpenRouter.\n\n"
                    f"Tente novamente em alguns minutos.\n"
                    f"Se o problema persistir, entre em contato com o suporte."
                )
            else:
                raise Exception(
                    f"[ERRO {status_code}]\n\n"
                    f"{error_message}\n\n"
                    f"Se o problema persistir, entre em contato com o suporte."
                )
        except (KeyError, ValueError):
            # Fallback if can't parse JSON
            raise Exception(
                f"[ERRO {status_code}]\n\n"
                f"Ocorreu um erro ao gerar a imagem.\n\n"
                f"Detalhes técnicos: {error_detail}\n\n"
                f"Entre em contato com o suporte se o problema persistir."
            )
    except Exception as e:
        # Re-raise if it's already our formatted error
        if "[ERRO" in str(e):
            raise
        raise Exception(f"Falha ao gerar imagem: {str(e)}")


async def download_and_store_image(
    image_url: str,
    project_id: str,
    filename: Optional[str] = None
) -> Dict[str, str]:
    """
    Download image from URL or process base64 data URL and store in MinIO

    Args:
        image_url: URL of the image to download or base64 data URL
        project_id: Project ID for organizing storage
        filename: Optional custom filename

    Returns:
        Dict with file_url and thumbnail_url
    """
    if not filename:
        filename = f"generated_{uuid.uuid4().hex}.png"

    try:
        # Check if it's a base64 data URL
        if image_url.startswith("data:"):
            # Extract base64 data from data URL
            # Format: data:image/png;base64,iVBORw0KGgo...
            if "base64," in image_url:
                base64_data = image_url.split("base64,")[1]
                image_bytes = base64.b64decode(base64_data)
            else:
                raise ValueError("Invalid data URL format")
        else:
            # Download from regular URL
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(image_url)
                response.raise_for_status()
                image_bytes = response.content

        # Upload to MinIO
        file_path = f"projects/{project_id}/images/{filename}"
        file_url = upload_file(
            file_data=image_bytes,
            file_name=filename,
            content_type="image/png",
            folder=f"projects/{project_id}/images"
        )

        # TODO: Generate thumbnail (for now, use same URL)
        thumbnail_url = file_url

        return {
            "file_url": file_url,
            "thumbnail_url": thumbnail_url
        }

    except Exception as e:
        raise Exception(f"Failed to download and store image: {str(e)}")


async def store_base64_image(
    image_data: str,
    project_id: str,
    filename: Optional[str] = None
) -> Dict[str, str]:
    """
    Store base64-encoded image in MinIO

    Args:
        image_data: Base64-encoded image data
        project_id: Project ID for organizing storage
        filename: Optional custom filename

    Returns:
        Dict with file_url and thumbnail_url
    """
    if not filename:
        filename = f"generated_{uuid.uuid4().hex}.png"

    try:
        # Decode base64
        if "," in image_data:
            # Remove data:image/png;base64, prefix if present
            image_data = image_data.split(",")[1]

        image_bytes = base64.b64decode(image_data)

        # Upload to MinIO
        file_path = f"projects/{project_id}/images/{filename}"
        file_url = upload_file(
            file_data=image_bytes,
            file_name=filename,
            content_type="image/png",
            folder=f"projects/{project_id}/images"
        )

        # TODO: Generate thumbnail (for now, use same URL)
        thumbnail_url = file_url

        return {
            "file_url": file_url,
            "thumbnail_url": thumbnail_url
        }

    except Exception as e:
        raise Exception(f"Failed to store base64 image: {str(e)}")


async def generate_and_store_image(
    prompt: str,
    project_id: str,
    model: str = DEFAULT_MODEL,
    aspect_ratio: str = "1:1",
    quality: str = "standard",
    style: Optional[str] = None,
    filename: Optional[str] = None,
    base_image_url: Optional[str] = None,
    reference_image_urls: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Complete workflow: Generate image and store in MinIO

    Args:
        prompt: Text description of the image to generate
        project_id: Project ID for organizing storage
        model: Model identifier
        aspect_ratio: Image aspect ratio (1:1, 16:9, 9:16, etc.)
        quality: Image quality
        style: Image style (for DALL-E 3)
        filename: Optional custom filename
        base_image_url: Optional URL of base image for refinement
        reference_image_urls: Optional list of reference image URLs for style/context

    Returns:
        Dict with file_url, thumbnail_url, and generation metadata
    """
    # Generate image
    result = await generate_image_openrouter(
        prompt=prompt,
        model=model,
        aspect_ratio=aspect_ratio,
        quality=quality,
        style=style,
        base_image_url=base_image_url,
        reference_image_urls=reference_image_urls
    )

    # Store image
    if result.get("image_url"):
        storage_result = await download_and_store_image(
            image_url=result["image_url"],
            project_id=project_id,
            filename=filename
        )
    elif result.get("image_data"):
        storage_result = await store_base64_image(
            image_data=result["image_data"],
            project_id=project_id,
            filename=filename
        )
    else:
        raise ValueError("No image data to store")

    # Combine results
    return {
        "file_url": storage_result["file_url"],
        "thumbnail_url": storage_result["thumbnail_url"],
        "generation_metadata": {
            "model": result["model"],
            "prompt": result["prompt"],
            "aspect_ratio": result["aspect_ratio"],
            "quality": result["quality"],
            "style": result["style"],
            "generated_at": datetime.utcnow().isoformat(),
            "usage": result.get("usage", {}),
        },
        "generation_id": result.get("raw_response", {}).get("id")  # For cost tracking
    }


async def get_available_models() -> List[Dict[str, Any]]:
    """
    Get list of available fal.ai image generation models.

    Feature 029: Returns ONLY fal.ai models (no OpenRouter).
    Follows CLAUDE.md "No Hardcoded Data" principle.

    Returns:
        List of dicts with model info
    """
    # fal.ai models - these are the API endpoints we support
    return [
        {
            "id": "fal-ai/flux-pro/v1.1",
            "name": "FLUX Pro 1.1",
            "description": "State-of-the-art image generation",
            "capabilities": ["generation"],
            "recommended_for": ["high quality", "fast generation", "photorealistic"]
        },
        {
            "id": "fal-ai/flux-pro/v1/fill",
            "name": "FLUX Fill Pro",
            "description": "Precise inpainting with mask-based editing",
            "capabilities": ["inpainting"],
            "recommended_for": ["inpainting", "mask editing", "precise control"]
        },
        {
            "id": "fal-ai/flux-pro/kontext",
            "name": "FLUX Kontext",
            "description": "Natural language image editing",
            "capabilities": ["editing"],
            "recommended_for": ["natural editing", "contextual changes", "instruction-based"]
        },
        {
            "id": "fal-ai/bria-rmbg-2.0",
            "name": "BRIA RMBG 2.0",
            "description": "State-of-the-art background removal",
            "capabilities": ["background_removal"],
            "recommended_for": ["remove background", "transparent PNG", "product photos"]
        },
        {
            "id": "fal-ai/clarity-upscaler",
            "name": "Clarity Upscaler",
            "description": "High-quality image upscaling up to 4x",
            "capabilities": ["upscaling"],
            "recommended_for": ["upscaling", "resolution enhancement", "quality improvement"]
        },
        {
            "id": "fal-ai/aura-sr",
            "name": "Aura SR",
            "description": "AI-powered image enhancement and refinement",
            "capabilities": ["enhancement"],
            "recommended_for": ["enhancement", "detail improvement", "quality boost"]
        }
    ]


# ============================================================================
# IMAGE VARIATION CONFIG (Feature 026 - Smart Image Generation)
# ============================================================================

# Default style modifiers for variations
DEFAULT_VARIATION_MODIFIERS = [
    "versão minimalista e clean, com espaço em branco, tipografia elegante",
    "versão vibrante e impactante, cores saturadas, elementos dinâmicos",
    "versão sofisticada e premium, tons neutros, composição equilibrada"
]


def get_variation_config(db) -> Dict[str, Any]:
    """
    Get image generation variation configuration from system_config.

    Args:
        db: SQLAlchemy database session

    Returns:
        Dict with count, modifiers, and enabled flag
    """
    from models import SystemConfig

    default_config = {
        "count": 2,
        "modifiers": DEFAULT_VARIATION_MODIFIERS,
        "enabled": True
    }

    try:
        config = db.query(SystemConfig).filter(
            SystemConfig.key == "image_generation_default_variations"
        ).first()

        if not config:
            return default_config

        # Parse JSON value
        value = config.value
        if isinstance(value, str):
            import json
            value = json.loads(value)

        return {
            "count": value.get("count", 2),
            "modifiers": value.get("modifiers", DEFAULT_VARIATION_MODIFIERS),
            "enabled": value.get("enabled", True)
        }
    except Exception as e:
        print(f"Error loading variation config: {e}")
        return default_config


async def get_variation_config_async(db) -> Dict[str, Any]:
    """
    Async wrapper for get_variation_config.
    """
    return get_variation_config(db)
