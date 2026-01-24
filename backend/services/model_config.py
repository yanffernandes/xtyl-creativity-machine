"""
Model Configuration Service

Provides centralized configuration for AI models including:
- Available models per task type
- Model capabilities and limits
- Pricing information
- Performance characteristics
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from enum import Enum

class ModelProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    STABILITYAI = "stabilityai"

class TaskType(str, Enum):
    TEXT_GENERATION = "text_generation"
    IMAGE_GENERATION = "image_generation"
    EMBEDDING = "embedding"
    PROCESSING = "processing"

class ModelCapability(BaseModel):
    """Model capability definition"""
    model_id: str
    model_name: str
    provider: ModelProvider
    task_types: List[TaskType]
    max_tokens: int
    supports_streaming: bool
    supports_json_mode: bool
    supports_vision: bool
    cost_per_1k_input_tokens: float
    cost_per_1k_output_tokens: float
    context_window: int
    description: str
    recommended_for: List[str]

class ModelConfig:
    """
    Centralized model configuration
    """

    # Text Generation Models
    TEXT_MODELS = [
        ModelCapability(
            model_id="gpt-4-turbo-preview",
            model_name="GPT-4 Turbo",
            provider=ModelProvider.OPENAI,
            task_types=[TaskType.TEXT_GENERATION, TaskType.PROCESSING],
            max_tokens=4096,
            supports_streaming=True,
            supports_json_mode=True,
            supports_vision=True,
            cost_per_1k_input_tokens=0.01,
            cost_per_1k_output_tokens=0.03,
            context_window=128000,
            description="Most capable GPT-4 model with vision and JSON mode",
            recommended_for=["complex reasoning", "long documents", "structured output"]
        ),
        ModelCapability(
            model_id="gpt-4",
            model_name="GPT-4",
            provider=ModelProvider.OPENAI,
            task_types=[TaskType.TEXT_GENERATION, TaskType.PROCESSING],
            max_tokens=8192,
            supports_streaming=True,
            supports_json_mode=False,
            supports_vision=False,
            cost_per_1k_input_tokens=0.03,
            cost_per_1k_output_tokens=0.06,
            context_window=8192,
            description="Original GPT-4 model with strong reasoning",
            recommended_for=["high-quality content", "complex tasks"]
        ),
        ModelCapability(
            model_id="gpt-3.5-turbo",
            model_name="GPT-3.5 Turbo",
            provider=ModelProvider.OPENAI,
            task_types=[TaskType.TEXT_GENERATION, TaskType.PROCESSING],
            max_tokens=4096,
            supports_streaming=True,
            supports_json_mode=True,
            supports_vision=False,
            cost_per_1k_input_tokens=0.0005,
            cost_per_1k_output_tokens=0.0015,
            context_window=16385,
            description="Fast and cost-effective model for most tasks",
            recommended_for=["quick generation", "cost-sensitive tasks", "high volume"]
        ),
        ModelCapability(
            model_id="claude-3-opus-20240229",
            model_name="Claude 3 Opus",
            provider=ModelProvider.ANTHROPIC,
            task_types=[TaskType.TEXT_GENERATION, TaskType.PROCESSING],
            max_tokens=4096,
            supports_streaming=True,
            supports_json_mode=False,
            supports_vision=True,
            cost_per_1k_input_tokens=0.015,
            cost_per_1k_output_tokens=0.075,
            context_window=200000,
            description="Most capable Claude model with exceptional reasoning",
            recommended_for=["complex analysis", "creative writing", "long contexts"]
        ),
        ModelCapability(
            model_id="claude-3-sonnet-20240229",
            model_name="Claude 3 Sonnet",
            provider=ModelProvider.ANTHROPIC,
            task_types=[TaskType.TEXT_GENERATION, TaskType.PROCESSING],
            max_tokens=4096,
            supports_streaming=True,
            supports_json_mode=False,
            supports_vision=True,
            cost_per_1k_input_tokens=0.003,
            cost_per_1k_output_tokens=0.015,
            context_window=200000,
            description="Balanced performance and cost with vision capabilities",
            recommended_for=["general purpose", "balanced workloads"]
        ),
        ModelCapability(
            model_id="claude-3-haiku-20240307",
            model_name="Claude 3 Haiku",
            provider=ModelProvider.ANTHROPIC,
            task_types=[TaskType.TEXT_GENERATION, TaskType.PROCESSING],
            max_tokens=4096,
            supports_streaming=True,
            supports_json_mode=False,
            supports_vision=False,
            cost_per_1k_input_tokens=0.00025,
            cost_per_1k_output_tokens=0.00125,
            context_window=200000,
            description="Fastest and most cost-effective Claude model",
            recommended_for=["high speed", "low cost", "simple tasks"]
        ),
    ]

    # Image Generation Models
    IMAGE_MODELS = [
        ModelCapability(
            model_id="dall-e-3",
            model_name="DALL-E 3",
            provider=ModelProvider.OPENAI,
            task_types=[TaskType.IMAGE_GENERATION],
            max_tokens=0,  # Not applicable
            supports_streaming=False,
            supports_json_mode=False,
            supports_vision=False,
            cost_per_1k_input_tokens=0.0,  # Priced per image
            cost_per_1k_output_tokens=0.0,
            context_window=0,
            description="Latest DALL-E model with improved quality and prompt following",
            recommended_for=["high quality images", "detailed prompts", "creative visuals"]
        ),
        ModelCapability(
            model_id="dall-e-2",
            model_name="DALL-E 2",
            provider=ModelProvider.OPENAI,
            task_types=[TaskType.IMAGE_GENERATION],
            max_tokens=0,
            supports_streaming=False,
            supports_json_mode=False,
            supports_vision=False,
            cost_per_1k_input_tokens=0.0,
            cost_per_1k_output_tokens=0.0,
            context_window=0,
            description="Previous generation DALL-E model, still capable",
            recommended_for=["cost-effective images", "quick generation"]
        ),
        ModelCapability(
            model_id="stable-diffusion-xl-1024-v1-0",
            model_name="Stable Diffusion XL",
            provider=ModelProvider.STABILITYAI,
            task_types=[TaskType.IMAGE_GENERATION],
            max_tokens=0,
            supports_streaming=False,
            supports_json_mode=False,
            supports_vision=False,
            cost_per_1k_input_tokens=0.0,
            cost_per_1k_output_tokens=0.0,
            context_window=0,
            description="Open source high-resolution image generation",
            recommended_for=["high resolution", "artistic styles", "open source"]
        ),
    ]

    @classmethod
    def get_models_by_task_type(cls, task_type: TaskType) -> List[ModelCapability]:
        """Get all models that support a specific task type"""
        all_models = cls.TEXT_MODELS + cls.IMAGE_MODELS
        return [m for m in all_models if task_type in m.task_types]

    @classmethod
    def get_model_by_id(cls, model_id: str) -> Optional[ModelCapability]:
        """Get model configuration by ID"""
        all_models = cls.TEXT_MODELS + cls.IMAGE_MODELS
        for model in all_models:
            if model.model_id == model_id:
                return model
        return None

    @classmethod
    def get_default_model(cls, task_type: TaskType) -> Optional[ModelCapability]:
        """Get recommended default model for a task type"""
        defaults = {
            TaskType.TEXT_GENERATION: "gpt-4-turbo-preview",
            TaskType.IMAGE_GENERATION: "dall-e-3",
            TaskType.PROCESSING: "gpt-3.5-turbo",
            TaskType.EMBEDDING: "text-embedding-3-small"
        }

        default_id = defaults.get(task_type)
        return cls.get_model_by_id(default_id) if default_id else None

    @classmethod
    def validate_model_for_task(cls, model_id: str, task_type: TaskType) -> bool:
        """Check if a model supports a specific task type"""
        model = cls.get_model_by_id(model_id)
        return model is not None and task_type in model.task_types

    @classmethod
    def get_model_pricing(cls, model_id: str) -> Dict[str, float]:
        """Get pricing information for a model"""
        model = cls.get_model_by_id(model_id)
        if not model:
            return {"input": 0.0, "output": 0.0}

        return {
            "input": model.cost_per_1k_input_tokens,
            "output": model.cost_per_1k_output_tokens
        }

    @classmethod
    def estimate_cost(
        cls,
        model_id: str,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """Estimate cost for a generation task"""
        pricing = cls.get_model_pricing(model_id)
        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]
        return input_cost + output_cost

    @classmethod
    async def fetch_openrouter_models(cls) -> List[ModelCapability]:
        """Fetch models from OpenRouter and convert to ModelCapability"""
        from llm_service import list_models
        
        try:
            openrouter_models = await list_models()
            capabilities = []
            
            for m in openrouter_models:
                # Skip if already in static list
                if any(static.model_id == m["id"] for static in cls.TEXT_MODELS):
                    continue
                    
                # Determine provider from ID prefix
                provider = ModelProvider.OPENAI
                if m["id"].startswith("anthropic"):
                    provider = ModelProvider.ANTHROPIC
                elif m["id"].startswith("stability"):
                    provider = ModelProvider.STABILITYAI
                
                # Parse pricing
                pricing = m.get("pricing", {})
                input_cost = float(pricing.get("prompt", 0)) * 1000
                output_cost = float(pricing.get("completion", 0)) * 1000
                
                capabilities.append(ModelCapability(
                    model_id=m["id"],
                    model_name=m["name"],
                    provider=provider,
                    task_types=[TaskType.TEXT_GENERATION], # Assume text for now
                    max_tokens=int(m.get("context_length", 4096)), # Fallback
                    supports_streaming=True,
                    supports_json_mode=False,
                    supports_vision="vision" in m["id"].lower(),
                    cost_per_1k_input_tokens=input_cost,
                    cost_per_1k_output_tokens=output_cost,
                    context_window=int(m.get("context_length", 4096)),
                    description=m.get("description", f"Model from {provider.value}"),
                    recommended_for=[]
                ))
            return capabilities
        except Exception as e:
            print(f"Error fetching OpenRouter models: {e}")
            return []

    @classmethod
    async def get_all_text_models(cls) -> List[Dict[str, Any]]:
        """Get all text models as serializable dicts"""
        # Fetch dynamic models
        dynamic_models = await cls.fetch_openrouter_models()
        all_models = cls.TEXT_MODELS + dynamic_models
        
        return [
            {
                "id": m.model_id,
                "name": m.model_name,
                "provider": m.provider.value,
                "max_tokens": m.max_tokens,
                "context_window": m.context_window,
                "supports_streaming": m.supports_streaming,
                "supports_json_mode": m.supports_json_mode,
                "supports_vision": m.supports_vision,
                "description": m.description,
                "recommended_for": m.recommended_for,
                "pricing": {
                    "input": m.cost_per_1k_input_tokens,
                    "output": m.cost_per_1k_output_tokens
                }
            }
            for m in all_models
        ]

    @classmethod
    def get_all_image_models(cls) -> List[Dict[str, Any]]:
        """Get all image models as serializable dicts"""
        return [
            {
                "id": m.model_id,
                "name": m.model_name,
                "provider": m.provider.value,
                "description": m.description,
                "recommended_for": m.recommended_for
            }
            for m in cls.IMAGE_MODELS
        ]
