"""
Model Configuration Service - Database-backed AI model configuration.

Provides centralized, admin-configurable model settings that replace
hardcoded model values throughout the system.

All AI services should use this service to get model configurations
instead of hardcoding model IDs.
"""

import time
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from models import SystemConfig


class ModelConfigService:
    """
    Database-backed model configuration service with in-memory caching.

    This service replaces hardcoded model configurations throughout the system.
    Configuration is stored in the system_config table and cached in memory
    for performance.

    Usage:
        service = ModelConfigService(db)
        chat_model = service.get_model("chat")
        vision_model = service.get_model("vision")
    """

    # Cache settings
    _CACHE_TTL = 60  # seconds
    _cache: Dict[str, Any] = {}
    _cache_time: float = 0

    # Config keys in the database
    CONFIG_KEY_AI_MODELS = "ai_models"
    CONFIG_KEY_VISIBLE_MODELS = "visible_models"  # Deprecated - use separate text/image keys
    CONFIG_KEY_VISIBLE_TEXT_MODELS = "visible_text_models"
    CONFIG_KEY_VISIBLE_IMAGE_MODELS = "visible_image_models"

    # Model types (keys in ai_models config)
    MODEL_CHAT = "chat"
    MODEL_EMBEDDING = "embedding"
    MODEL_VISION = "vision"
    MODEL_DOCUMENT = "document"
    MODEL_IMAGE_GENERATION = "image_generation"
    MODEL_IMAGE_NAMING = "image_naming"
    MODEL_PROMPT_ENRICHMENT = "prompt_enrichment"  # Feature 016: V1 Polish

    # Default fallback models (used only if DB config is missing)
    DEFAULT_MODELS = {
        "chat": "anthropic/claude-sonnet-4-20250514",
        "embedding": "openai/text-embedding-3-small",
        "vision": "anthropic/claude-sonnet-4-20250514",
        "document": "anthropic/claude-sonnet-4-20250514",
        "image_generation": "openai/dall-e-3",
        "image_naming": "anthropic/claude-3-haiku-20240307",
        "prompt_enrichment": "anthropic/claude-3-haiku-20240307",  # Feature 016: V1 Polish
    }

    DEFAULT_FALLBACKS = {
        "chat": "openai/gpt-4o",
        "embedding": "openai/text-embedding-ada-002",
        "vision": "openai/gpt-4o",
        "document": "openai/gpt-4o",
        "image_generation": "stabilityai/stable-diffusion-xl-1024-v1-0",
        "image_naming": "openai/gpt-4o-mini",
        "prompt_enrichment": "openai/gpt-4o-mini",  # Feature 016: V1 Polish
    }

    # Default visible text models (used if DB config is missing)
    DEFAULT_VISIBLE_TEXT_MODELS = [
        "anthropic/claude-sonnet-4-20250514",
        "anthropic/claude-3-5-sonnet-20241022",
        "openai/gpt-4o",
        "openai/gpt-4-turbo",
        "google/gemini-2.0-flash-001",
    ]

    # Default visible image models (used if DB config is missing)
    DEFAULT_VISIBLE_IMAGE_MODELS = [
        "openai/dall-e-3",
        "google/imagen-3",
    ]

    def __init__(self, db: Session):
        """
        Initialize the model config service.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def _is_cache_valid(self) -> bool:
        """Check if the cache is still valid."""
        return (
            self._cache
            and (time.time() - self._cache_time) < self._CACHE_TTL
        )

    def _load_config(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Load configuration from database.

        Args:
            key: Configuration key (e.g., "ai_models", "visible_models")

        Returns:
            Configuration value as dict, or None if not found
        """
        config = (
            self.db.query(SystemConfig)
            .filter(SystemConfig.key == key)
            .first()
        )
        return config.value if config else None

    def _get_ai_models_config(self) -> Dict[str, Any]:
        """
        Get the full AI models configuration with caching.

        Returns:
            AI models configuration dict with 'defaults' and 'fallbacks' keys
        """
        cache_key = self.CONFIG_KEY_AI_MODELS

        if self._is_cache_valid() and cache_key in self._cache:
            return self._cache[cache_key]

        config = self._load_config(cache_key)

        if config:
            ModelConfigService._cache[cache_key] = config
            ModelConfigService._cache_time = time.time()
            return config

        # Return hardcoded defaults if DB config is missing
        default_config = {
            "defaults": self.DEFAULT_MODELS.copy(),
            "fallbacks": self.DEFAULT_FALLBACKS.copy(),
        }
        ModelConfigService._cache[cache_key] = default_config
        ModelConfigService._cache_time = time.time()
        return default_config

    def get_model(self, model_type: str) -> str:
        """
        Get the configured model ID for a specific task type.

        This is the primary method services should use to get model IDs.

        Args:
            model_type: Type of model ("chat", "embedding", "vision", etc.)

        Returns:
            Model ID string (e.g., "anthropic/claude-sonnet-4-20250514")

        Example:
            model_id = service.get_model("chat")
            # Returns "anthropic/claude-sonnet-4-20250514" (or configured value)
        """
        config = self._get_ai_models_config()
        defaults = config.get("defaults", {})
        return defaults.get(model_type, self.DEFAULT_MODELS.get(model_type, ""))

    def get_fallback_model(self, model_type: str) -> str:
        """
        Get the fallback model ID for a specific task type.

        Used when the primary model is unavailable.

        Args:
            model_type: Type of model ("chat", "embedding", "vision", etc.)

        Returns:
            Fallback model ID string
        """
        config = self._get_ai_models_config()
        fallbacks = config.get("fallbacks", {})
        return fallbacks.get(model_type, self.DEFAULT_FALLBACKS.get(model_type, ""))

    def get_all_model_config(self) -> Dict[str, Any]:
        """
        Get the complete AI model configuration.

        Returns:
            Full configuration with defaults and fallbacks
        """
        return self._get_ai_models_config()

    def get_visible_models(self) -> List[str]:
        """
        Get the list of model IDs visible to users in model selectors.

        Returns:
            List of model ID strings that should be shown in UI selectors
        """
        cache_key = self.CONFIG_KEY_VISIBLE_MODELS

        if self._is_cache_valid() and cache_key in self._cache:
            return self._cache[cache_key]

        config = self._load_config(cache_key)

        if config and isinstance(config, list):
            ModelConfigService._cache[cache_key] = config
            ModelConfigService._cache_time = time.time()
            return config

        # Return default visible models if DB config is missing
        default_visible = [
            "anthropic/claude-sonnet-4-20250514",
            "anthropic/claude-3-5-sonnet-20241022",
            "anthropic/claude-3-opus-20240229",
            "openai/gpt-4o",
            "openai/gpt-4-turbo",
            "google/gemini-pro-1.5",
        ]
        ModelConfigService._cache[cache_key] = default_visible
        ModelConfigService._cache_time = time.time()
        return default_visible

    def get_visible_text_models(self) -> List[str]:
        """
        Get the list of text/LLM model IDs visible to users in model selectors.

        Returns:
            List of text model ID strings that should be shown in UI selectors
        """
        cache_key = self.CONFIG_KEY_VISIBLE_TEXT_MODELS

        if self._is_cache_valid() and cache_key in self._cache:
            return self._cache[cache_key]

        config = self._load_config(cache_key)

        if config and isinstance(config, list):
            ModelConfigService._cache[cache_key] = config
            ModelConfigService._cache_time = time.time()
            return config

        # Check for backward compatibility with old visible_models key
        old_config = self._load_config(self.CONFIG_KEY_VISIBLE_MODELS)
        if old_config and isinstance(old_config, list) and len(old_config) > 0:
            ModelConfigService._cache[cache_key] = old_config
            ModelConfigService._cache_time = time.time()
            return old_config

        # Return defaults if DB config is missing
        ModelConfigService._cache[cache_key] = self.DEFAULT_VISIBLE_TEXT_MODELS
        ModelConfigService._cache_time = time.time()
        return self.DEFAULT_VISIBLE_TEXT_MODELS

    def get_visible_image_models(self) -> List[str]:
        """
        Get the list of image generation model IDs visible to users.

        Returns:
            List of image model ID strings that should be shown in UI selectors
        """
        cache_key = self.CONFIG_KEY_VISIBLE_IMAGE_MODELS

        if self._is_cache_valid() and cache_key in self._cache:
            return self._cache[cache_key]

        config = self._load_config(cache_key)

        if config and isinstance(config, list):
            ModelConfigService._cache[cache_key] = config
            ModelConfigService._cache_time = time.time()
            return config

        # Return defaults if DB config is missing
        ModelConfigService._cache[cache_key] = self.DEFAULT_VISIBLE_IMAGE_MODELS
        ModelConfigService._cache_time = time.time()
        return self.DEFAULT_VISIBLE_IMAGE_MODELS

    def update_visible_text_models(
        self,
        model_ids: List[str],
        updated_by: Optional[UUID] = None,
    ) -> List[str]:
        """
        Update the list of visible text models for user selection.

        Args:
            model_ids: List of text model IDs to make visible
            updated_by: UUID of admin performing the update

        Returns:
            Updated list of visible text models

        Raises:
            ValueError: If model_ids is empty (at least 1 model required)
        """
        from sqlalchemy.orm.attributes import flag_modified

        if not model_ids:
            raise ValueError("At least one text model must be visible")

        print(f"[ModelConfigService] ===== UPDATE VISIBLE TEXT MODELS =====")
        print(f"[ModelConfigService] Received model_ids type: {type(model_ids)}")
        print(f"[ModelConfigService] Received model_ids length: {len(model_ids)}")
        print(f"[ModelConfigService] Received model_ids value: {model_ids}")
        print(f"[ModelConfigService] Updated by: {updated_by}")

        config = self.db.query(SystemConfig).filter(
            SystemConfig.key == self.CONFIG_KEY_VISIBLE_TEXT_MODELS
        ).first()

        new_model_ids = list(model_ids)

        if config:
            config.value = new_model_ids
            config.updated_by = updated_by
            flag_modified(config, "value")
        else:
            config = SystemConfig(
                key=self.CONFIG_KEY_VISIBLE_TEXT_MODELS,
                value=new_model_ids,
                description="List of text/LLM models visible in user model selectors",
                updated_by=updated_by,
            )
            self.db.add(config)

        try:
            self.db.commit()
            self.db.refresh(config)
            print(f"[ModelConfigService] Visible text models saved successfully: {config.value}")
        except Exception as e:
            print(f"[ModelConfigService] ERROR committing visible text models: {e}")
            self.db.rollback()
            raise

        self.invalidate_cache()
        return config.value

    def update_visible_image_models(
        self,
        model_ids: List[str],
        updated_by: Optional[UUID] = None,
    ) -> List[str]:
        """
        Update the list of visible image models for user selection.

        Args:
            model_ids: List of image model IDs to make visible
            updated_by: UUID of admin performing the update

        Returns:
            Updated list of visible image models

        Raises:
            ValueError: If model_ids is empty (at least 1 model required)
        """
        from sqlalchemy.orm.attributes import flag_modified

        if not model_ids:
            raise ValueError("At least one image model must be visible")

        print(f"[ModelConfigService] Updating visible image models: {model_ids}, updated_by={updated_by}")

        config = self.db.query(SystemConfig).filter(
            SystemConfig.key == self.CONFIG_KEY_VISIBLE_IMAGE_MODELS
        ).first()

        new_model_ids = list(model_ids)

        if config:
            config.value = new_model_ids
            config.updated_by = updated_by
            flag_modified(config, "value")
        else:
            config = SystemConfig(
                key=self.CONFIG_KEY_VISIBLE_IMAGE_MODELS,
                value=new_model_ids,
                description="List of image generation models visible in user model selectors",
                updated_by=updated_by,
            )
            self.db.add(config)

        try:
            self.db.commit()
            self.db.refresh(config)
            print(f"[ModelConfigService] Visible image models saved successfully: {config.value}")
        except Exception as e:
            print(f"[ModelConfigService] ERROR committing visible image models: {e}")
            self.db.rollback()
            raise

        self.invalidate_cache()
        return config.value

    def update_model_config(
        self,
        defaults: Optional[Dict[str, str]] = None,
        fallbacks: Optional[Dict[str, str]] = None,
        updated_by: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Update AI model configuration.

        Args:
            defaults: Dict of model_type -> model_id for default models
            fallbacks: Dict of model_type -> model_id for fallback models
            updated_by: UUID of admin performing the update

        Returns:
            Updated configuration

        Raises:
            Exception: If database commit fails
        """
        import copy
        from sqlalchemy.orm.attributes import flag_modified

        print(f"[ModelConfigService] Updating config: defaults={defaults}, fallbacks={fallbacks}, updated_by={updated_by}")

        config = self.db.query(SystemConfig).filter(
            SystemConfig.key == self.CONFIG_KEY_AI_MODELS
        ).first()

        # Create a deep copy to ensure SQLAlchemy detects the change
        if config and config.value:
            current_value = copy.deepcopy(config.value)
        else:
            current_value = {
                "defaults": self.DEFAULT_MODELS.copy(),
                "fallbacks": self.DEFAULT_FALLBACKS.copy(),
            }

        if defaults:
            current_value["defaults"] = {**current_value.get("defaults", {}), **defaults}
        if fallbacks:
            current_value["fallbacks"] = {**current_value.get("fallbacks", {}), **fallbacks}

        print(f"[ModelConfigService] New config value: {current_value}")

        if config:
            config.value = current_value
            config.updated_by = updated_by
            # Explicitly mark the JSONB column as modified for SQLAlchemy
            flag_modified(config, "value")
        else:
            config = SystemConfig(
                key=self.CONFIG_KEY_AI_MODELS,
                value=current_value,
                description="AI model configuration for all system tasks",
                updated_by=updated_by,
            )
            self.db.add(config)

        try:
            self.db.commit()
            self.db.refresh(config)
            print(f"[ModelConfigService] Config saved successfully: {config.value}")
        except Exception as e:
            print(f"[ModelConfigService] ERROR committing config: {e}")
            self.db.rollback()
            raise

        # Invalidate cache
        self.invalidate_cache()

        return config.value

    def update_visible_models(
        self,
        model_ids: List[str],
        updated_by: Optional[UUID] = None,
    ) -> List[str]:
        """
        Update the list of visible models for user selection.

        Args:
            model_ids: List of model IDs to make visible
            updated_by: UUID of admin performing the update

        Returns:
            Updated list of visible models
        """
        from sqlalchemy.orm.attributes import flag_modified

        print(f"[ModelConfigService] Updating visible models: {model_ids}, updated_by={updated_by}")

        config = self.db.query(SystemConfig).filter(
            SystemConfig.key == self.CONFIG_KEY_VISIBLE_MODELS
        ).first()

        # Create a new list to ensure SQLAlchemy detects the change
        new_model_ids = list(model_ids)

        if config:
            config.value = new_model_ids
            config.updated_by = updated_by
            # Explicitly mark the JSONB column as modified for SQLAlchemy
            flag_modified(config, "value")
        else:
            config = SystemConfig(
                key=self.CONFIG_KEY_VISIBLE_MODELS,
                value=new_model_ids,
                description="List of AI models visible in user model selectors",
                updated_by=updated_by,
            )
            self.db.add(config)

        try:
            self.db.commit()
            self.db.refresh(config)
            print(f"[ModelConfigService] Visible models saved successfully: {config.value}")
        except Exception as e:
            print(f"[ModelConfigService] ERROR committing visible models: {e}")
            self.db.rollback()
            raise

        # Invalidate cache
        self.invalidate_cache()

        return config.value

    @classmethod
    def invalidate_cache(cls) -> None:
        """
        Invalidate the model config cache.

        Call this after any configuration change to ensure
        services pick up the new values.
        """
        cls._cache = {}
        cls._cache_time = 0


# Convenience function for getting a model without instantiating the service
def get_configured_model(db: Session, model_type: str) -> str:
    """
    Get the configured model ID for a task type.

    Convenience function that creates a service instance and gets the model.

    Args:
        db: SQLAlchemy database session
        model_type: Type of model ("chat", "embedding", "vision", etc.)

    Returns:
        Model ID string
    """
    service = ModelConfigService(db)
    return service.get_model(model_type)


def get_configured_fallback(db: Session, model_type: str) -> str:
    """
    Get the configured fallback model ID for a task type.

    Args:
        db: SQLAlchemy database session
        model_type: Type of model

    Returns:
        Fallback model ID string
    """
    service = ModelConfigService(db)
    return service.get_fallback_model(model_type)


def get_default_model(model_type: str) -> str:
    """
    Get the configured default model for a task type.

    This function creates its own database session, making it suitable
    for use in services that don't have access to a session.

    Falls back to hardcoded defaults if database is unavailable.

    Args:
        model_type: Type of model ("chat", "embedding", "vision", etc.)

    Returns:
        Model ID string

    Example:
        from services.model_config_service import get_default_model
        model = get_default_model("chat")
    """
    try:
        from database import SessionLocal

        db = SessionLocal()
        try:
            service = ModelConfigService(db)
            return service.get_model(model_type)
        finally:
            db.close()
    except Exception as e:
        # Fall back to hardcoded default if DB is unavailable
        print(f"[ModelConfigService] DB unavailable, using fallback: {e}")
        return ModelConfigService.DEFAULT_MODELS.get(model_type, "")
