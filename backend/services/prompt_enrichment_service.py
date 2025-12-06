"""
Prompt Enrichment Service (Feature 016 - V1 Polish)

This service enriches user prompts for image generation with:
1. Brand context (color palette, typography, visual style) when available
2. Best practices for image generation prompts
3. Technical specifications for better results

The model used is configurable via the admin panel (prompt_enrichment model type).
"""

import os
import time
import asyncio
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

import httpx
from sqlalchemy.orm import Session

from config import get_openrouter_headers
from services.model_config_service import ModelConfigService


@dataclass
class BrandContext:
    """Brand context extracted from project settings."""
    color_palette: List[str]  # HEX colors
    typography_primary: Optional[str]
    typography_secondary: Optional[str]
    typography_tertiary: Optional[str]

    @classmethod
    def from_project_settings(cls, settings: Optional[Dict[str, Any]]) -> Optional["BrandContext"]:
        """Create BrandContext from project settings dict."""
        if not settings:
            return None

        brand_identity = settings.get("brand_identity")
        if not brand_identity:
            return None

        color_palette = brand_identity.get("color_palette", [])
        typography = brand_identity.get("typography", {}) or {}

        # Only return if we have at least some brand context
        if not color_palette and not typography:
            return None

        return cls(
            color_palette=color_palette or [],
            typography_primary=typography.get("primary"),
            typography_secondary=typography.get("secondary"),
            typography_tertiary=typography.get("tertiary"),
        )

    def to_context_string(self) -> str:
        """Convert brand context to a string for prompt injection."""
        parts = []

        if self.color_palette:
            colors = ", ".join(self.color_palette[:6])  # Max 6 colors
            parts.append(f"Use this color palette as reference: {colors}")

        fonts = []
        if self.typography_primary:
            fonts.append(f"primary: {self.typography_primary}")
        if self.typography_secondary:
            fonts.append(f"secondary: {self.typography_secondary}")

        if fonts:
            parts.append(f"Typography style: {', '.join(fonts)}")

        return "; ".join(parts) if parts else ""


# System prompt for the enrichment model
ENRICHMENT_SYSTEM_PROMPT = """You are an expert prompt engineer specializing in AI image generation. Your task is to enhance user prompts to produce higher quality, more professional images.

## Your Role
Take a simple user prompt and expand it with:
1. Technical details (lighting, composition, perspective)
2. Style specifications (artistic style, mood, atmosphere)
3. Quality descriptors (high resolution, professional, detailed)
4. Any provided brand context (colors, fonts, visual style)

## Guidelines
- Keep the original intent and subject matter
- Add 2-3 relevant technical/style improvements
- Incorporate brand colors naturally if provided
- Keep the enhanced prompt concise (under 300 words)
- Output ONLY the enhanced prompt, no explanations

## Examples
User: "A coffee cup on a table"
Enhanced: "A steaming artisanal coffee cup on a rustic wooden table, morning light streaming through window, soft bokeh background, professional food photography, warm earthy tones, high detail, 4K quality"

User: "Company logo for tech startup"
Enhanced: "Modern minimalist tech company logo, clean geometric shapes, gradient blue to purple, vector style, centered composition, professional corporate branding, crisp edges, scalable design"
"""

# Fallback template when brand context is not available
FALLBACK_TEMPLATE = """Enhanced prompt for: {original_prompt}

Add professional quality by including:
- Appropriate lighting and composition
- Clear artistic direction
- High resolution and detail

Keep the core subject and intent while elevating the visual quality."""


class PromptEnrichmentService:
    """
    Service for enriching image generation prompts with brand context
    and best practices.
    """

    def __init__(self, db: Session):
        self.db = db
        self.model_config = ModelConfigService(db)
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.max_retries = 3
        self.base_delay = 1.0  # Base delay for exponential backoff

    async def enrich_prompt(
        self,
        prompt: str,
        project_id: str,
        brand_context: Optional[BrandContext] = None
    ) -> Dict[str, Any]:
        """
        Enrich a user prompt with brand context and best practices.

        Args:
            prompt: The original user prompt
            project_id: Project ID for context
            brand_context: Optional brand context (colors, typography, etc.)

        Returns:
            Dict with:
                - original_prompt: The input prompt
                - enriched_prompt: The enhanced prompt
                - brand_context_applied: Whether brand context was used
                - model_used: Which model performed the enrichment
        """
        start_time = time.time()

        # Get the configured model for prompt enrichment
        model = self.model_config.get_model(ModelConfigService.MODEL_PROMPT_ENRICHMENT)
        print(f"🎨 Enriching prompt with model: {model}")

        # Build user message with brand context if available
        brand_context_str = ""
        if brand_context:
            brand_context_str = brand_context.to_context_string()
            print(f"📦 Brand context: {brand_context_str}")

        user_message = self._build_user_message(prompt, brand_context_str)

        # Call the enrichment model with retry logic
        enriched_prompt = await self._call_model_with_retry(
            model=model,
            system_prompt=ENRICHMENT_SYSTEM_PROMPT,
            user_message=user_message
        )

        # If enrichment failed, use fallback
        if not enriched_prompt:
            enriched_prompt = self._apply_fallback_template(prompt, brand_context_str)
            print(f"⚠️ Using fallback template for prompt enrichment")

        duration_ms = int((time.time() - start_time) * 1000)
        print(f"✨ Prompt enriched in {duration_ms}ms")

        return {
            "original_prompt": prompt,
            "enriched_prompt": enriched_prompt,
            "brand_context_applied": bool(brand_context_str),
            "model_used": model
        }

    def _build_user_message(self, prompt: str, brand_context_str: str) -> str:
        """Build the user message for the enrichment model."""
        if brand_context_str:
            return f"""Enhance this image generation prompt. Apply the brand context where appropriate.

Original prompt: {prompt}

Brand context: {brand_context_str}

Output ONLY the enhanced prompt:"""
        else:
            return f"""Enhance this image generation prompt with professional quality and technical details.

Original prompt: {prompt}

Output ONLY the enhanced prompt:"""

    def _apply_fallback_template(self, prompt: str, brand_context_str: str) -> str:
        """Apply fallback template when model call fails."""
        # Simple fallback that adds basic quality descriptors
        enhancements = [
            "high quality",
            "professional",
            "detailed",
            "well-composed"
        ]

        enhanced = f"{prompt}, {', '.join(enhancements)}"

        if brand_context_str:
            enhanced = f"{enhanced}. {brand_context_str}"

        return enhanced

    async def _call_model_with_retry(
        self,
        model: str,
        system_prompt: str,
        user_message: str
    ) -> Optional[str]:
        """
        Call the OpenRouter API with exponential backoff retry.

        Args:
            model: Model ID to use
            system_prompt: System prompt for the model
            user_message: User message to send

        Returns:
            The model's response text, or None if all retries failed
        """
        if not self.openrouter_api_key:
            print("⚠️ OPENROUTER_API_KEY not set, using fallback")
            return None

        headers = get_openrouter_headers(self.openrouter_api_key)

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            "max_tokens": 500,
            "temperature": 0.7
        }

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )

                    if response.status_code == 200:
                        data = response.json()
                        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        return content.strip() if content else None

                    elif response.status_code == 429:
                        # Rate limited - apply exponential backoff
                        delay = self.base_delay * (2 ** attempt)
                        print(f"⏳ Rate limited, waiting {delay}s before retry {attempt + 1}/{self.max_retries}")
                        await asyncio.sleep(delay)
                        continue

                    else:
                        print(f"❌ OpenRouter API error: {response.status_code} - {response.text}")
                        return None

            except httpx.TimeoutException:
                print(f"⏳ Request timeout, attempt {attempt + 1}/{self.max_retries}")
                await asyncio.sleep(self.base_delay * (2 ** attempt))
                continue

            except Exception as e:
                print(f"❌ Error calling OpenRouter: {e}")
                return None

        print(f"❌ All {self.max_retries} retry attempts failed")
        return None


async def get_brand_context_for_project(db: Session, project_id: str) -> Optional[BrandContext]:
    """
    Fetch brand context for a project from the database.

    Args:
        db: Database session
        project_id: Project ID to fetch context for

    Returns:
        BrandContext if available, None otherwise
    """
    from models import Project

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return None

    # Get settings from project
    settings = getattr(project, "settings", None)
    if not settings:
        return None

    return BrandContext.from_project_settings(settings)
