"""
AI Model Pricing Configuration

Pricing is in USD per 1M tokens (input/output).
Sources:
- OpenRouter: https://openrouter.ai/models
- Anthropic: https://www.anthropic.com/api
- OpenAI: https://openai.com/pricing

Last updated: 2025-01-22
"""

from typing import Dict, Tuple

# Format: "provider/model-name": {"input": price_per_1m_tokens, "output": price_per_1m_tokens}
MODEL_PRICING: Dict[str, Dict[str, float]] = {
    # Anthropic Claude models
    "anthropic/claude-3-5-sonnet": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3-5-sonnet-20241022": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3-5-sonnet-20240620": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3-sonnet": {"input": 3.0, "output": 15.0},
    "anthropic/claude-3-opus": {"input": 15.0, "output": 75.0},
    "anthropic/claude-3-haiku": {"input": 0.25, "output": 1.25},
    "anthropic/claude-3-haiku-20240307": {"input": 0.25, "output": 1.25},

    # OpenAI GPT models
    "openai/gpt-4-turbo": {"input": 10.0, "output": 30.0},
    "openai/gpt-4": {"input": 30.0, "output": 60.0},
    "openai/gpt-4-32k": {"input": 60.0, "output": 120.0},
    "openai/gpt-3.5-turbo": {"input": 0.5, "output": 1.5},
    "openai/gpt-3.5-turbo-16k": {"input": 3.0, "output": 4.0},
    "openai/gpt-4o": {"input": 5.0, "output": 15.0},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.6},

    # Google Gemini models
    "google/gemini-pro": {"input": 0.5, "output": 1.5},
    "google/gemini-pro-vision": {"input": 0.5, "output": 1.5},
    "google/gemini-1.5-pro": {"input": 3.5, "output": 10.5},
    "google/gemini-1.5-flash": {"input": 0.075, "output": 0.3},
    "google/gemini-2.0-flash-exp": {"input": 0.0, "output": 0.0},  # Free tier

    # Meta Llama models
    "meta-llama/llama-3.1-405b-instruct": {"input": 3.0, "output": 3.0},
    "meta-llama/llama-3.1-70b-instruct": {"input": 0.52, "output": 0.75},
    "meta-llama/llama-3.1-8b-instruct": {"input": 0.06, "output": 0.06},
    "meta-llama/llama-3-70b-instruct": {"input": 0.59, "output": 0.79},
    "meta-llama/llama-3-8b-instruct": {"input": 0.06, "output": 0.06},

    # Mistral models
    "mistralai/mistral-large": {"input": 4.0, "output": 12.0},
    "mistralai/mistral-medium": {"input": 2.7, "output": 8.1},
    "mistralai/mistral-small": {"input": 1.0, "output": 3.0},
    "mistralai/mixtral-8x7b-instruct": {"input": 0.24, "output": 0.24},

    # Cohere models
    "cohere/command-r-plus": {"input": 3.0, "output": 15.0},
    "cohere/command-r": {"input": 0.5, "output": 1.5},

    # DeepSeek models
    "deepseek/deepseek-chat": {"input": 0.14, "output": 0.28},
    "deepseek/deepseek-coder": {"input": 0.14, "output": 0.28},

    # Qwen models
    "qwen/qwen-2-72b-instruct": {"input": 0.35, "output": 0.35},
    "qwen/qwen-2.5-72b-instruct": {"input": 0.35, "output": 0.35},
}

# Default pricing for unknown models (use conservative estimate)
DEFAULT_PRICING = {"input": 1.0, "output": 3.0}


def get_model_pricing(model: str) -> Tuple[float, float]:
    """
    Get pricing for a given model.

    Args:
        model: Model identifier (e.g., "anthropic/claude-3-5-sonnet")

    Returns:
        Tuple of (input_price_per_1m, output_price_per_1m)
    """
    pricing = MODEL_PRICING.get(model, DEFAULT_PRICING)
    return pricing["input"], pricing["output"]


def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> Tuple[float, float, float]:
    """
    Calculate cost for a model invocation.

    Args:
        model: Model identifier
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens

    Returns:
        Tuple of (input_cost, output_cost, total_cost) in USD
    """
    input_price, output_price = get_model_pricing(model)

    # Convert from price per 1M tokens to actual cost
    input_cost = (input_tokens / 1_000_000) * input_price
    output_cost = (output_tokens / 1_000_000) * output_price
    total_cost = input_cost + output_cost

    return round(input_cost, 6), round(output_cost, 6), round(total_cost, 6)


def estimate_cost(model: str, total_tokens: int, output_ratio: float = 0.3) -> float:
    """
    Estimate cost based on total tokens and estimated output ratio.

    Args:
        model: Model identifier
        total_tokens: Total number of tokens
        output_ratio: Estimated ratio of output tokens (default 0.3 = 30% output)

    Returns:
        Estimated total cost in USD
    """
    output_tokens = int(total_tokens * output_ratio)
    input_tokens = total_tokens - output_tokens

    _, _, total_cost = calculate_cost(model, input_tokens, output_tokens)
    return total_cost


# Image Model Pricing (per image)
# Format: "provider/model-name": {"standard": price, "hd": price}
IMAGE_MODEL_PRICING: Dict[str, Dict[str, float]] = {
    "black-forest-labs/flux-1.1-pro": {"standard": 0.04, "hd": 0.04},
    "black-forest-labs/flux-pro": {"standard": 0.05, "hd": 0.05},
    "openai/dall-e-3": {"standard": 0.04, "hd": 0.08},
    "openai/dall-e-2": {"standard": 0.02, "hd": 0.02},
    "stabilityai/stable-diffusion-xl-beta-v2-2-2": {"standard": 0.01, "hd": 0.01},
    "google/gemini-pro-vision": {"standard": 0.0, "hd": 0.0},  # Currently free in preview
}

DEFAULT_IMAGE_PRICE = 0.04


def calculate_image_cost(model: str, size: str = "1024x1024", quality: str = "standard") -> float:
    """
    Calculate cost for image generation.

    Args:
        model: Model identifier
        size: Image dimensions
        quality: Image quality (standard, hd)

    Returns:
        Total cost in USD
    """
    # Normalize model name (remove provider if needed, but our dict keys have provider)
    pricing = IMAGE_MODEL_PRICING.get(model)
    
    if not pricing:
        # Try to find by partial match
        for key, val in IMAGE_MODEL_PRICING.items():
            if model in key or key in model:
                pricing = val
                break
    
    if not pricing:
        return DEFAULT_IMAGE_PRICE

    # DALL-E 3 HD pricing logic
    if "dall-e-3" in model and quality == "hd":
        return pricing.get("hd", pricing["standard"])
    
    return pricing.get("standard", DEFAULT_IMAGE_PRICE)
