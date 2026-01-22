"""
Security Middleware - Feature 025: Security Hardening

Provides security headers and rate limiting middleware for FastAPI.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os


# Configure rate limiter with Redis backend (falls back to memory if Redis unavailable)
def get_limiter():
    """Get rate limiter instance configured with Redis or in-memory backend."""
    redis_url = os.getenv("REDIS_URL", "")

    # Skip Redis if not configured or in development without Redis
    if not redis_url or redis_url == "redis://redis:6379/0":
        # Use in-memory storage for local development
        print("⚠️ Rate limiter using in-memory storage (no Redis)")
        return Limiter(
            key_func=get_remote_address,
            strategy="fixed-window"
        )

    try:
        limiter = Limiter(
            key_func=get_remote_address,
            storage_uri=redis_url,
            strategy="fixed-window"
        )
        print(f"✓ Rate limiter connected to Redis: {redis_url[:20]}...")
        return limiter
    except Exception as e:
        # Fallback to in-memory storage if Redis is unavailable
        print(f"⚠️ Redis unavailable ({e}), rate limiter using in-memory storage")
        return Limiter(
            key_func=get_remote_address,
            strategy="fixed-window"
        )


# Global limiter instance
limiter = get_limiter()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware that adds security headers to all responses.

    Headers added:
    - X-Content-Type-Options: Prevents MIME-type sniffing
    - X-Frame-Options: Prevents clickjacking
    - X-XSS-Protection: Legacy XSS protection for older browsers
    - Strict-Transport-Security: Enforces HTTPS (in production)
    - Referrer-Policy: Controls referrer information
    - Permissions-Policy: Restricts browser features
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Prevent MIME-type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking - allow same origin only
        response.headers["X-Frame-Options"] = "SAMEORIGIN"

        # Legacy XSS protection for older browsers
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict browser features (camera, microphone, geolocation, etc.)
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        )

        # Only add HSTS in production (requires HTTPS)
        if os.getenv("ENVIRONMENT", "development") == "production":
            # Enforce HTTPS for 1 year, include subdomains
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

        return response
