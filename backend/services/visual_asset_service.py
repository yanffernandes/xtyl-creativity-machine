"""
Visual Asset Service
Handles AI classification, visual context settings, and asset rotation logic
Feature: 011-smart-visual-assets
Feature: 028-image-architecture-refactor - Added intelligent asset selection
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import json
import asyncio
import os
import httpx

from models import Document, Project, AssistantVisualSettings, AssistantAssetSelection, AssetUsageHistory
from schemas import (
    AssetCategory, VisualContextMode, AssetClassificationResult, AssetMetadataUpdate,
    VisualAsset, VisualAssetList, VisualAssetsSummary, AssistantVisualSettings as VisualSettingsSchema,
    AssistantVisualSettingsUpdate, AssetSelection, AssetSelectionList, VisualContextResponse
)
from vision_service import vision_service
from config import get_openrouter_headers
from services.model_config_service import ModelConfigService

# Classification prompt for AI vision analysis
CLASSIFICATION_PROMPT = """You are a visual asset classifier. Analyze this image carefully and classify it.

IMPORTANT: If the image contains ANY brand mark, company logo, symbol, emblem, wordmark, lettermark, or corporate identity element - classify it as "Logo" even if it's part of a larger design.

Return ONLY a valid JSON object with this exact structure:
{
  "category": "Logo|Pessoa|Background|Produto|Referência|Outro",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "Brief description in Portuguese (max 100 words)"
}

Category Definitions (choose the MOST appropriate one):
- Logo: Company logos, brand marks, wordmarks, lettermarks, symbols, icons, emblems, corporate identity elements. CHOOSE THIS if the image shows any branding element.
- Pessoa: Photos of people, portraits, headshots, team photos, models
- Background: Abstract backgrounds, textures, patterns, scenery, wallpapers
- Produto: Physical products, merchandise, items for sale, packaged goods
- Referência: Reference images for style, mood boards, inspiration, examples of desired visual style, screenshots, mockups
- Outro: ONLY use this if the image truly doesn't fit any category above

Think step by step:
1. Does this image contain a logo, brand mark, or any corporate identity element? If yes → "Logo"
2. Does it show people as the main subject? If yes → "Pessoa"
3. Is it a product photo? If yes → "Produto"
4. Is it a background or texture? If yes → "Background"
5. Is it a reference/inspiration image, mockup, or style example? If yes → "Referência"
6. Only if none of the above → "Outro"

Return ONLY the JSON object, no other text."""


# Prompt for intelligent asset selection based on user prompt
ASSET_SELECTION_PROMPT = """You are a visual brand asset selector for professional image generation.

Your task: Select the most relevant visual assets from a brand library to use as references for generating a new image.

## SELECTION CRITERIA

1. **Logo Assets (ALWAYS PRIORITIZE)**
   - ALWAYS include at least 1 logo if available
   - Logos ensure brand consistency in generated images

2. **Contextual Relevance**
   - Match assets to the theme/subject of the prompt
   - "summer promotion" → prefer bright, outdoor, beach-related assets
   - "professional meeting" → prefer corporate, formal assets
   - "product launch" → prefer product photos, clean backgrounds

3. **Visual Style Matching**
   - Consider the mood: formal vs casual, vibrant vs muted
   - Match color schemes when possible
   - Consider the target audience implied by the prompt

4. **Diversity**
   - Include variety: don't select all from same category
   - Balance between brand elements (logos) and contextual elements

## INPUT FORMAT
You will receive:
- User prompt: The image generation request
- Available assets: List with id, category, tags, and description

## OUTPUT FORMAT
Return ONLY a valid JSON object:
{
  "selected_ids": ["id1", "id2", "id3"],
  "reasoning": "Brief explanation of selection logic"
}

Select 3-7 assets maximum. Prioritize quality over quantity."""


class VisualAssetService:
    """Service for visual asset classification and context management"""

    # =========================================================================
    # CLASSIFICATION (US1)
    # =========================================================================

    async def classify_asset(
        self,
        db: Session,
        asset_id: str,
        force_reclassify: bool = False
    ) -> Optional[AssetClassificationResult]:
        """
        Classify a visual asset using AI vision

        Args:
            db: Database session
            asset_id: Document ID of the asset
            force_reclassify: If True, re-classify even if already classified

        Returns:
            AssetClassificationResult or None if classification fails
        """
        # Get the asset with retry for race conditions (parallel uploads)
        asset = None
        for attempt in range(3):
            asset = db.query(Document).filter(
                Document.id == asset_id,
                Document.is_reference_asset == True,
                Document.deleted_at == None
            ).first()

            if asset:
                break

            # Wait a bit and refresh session for next attempt
            if attempt < 2:
                await asyncio.sleep(0.5)
                db.expire_all()

        if not asset:
            print(f"Asset {asset_id} not found after 3 attempts")
            return None

        # Skip if already classified (unless forced)
        if asset.asset_category and not force_reclassify:
            return AssetClassificationResult(
                asset_id=asset_id,
                suggested_category=AssetCategory(asset.asset_category),
                suggested_tags=asset.asset_tags or [],
                ai_description=asset.ai_description or "",
                confidence=1.0  # Already classified
            )

        # Check if we have a file URL
        if not asset.file_url:
            return None

        # Call vision service for classification
        try:
            result = vision_service.analyze_image(
                image_path=asset.file_url,
                prompt=CLASSIFICATION_PROMPT,
                max_tokens=1024  # Increased for better chain-of-thought reasoning
            )

            if not result or not result.get("success"):
                return None

            # Parse the AI response
            analysis_text = result.get("analysis", "")
            classification = self._parse_classification_response(analysis_text)

            if not classification:
                return None

            return AssetClassificationResult(
                asset_id=asset_id,
                suggested_category=classification["category"],
                suggested_tags=classification["tags"][:10],  # Max 10 tags
                ai_description=classification["description"][:500],  # Max 500 chars
                confidence=0.85  # Default confidence for AI classification
            )

        except Exception as e:
            print(f"Classification failed for asset {asset_id}: {e}")
            return None

    def _parse_classification_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Parse AI classification response into structured data"""
        try:
            # Try to extract JSON from the response
            # Handle cases where AI might include extra text
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1

            if json_start == -1 or json_end == 0:
                return None

            json_str = response_text[json_start:json_end]
            data = json.loads(json_str)

            # Validate and normalize category
            category_str = data.get("category", "Outro")
            category_map = {
                "logo": AssetCategory.LOGO,
                "pessoa": AssetCategory.PESSOA,
                "background": AssetCategory.BACKGROUND,
                "produto": AssetCategory.PRODUTO,
                "referência": AssetCategory.REFERENCIA,
                "referencia": AssetCategory.REFERENCIA,
                "outro": AssetCategory.OUTRO,
            }
            category = category_map.get(category_str.lower(), AssetCategory.OUTRO)

            return {
                "category": category,
                "tags": data.get("tags", []),
                "description": data.get("description", "")
            }

        except (json.JSONDecodeError, KeyError, AttributeError) as e:
            print(f"Failed to parse classification response: {e}")
            return None

    async def update_asset_metadata(
        self,
        db: Session,
        asset_id: str,
        metadata: AssetMetadataUpdate
    ) -> Optional[Document]:
        """
        Update asset classification metadata

        Args:
            db: Database session
            asset_id: Document ID
            metadata: New metadata values

        Returns:
            Updated Document or None if not found
        """
        asset = db.query(Document).filter(
            Document.id == asset_id,
            Document.is_reference_asset == True,
            Document.deleted_at == None
        ).first()

        if not asset:
            return None

        # Update fields if provided
        if metadata.category is not None:
            asset.asset_category = metadata.category.value

        if metadata.tags is not None:
            asset.asset_tags = metadata.tags[:10]  # Max 10 tags

        if metadata.ai_description is not None:
            asset.ai_description = metadata.ai_description[:500]  # Max 500 chars

        asset.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(asset)

        return asset

    # =========================================================================
    # VISUAL ASSETS LIST (US1)
    # =========================================================================

    def get_visual_assets(
        self,
        db: Session,
        project_id: str,
        category: Optional[AssetCategory] = None,
        include_unclassified: bool = True
    ) -> VisualAssetList:
        """
        Get visual assets for a project

        Args:
            db: Database session
            project_id: Project ID
            category: Optional category filter
            include_unclassified: Include assets without classification

        Returns:
            VisualAssetList with assets and counts
        """
        query = db.query(Document).filter(
            Document.project_id == project_id,
            Document.is_reference_asset == True,
            Document.deleted_at == None
        )

        # Category filter
        if category:
            query = query.filter(Document.asset_category == category.value)
        elif not include_unclassified:
            query = query.filter(Document.asset_category != None)

        query = query.order_by(Document.created_at.desc())

        assets = query.all()

        # Convert to schema
        visual_assets = []
        by_category: Dict[str, List[VisualAsset]] = {}

        for asset in assets:
            va = VisualAsset(
                id=asset.id,
                project_id=asset.project_id,
                name=asset.title,
                file_url=asset.file_url,
                thumbnail_url=asset.thumbnail_url,
                category=AssetCategory(asset.asset_category) if asset.asset_category else None,
                tags=asset.asset_tags,
                ai_description=asset.ai_description,
                is_classified=asset.asset_category is not None,
                created_at=asset.created_at,
                updated_at=asset.updated_at
            )
            visual_assets.append(va)

            # Group by category
            cat_key = asset.asset_category or "unclassified"
            if cat_key not in by_category:
                by_category[cat_key] = []
            by_category[cat_key].append(va)

        return VisualAssetList(
            assets=visual_assets,
            total=len(visual_assets),
            by_category=by_category
        )

    def get_visual_assets_summary(
        self,
        db: Session,
        project_id: str
    ) -> VisualAssetsSummary:
        """
        Get summary of visual assets by category

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            VisualAssetsSummary with counts
        """
        # Count by category
        results = db.query(
            Document.asset_category,
            func.count(Document.id)
        ).filter(
            Document.project_id == project_id,
            Document.is_reference_asset == True,
            Document.deleted_at == None
        ).group_by(Document.asset_category).all()

        # Initialize counts
        by_category = {
            "Logo": 0,
            "Pessoa": 0,
            "Background": 0,
            "Produto": 0,
            "Referência": 0,
            "Outro": 0,
            "unclassified": 0
        }

        total = 0
        for category, count in results:
            if category:
                by_category[category] = count
            else:
                by_category["unclassified"] = count
            total += count

        return VisualAssetsSummary(
            total=total,
            by_category=by_category
        )

    # =========================================================================
    # VISUAL SETTINGS (US2)
    # =========================================================================

    def get_or_create_visual_settings(
        self,
        db: Session,
        project_id: str
    ) -> AssistantVisualSettings:
        """
        Get visual settings for a project, creating default if none exist

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            AssistantVisualSettings model
        """
        settings = db.query(AssistantVisualSettings).filter(
            AssistantVisualSettings.project_id == project_id
        ).first()

        if not settings:
            # Create default settings
            settings = AssistantVisualSettings(
                project_id=project_id,
                is_enabled=False,
                mode="manual",
                assets_per_category=2
            )
            db.add(settings)
            db.commit()
            db.refresh(settings)

        return settings

    def update_visual_settings(
        self,
        db: Session,
        project_id: str,
        update: AssistantVisualSettingsUpdate
    ) -> AssistantVisualSettings:
        """
        Update visual settings for a project

        Args:
            db: Database session
            project_id: Project ID
            update: Settings update

        Returns:
            Updated AssistantVisualSettings
        """
        settings = self.get_or_create_visual_settings(db, project_id)

        if update.is_enabled is not None:
            settings.is_enabled = update.is_enabled

        if update.mode is not None:
            settings.mode = update.mode.value

        if update.assets_per_category is not None:
            settings.assets_per_category = max(1, min(5, update.assets_per_category))

        settings.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(settings)

        return settings

    # =========================================================================
    # ASSET SELECTIONS (US2 - Manual Mode)
    # =========================================================================

    def get_asset_selections(
        self,
        db: Session,
        project_id: str
    ) -> AssetSelectionList:
        """
        Get manual mode asset selections

        Args:
            db: Database session
            project_id: Project ID

        Returns:
            AssetSelectionList with selections
        """
        settings = self.get_or_create_visual_settings(db, project_id)

        selections = db.query(AssistantAssetSelection).filter(
            AssistantAssetSelection.settings_id == settings.id
        ).all()

        # Convert to schema with asset details
        result = []
        enabled_count = 0

        for sel in selections:
            asset = db.query(Document).filter(
                Document.id == sel.asset_id,
                Document.deleted_at == None
            ).first()

            if asset:
                result.append(AssetSelection(
                    id=sel.id,
                    asset_id=sel.asset_id,
                    asset=VisualAsset(
                        id=asset.id,
                        project_id=asset.project_id,
                        name=asset.title,
                        file_url=asset.file_url,
                        thumbnail_url=asset.thumbnail_url,
                        category=AssetCategory(asset.asset_category) if asset.asset_category else None,
                        tags=asset.asset_tags,
                        ai_description=asset.ai_description,
                        is_classified=asset.asset_category is not None,
                        created_at=asset.created_at,
                        updated_at=asset.updated_at
                    ),
                    is_enabled=sel.is_enabled,
                    created_at=sel.created_at
                ))
                if sel.is_enabled:
                    enabled_count += 1

        return AssetSelectionList(
            selections=result,
            total_enabled=enabled_count
        )

    def update_asset_selections(
        self,
        db: Session,
        project_id: str,
        asset_ids: List[str]
    ) -> AssetSelectionList:
        """
        Replace all asset selections with new list

        Args:
            db: Database session
            project_id: Project ID
            asset_ids: List of asset IDs to select

        Returns:
            Updated AssetSelectionList
        """
        settings = self.get_or_create_visual_settings(db, project_id)

        # Delete existing selections
        db.query(AssistantAssetSelection).filter(
            AssistantAssetSelection.settings_id == settings.id
        ).delete()

        # Create new selections
        for asset_id in asset_ids[:20]:  # Max 20 selections
            # Verify asset exists and belongs to project
            asset = db.query(Document).filter(
                Document.id == asset_id,
                Document.project_id == project_id,
                Document.is_reference_asset == True,
                Document.deleted_at == None
            ).first()

            if asset:
                selection = AssistantAssetSelection(
                    settings_id=settings.id,
                    asset_id=asset_id,
                    is_enabled=True
                )
                db.add(selection)

        db.commit()

        return self.get_asset_selections(db, project_id)

    # =========================================================================
    # VISUAL CONTEXT (US3) - Simplified: Always returns assets automatically
    # =========================================================================

    def get_visual_context(
        self,
        db: Session,
        project_id: str,
        limit: int = 7
    ) -> VisualContextResponse:
        """
        Get resolved visual context for image generation.

        SIMPLIFIED: Always returns up to 7 assets automatically using
        the rotation algorithm. No need for user to enable or configure.

        Args:
            db: Database session
            project_id: Project ID
            limit: Maximum assets to return (default: 7)

        Returns:
            VisualContextResponse with assets
        """
        limit = min(limit, 7)  # Max 7 assets per generation

        # Always use auto-rotation to get the best assets
        assets = self._get_auto_context_assets(
            db,
            project_id,
            assets_per_category=2,  # Default 2 per category
            limit=limit
        )

        if not assets:
            return VisualContextResponse(
                is_enabled=True,
                mode=VisualContextMode.AUTO,
                assets=[],
                message="No visual assets available for this project"
            )

        return VisualContextResponse(
            is_enabled=True,
            mode=VisualContextMode.AUTO,
            assets=assets,
            message=f"Using {len(assets)} visual assets as brand references"
        )

    async def get_intelligent_visual_context(
        self,
        db: Session,
        project_id: str,
        prompt: str,
        limit: int = 7
    ) -> VisualContextResponse:
        """
        Get intelligently selected visual context based on the user's prompt.

        Uses AI to analyze the prompt and select the most relevant assets
        from the project's visual library based on tags, descriptions, and categories.

        Args:
            db: Database session
            project_id: Project ID
            prompt: The user's image generation prompt
            limit: Maximum assets to return (default: 7)

        Returns:
            VisualContextResponse with intelligently selected assets
        """
        limit = min(limit, 7)

        # Get all available assets for the project
        all_assets = self._get_all_project_assets(db, project_id)

        if not all_assets:
            return VisualContextResponse(
                is_enabled=True,
                mode=VisualContextMode.AUTO,
                assets=[],
                message="No visual assets available for this project"
            )

        # If few assets, just return all of them
        if len(all_assets) <= limit:
            return VisualContextResponse(
                is_enabled=True,
                mode=VisualContextMode.AUTO,
                assets=all_assets,
                message=f"Using all {len(all_assets)} visual assets as brand references"
            )

        # Use AI to select the most relevant assets
        selected_assets = await self._select_assets_with_ai(
            db, prompt, all_assets, limit
        )

        if not selected_assets:
            # Fallback to rotation algorithm if AI selection fails
            print("⚠️ AI asset selection failed, falling back to rotation algorithm")
            selected_assets = self._get_auto_context_assets(
                db, project_id, assets_per_category=2, limit=limit
            )

        return VisualContextResponse(
            is_enabled=True,
            mode=VisualContextMode.AUTO,
            assets=selected_assets,
            message=f"Using {len(selected_assets)} intelligently selected assets"
        )

    def _get_all_project_assets(
        self,
        db: Session,
        project_id: str
    ) -> List[VisualAsset]:
        """Get all classified assets for a project"""
        assets = db.query(Document).filter(
            Document.project_id == project_id,
            Document.is_reference_asset == True,
            Document.deleted_at == None,
            Document.asset_category != None  # Only classified assets
        ).all()

        return [
            VisualAsset(
                id=asset.id,
                project_id=asset.project_id,
                name=asset.title,
                file_url=asset.file_url,
                thumbnail_url=asset.thumbnail_url,
                category=AssetCategory(asset.asset_category) if asset.asset_category else None,
                tags=asset.asset_tags,
                ai_description=asset.ai_description,
                is_classified=asset.asset_category is not None,
                created_at=asset.created_at,
                updated_at=asset.updated_at
            )
            for asset in assets
        ]

    async def _select_assets_with_ai(
        self,
        db: Session,
        prompt: str,
        available_assets: List[VisualAsset],
        limit: int
    ) -> Optional[List[VisualAsset]]:
        """
        Use AI to select the most relevant assets for the given prompt.

        Args:
            db: Database session
            prompt: User's image generation prompt
            available_assets: List of all available assets
            limit: Maximum number of assets to select

        Returns:
            List of selected VisualAsset objects, or None if selection fails
        """
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
        if not openrouter_api_key:
            print("⚠️ OPENROUTER_API_KEY not set, skipping AI asset selection")
            return None

        # Get the model for asset selection (use prompt enrichment model - fast & cheap)
        model_config = ModelConfigService(db)
        model = model_config.get_model(ModelConfigService.MODEL_PROMPT_ENRICHMENT)

        # Build asset descriptions for the AI
        asset_descriptions = []
        for asset in available_assets:
            tags_str = ", ".join(asset.tags[:5]) if asset.tags else "none"
            desc = asset.ai_description[:100] if asset.ai_description else "no description"
            asset_descriptions.append({
                "id": asset.id,
                "category": asset.category.value if asset.category else "unknown",
                "tags": tags_str,
                "description": desc
            })

        user_message = f"""User prompt: "{prompt}"

Available assets ({len(available_assets)} total):
{json.dumps(asset_descriptions, indent=2)}

Select the {limit} most relevant assets for this image generation request.
Remember: ALWAYS include at least 1 logo if available."""

        headers = get_openrouter_headers(openrouter_api_key)
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": ASSET_SELECTION_PROMPT},
                {"role": "user", "content": user_message}
            ],
            "max_tokens": 500,
            "temperature": 0.3  # Lower temperature for more consistent selection
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload
                )

                if response.status_code != 200:
                    print(f"❌ AI asset selection failed: {response.status_code}")
                    return None

                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

                # Parse the response
                selected_ids = self._parse_asset_selection_response(content)

                if not selected_ids:
                    return None

                # Filter assets by selected IDs, maintaining order
                asset_map = {a.id: a for a in available_assets}
                selected_assets = [
                    asset_map[aid] for aid in selected_ids
                    if aid in asset_map
                ][:limit]

                if selected_assets:
                    print(f"✨ AI selected {len(selected_assets)} assets: {[a.category.value if a.category else 'unknown' for a in selected_assets]}")

                return selected_assets if selected_assets else None

        except Exception as e:
            print(f"❌ AI asset selection error: {e}")
            return None

    def _parse_asset_selection_response(self, response_text: str) -> Optional[List[str]]:
        """Parse AI response to extract selected asset IDs"""
        try:
            # Extract JSON from response
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1

            if json_start == -1 or json_end == 0:
                return None

            json_str = response_text[json_start:json_end]
            data = json.loads(json_str)

            selected_ids = data.get("selected_ids", [])

            if selected_ids:
                reasoning = data.get("reasoning", "")
                if reasoning:
                    print(f"🧠 Asset selection reasoning: {reasoning}")

            return selected_ids if isinstance(selected_ids, list) else None

        except (json.JSONDecodeError, KeyError) as e:
            print(f"Failed to parse asset selection response: {e}")
            return None

    def _get_manual_context_assets(
        self,
        db: Session,
        settings_id: str,
        limit: int
    ) -> List[VisualAsset]:
        """Get assets from manual selections"""
        selections = db.query(AssistantAssetSelection).filter(
            AssistantAssetSelection.settings_id == settings_id,
            AssistantAssetSelection.is_enabled == True
        ).limit(limit).all()

        assets = []
        for sel in selections:
            asset = db.query(Document).filter(
                Document.id == sel.asset_id,
                Document.deleted_at == None
            ).first()

            if asset:
                assets.append(VisualAsset(
                    id=asset.id,
                    project_id=asset.project_id,
                    name=asset.title,
                    file_url=asset.file_url,
                    thumbnail_url=asset.thumbnail_url,
                    category=AssetCategory(asset.asset_category) if asset.asset_category else None,
                    tags=asset.asset_tags,
                    ai_description=asset.ai_description,
                    is_classified=asset.asset_category is not None,
                    created_at=asset.created_at,
                    updated_at=asset.updated_at
                ))

        return assets

    def _get_auto_context_assets(
        self,
        db: Session,
        project_id: str,
        assets_per_category: int,
        limit: int
    ) -> List[VisualAsset]:
        """Get assets using auto rotation algorithm (US4)"""
        assets = []

        # FR-009: Always include logos first
        logos = self._get_least_used_assets(db, project_id, "Logo", limit)
        assets.extend(logos)

        if len(assets) >= limit:
            return assets[:limit]

        # Get from other categories
        remaining = limit - len(assets)
        other_categories = ["Pessoa", "Produto", "Background", "Outro"]

        for category in other_categories:
            if len(assets) >= limit:
                break
            category_assets = self._get_least_used_assets(
                db, project_id, category,
                min(assets_per_category, remaining)
            )
            assets.extend(category_assets)
            remaining = limit - len(assets)

        return assets[:limit]

    def _get_least_used_assets(
        self,
        db: Session,
        project_id: str,
        category: str,
        limit: int
    ) -> List[VisualAsset]:
        """Get least recently used assets from a category (US4)"""
        # Subquery for last usage
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        # Get all assets in category with usage info
        assets = db.query(Document).filter(
            Document.project_id == project_id,
            Document.is_reference_asset == True,
            Document.asset_category == category,
            Document.deleted_at == None
        ).all()

        if not assets:
            return []

        # Get usage history for these assets
        asset_ids = [a.id for a in assets]
        usage_data = db.query(
            AssetUsageHistory.asset_id,
            func.max(AssetUsageHistory.used_at).label("last_used")
        ).filter(
            AssetUsageHistory.asset_id.in_(asset_ids),
            AssetUsageHistory.used_at >= thirty_days_ago
        ).group_by(AssetUsageHistory.asset_id).all()

        # Create lookup
        usage_lookup = {u.asset_id: u.last_used for u in usage_data}

        # Sort by least recently used (never used first)
        sorted_assets = sorted(
            assets,
            key=lambda a: usage_lookup.get(a.id, datetime.min)
        )

        # Convert to schema
        result = []
        for asset in sorted_assets[:limit]:
            result.append(VisualAsset(
                id=asset.id,
                project_id=asset.project_id,
                name=asset.title,
                file_url=asset.file_url,
                thumbnail_url=asset.thumbnail_url,
                category=AssetCategory(asset.asset_category) if asset.asset_category else None,
                tags=asset.asset_tags,
                ai_description=asset.ai_description,
                is_classified=asset.asset_category is not None,
                created_at=asset.created_at,
                updated_at=asset.updated_at
            ))

        return result

    # =========================================================================
    # USAGE TRACKING (US4)
    # =========================================================================

    def record_asset_usage(
        self,
        db: Session,
        asset_ids: List[str],
        generation_id: Optional[str] = None
    ) -> int:
        """
        Record usage of assets for rotation algorithm

        Args:
            db: Database session
            asset_ids: List of asset IDs that were used
            generation_id: Optional generation reference

        Returns:
            Number of records created
        """
        count = 0
        for asset_id in asset_ids:
            usage = AssetUsageHistory(
                asset_id=asset_id,
                generation_id=generation_id,
                used_at=datetime.utcnow()
            )
            db.add(usage)
            count += 1

        db.commit()
        return count

    def cleanup_old_usage_history(
        self,
        db: Session,
        days: int = 30
    ) -> int:
        """
        Clean up usage history older than specified days (NFR-004)

        Args:
            db: Database session
            days: Days to retain (default 30)

        Returns:
            Number of records deleted
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        deleted = db.query(AssetUsageHistory).filter(
            AssetUsageHistory.used_at < cutoff
        ).delete()

        db.commit()
        return deleted


# Singleton instance
visual_asset_service = VisualAssetService()
