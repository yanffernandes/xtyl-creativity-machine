"""
Application Configuration

Centralizes all environment variables and configuration settings.
This module ensures consistent configuration across all services.
"""

import os
from functools import lru_cache


@lru_cache()
def get_app_url() -> str:
    """
    Get the application URL for HTTP-Referer headers.

    This is used in OpenRouter API calls and should be set to the
    production domain in deployment.

    Environment variable: APP_URL
    Default: https://xtyl.app
    """
    return os.getenv("APP_URL", "https://xtyl.app")


@lru_cache()
def get_app_title() -> str:
    """
    Get the application title for X-Title headers.

    Environment variable: APP_TITLE
    Default: XTYL Creativity Machine
    """
    return os.getenv("APP_TITLE", "XTYL Creativity Machine")


@lru_cache()
def get_frontend_url() -> str:
    """
    Get the frontend URL for email links and redirects.

    Environment variable: FRONTEND_URL
    Default: http://localhost:3000 (development)
    """
    return os.getenv("FRONTEND_URL", "http://localhost:3000")


def get_openrouter_headers(api_key: str) -> dict:
    """
    Get standard headers for OpenRouter API calls.

    Args:
        api_key: The OpenRouter API key

    Returns:
        Dictionary with all required headers for OpenRouter
    """
    return {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": get_app_url(),
        "X-Title": get_app_title(),
        "Content-Type": "application/json"
    }


# Supabase configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# OpenRouter configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# R2/S3 Storage configuration
R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_BUCKET = os.getenv("R2_BUCKET", "xtyl-storage")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL")

# Email configuration
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@xtyl.com")
FROM_NAME = os.getenv("FROM_NAME", "XTYL Creativity Machine")
