"""
Visual Asset Service
Handles AI classification, visual context settings, and asset rotation logic
Feature: 011-smart-visual-assets
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
import json

from models import Document, Project, AssistantVisualSettings, AssistantAssetSelection, AssetUsageHistory
from schemas import (
    AssetCategory, VisualContextMode, AssetClassificationResult, AssetMetadataUpdate,
    VisualAsset, VisualAssetList, VisualAssetsSummary, AssistantVisualSettings as VisualSettingsSchema,
    AssistantVisualSettingsUpdate, AssetSelection, AssetSelectionList, VisualContextResponse
)
from vision_service import vision_service

# Classification prompt for AI vision analysis
CLASSIFICATION_PROMPT = """You are a visual asset classifier. Analyze this image carefully and classify it.

IMPORTANT: If the image contains ANY brand mark, company logo, symbol, emblem, wordmark, lettermark, or corporate identity element - classify it as "Logo" even if it's part of a larger design.

Return ONLY a valid JSON object with this exact structure:
{
  "category": "Logo|Pessoa|Background|Produto|Outro",
  "tags": ["tag1", "tag2", "tag3"],
  "description": "Brief description in Portuguese (max 100 words)"
}

Category Definitions (choose the MOST appropriate one):
- Logo: Company logos, brand marks, wordmarks, lettermarks, symbols, icons, emblems, corporate identity elements. CHOOSE THIS if the image shows any branding element.
- Pessoa: Photos of people, portraits, headshots, team photos, models
- Background: Abstract backgrounds, textures, patterns, scenery, wallpapers
- Produto: Physical products, merchandise, items for sale, packaged goods
- Outro: ONLY use this if the image truly doesn't fit any category above

Think step by step:
1. Does this image contain a logo, brand mark, or any corporate identity element? If yes → "Logo"
2. Does it show people as the main subject? If yes → "Pessoa"
3. Is it a product photo? If yes → "Produto"
4. Is it a background or texture? If yes → "Background"
5. Only if none of the above → "Outro"

Return ONLY the JSON object, no other text."""


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
        # Get the asset
        asset = db.query(Document).filter(
            Document.id == asset_id,
            Document.is_reference_asset == True,
            Document.deleted_at == None
        ).first()

        if not asset:
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
    # VISUAL CONTEXT (US3)
    # =========================================================================

    def get_visual_context(
        self,
        db: Session,
        project_id: str,
        limit: int = 5
    ) -> VisualContextResponse:
        """
        Get resolved visual context for image generation

        Args:
            db: Database session
            project_id: Project ID
            limit: Maximum assets to return (NFR-003: max 5)

        Returns:
            VisualContextResponse with assets
        """
        settings = self.get_or_create_visual_settings(db, project_id)

        if not settings.is_enabled:
            return VisualContextResponse(
                is_enabled=False,
                message="Visual context is disabled for this project"
            )

        limit = min(limit, 5)  # NFR-003: max 5 assets per generation

        if settings.mode == "manual":
            # Get manual selections
            assets = self._get_manual_context_assets(db, settings.id, limit)
        else:
            # Get auto-rotated assets
            assets = self._get_auto_context_assets(db, project_id, settings.assets_per_category, limit)

        return VisualContextResponse(
            is_enabled=True,
            mode=VisualContextMode(settings.mode),
            assets=assets,
            message=f"Using {len(assets)} visual assets as references"
        )

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
