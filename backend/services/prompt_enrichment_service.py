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
            # Convert hex codes to descriptive color names to avoid them appearing in the image
            color_descriptions = [self._hex_to_description(c) for c in self.color_palette[:6]]
            colors = ", ".join(color_descriptions)
            parts.append(f"Incorporate these colors naturally into the scene: {colors}")

        fonts = []
        if self.typography_primary:
            fonts.append(f"primary: {self.typography_primary}")
        if self.typography_secondary:
            fonts.append(f"secondary: {self.typography_secondary}")

        if fonts:
            parts.append(f"Typography style: {', '.join(fonts)}")

        return "; ".join(parts) if parts else ""

    def _hex_to_description(self, hex_color: str) -> str:
        """Convert hex color to a descriptive name to avoid hex codes in prompts."""
        # Remove # if present
        hex_color = hex_color.lstrip('#').upper()

        # Basic color mapping based on hex ranges
        try:
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
        except (ValueError, IndexError):
            return "neutral tone"

        # Determine lightness
        lightness = (r + g + b) / 3
        light_prefix = ""
        if lightness > 200:
            light_prefix = "light "
        elif lightness < 60:
            light_prefix = "deep "
        elif lightness < 100:
            light_prefix = "dark "

        # Determine dominant color
        max_val = max(r, g, b)
        min_val = min(r, g, b)

        if max_val - min_val < 30:  # Grayscale
            if lightness > 200:
                return "white"
            elif lightness < 50:
                return "black"
            else:
                return f"{light_prefix}gray"

        # Color determination
        if r >= g and r >= b:
            if r - g < 30 and g > b:
                return f"{light_prefix}golden yellow"
            elif r - b < 30 and b > g:
                return f"{light_prefix}magenta pink"
            elif g > 100:
                return f"{light_prefix}orange"
            else:
                return f"{light_prefix}red"
        elif g >= r and g >= b:
            if g - r < 30:
                return f"{light_prefix}lime green"
            elif g - b < 50 and b > 100:
                return f"{light_prefix}teal"
            else:
                return f"{light_prefix}green"
        else:  # b is dominant
            if b - r < 50 and r > 100:
                return f"{light_prefix}purple"
            elif b - g < 30:
                return f"{light_prefix}cyan"
            else:
                return f"{light_prefix}blue"


# System prompt for the enrichment model
ENRICHMENT_SYSTEM_PROMPT = """You are an elite creative director and prompt engineer at a top-tier design agency. Your specialty is transforming simple ideas into stunning, award-winning visual concepts for AI image generation.

## YOUR MISSION
Transform basic prompts into professional-grade image specifications that produce:
- **4K/8K quality** imagery worthy of premium advertising campaigns
- **Contemporary, cutting-edge** aesthetics (2024-2025 design trends)
- **Sophisticated compositions** with intentional visual hierarchy
- **Brand-aligned visuals** that feel cohesive and intentional

## MANDATORY QUALITY STANDARDS
Every enhanced prompt MUST include:
1. **Resolution & Fidelity**: "4K", "8K", "ultra-detailed", "sharp focus", "high resolution"
2. **Professional Context**: "shot by professional photographer", "studio quality", "commercial grade", "advertising quality"
3. **Modern Aesthetics**: Contemporary design language, avoid dated/generic looks
4. **Lighting Excellence**: Specific lighting setup (soft diffused, dramatic rim light, golden hour, studio strobes)
5. **Composition Rules**: Rule of thirds, leading lines, negative space, depth of field

## STYLE DIRECTIVES
- **NEVER** produce anything that looks stock, generic, clipart-like, or amateur
- **ALWAYS** aim for: Apple-level polish, Airbnb-quality photography, premium brand aesthetics
- **PRIORITIZE**: Clean lines, sophisticated color grading, intentional whitespace, modern typography integration
- **EMBRACE**: Minimalism with impact, bold but refined, elegant simplicity

## BRAND INTEGRATION (when provided)
- Weave brand colors naturally into the scene (lighting, props, backgrounds, accents)
- Respect typography personality (if elegant fonts → elegant imagery; if bold → bold visuals)
- Maintain visual consistency that could belong in the brand's marketing materials

## CRITICAL RESTRICTIONS - NEVER DO THIS
- **NEVER** include hex color codes (like #FF5733, #0C3274) as visible text in the image
- **NEVER** render color swatches, color bars, color palettes, or color samples as visual elements
- **NEVER** include company names, brand names, or business names as visible text or watermarks
- **NEVER** add technical color values (RGB, HEX, CMYK, Pantone) anywhere in the image
- **NEVER** describe colors by their codes - use natural descriptions instead: "deep navy blue" not "#0C3274"
- Use colors naturally through lighting, objects, clothing, backgrounds - NOT as labeled graphic elements
- The brand logo will be automatically included via visual asset references - do not describe or add text logos
- Focus on the visual scene, not on displaying brand identity elements as text

## OUTPUT RULES
- Output ONLY the enhanced prompt, no explanations or commentary
- Keep under 400 words but be comprehensive
- Write in English for best AI model compatibility
- End with key quality anchors: "masterpiece, trending on Behance, award-winning design"

## EXAMPLES

User: "A coffee cup"
Enhanced: "Artisanal ceramic coffee cup with steam wisps rising elegantly, placed on polished marble surface, soft morning light streaming through sheer curtains creating gentle shadows, shallow depth of field with creamy bokeh, professional food photography, warm neutral color palette with touches of terracotta, minimalist Scandinavian aesthetic, shot on medium format camera, 4K ultra-detailed, masterpiece quality, trending on Behance"

User: "Logo for tech company"
Enhanced: "Premium technology brand logo, ultra-modern geometric lettermark, clean vector design with subtle 3D depth, sophisticated gradient from deep navy to electric blue, centered on pure white background with ample breathing room, crisp razor-sharp edges, professional corporate identity design, scalable from favicon to billboard, contemporary 2024 design trends, award-winning branding, 8K render quality"

User: "Marketing banner for sale"
Enhanced: "High-impact retail promotional banner, bold contemporary typography with dynamic composition, vibrant yet sophisticated color blocking, professional marketing design with clear visual hierarchy, modern gradient overlays, clean geometric accents, premium advertising quality, eye-catching but elegant, commercial photography integration ready, 4K resolution, print and digital optimized, award-winning advertising design"
"""

# Fallback quality anchors when model call fails
FALLBACK_QUALITY_ANCHORS = [
    "4K ultra-detailed",
    "professional photography",
    "sharp focus",
    "premium quality",
    "modern contemporary aesthetic",
    "sophisticated composition",
    "studio lighting",
    "masterpiece quality"
]


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
        base_instructions = """Transform this into a premium, award-winning visual concept.
Remember: 4K/8K quality, professional photography standards, contemporary 2024-2025 aesthetics.
NEVER generic or stock-like. ALWAYS sophisticated and brand-worthy."""

        if brand_context_str:
            return f"""{base_instructions}

Original prompt: {prompt}

Brand context to incorporate: {brand_context_str}

The image will be used alongside reference visual assets from the brand library, so ensure visual coherence with professional brand materials.

Output ONLY the enhanced prompt:"""
        else:
            return f"""{base_instructions}

Original prompt: {prompt}

Output ONLY the enhanced prompt:"""

    def _apply_fallback_template(self, prompt: str, brand_context_str: str) -> str:
        """Apply fallback template when model call fails."""
        # Use professional quality anchors
        enhanced = f"{prompt}, {', '.join(FALLBACK_QUALITY_ANCHORS)}"

        if brand_context_str:
            enhanced = f"{enhanced}. Brand context: {brand_context_str}"

        # Always end with quality anchors
        enhanced = f"{enhanced}, trending on Behance, award-winning design"

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
