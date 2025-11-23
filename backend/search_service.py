"""
Web Search Service using Tavily API

Tavily is optimized for AI agents and provides high-quality, concise search results.
"""

import os
import httpx
from typing import List, Dict, Any, Optional

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
TAVILY_BASE_URL = "https://api.tavily.com"


class SearchService:
    """Web search service using Tavily API"""

    def __init__(self):
        self.api_key = TAVILY_API_KEY
        self.has_api_key = bool(TAVILY_API_KEY)

    async def search(
        self,
        query: str,
        max_results: int = 5,
        search_depth: str = "basic",  # "basic" or "advanced"
        include_domains: Optional[List[str]] = None,
        exclude_domains: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Perform web search

        Args:
            query: Search query
            max_results: Number of results to return (max 20)
            search_depth: "basic" (faster) or "advanced" (more comprehensive)
            include_domains: Optional list of domains to prioritize
            exclude_domains: Optional list of domains to exclude

        Returns:
            Dictionary with search results and metadata
        """
        if not self.has_api_key:
            return {
                "success": False,
                "error": "Tavily API key not configured. Please set TAVILY_API_KEY environment variable."
            }

        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": min(max_results, 20),
            "search_depth": search_depth,
            "include_answer": True,  # Get AI-generated answer
            "include_raw_content": False,  # Don't need full HTML
            "include_images": False  # Don't need images for text-based AI
        }

        if include_domains:
            payload["include_domains"] = include_domains
        if exclude_domains:
            payload["exclude_domains"] = exclude_domains

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{TAVILY_BASE_URL}/search",
                    json=payload
                )
                response.raise_for_status()
                data = response.json()

                return {
                    "success": True,
                    "query": query,
                    "answer": data.get("answer", ""),
                    "results": data.get("results", []),
                    "images": data.get("images", [])
                }

        except httpx.HTTPStatusError as e:
            error_msg = f"HTTP error: {e.response.status_code}"
            if e.response.status_code == 401:
                error_msg = "Invalid Tavily API key"
            elif e.response.status_code == 429:
                error_msg = "Rate limit exceeded"
            return {
                "success": False,
                "error": error_msg
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Search failed: {str(e)}"
            }

    async def search_news(
        self,
        query: str,
        days: int = 7,
        max_results: int = 5
    ) -> Dict[str, Any]:
        """
        Search for recent news

        Args:
            query: Search query
            days: How many days back to search (default 7)
            max_results: Number of results

        Returns:
            Search results focused on recent news
        """
        # Add recency to query
        news_query = f"{query} news recent"

        return await self.search(
            query=news_query,
            max_results=max_results,
            search_depth="advanced"  # Use advanced for better quality
        )

    async def search_with_context(
        self,
        query: str,
        context: str,
        max_results: int = 5
    ) -> Dict[str, Any]:
        """
        Search with additional context to improve results

        Args:
            query: Main search query
            context: Additional context to refine search
            max_results: Number of results

        Returns:
            Search results
        """
        # Combine query with context
        enhanced_query = f"{query} {context}"

        return await self.search(
            query=enhanced_query,
            max_results=max_results,
            search_depth="basic"
        )


# Singleton instance
search_service = SearchService()


# Helper function for use in tools
async def web_search(
    query: str,
    max_results: int = 5,
    search_type: str = "general"
) -> Dict[str, Any]:
    """
    Simplified web search function for tool use (async version)

    Args:
        query: Search query
        max_results: Number of results (1-20)
        search_type: Type of search ("general", "news")

    Returns:
        Formatted search results
    """
    if search_type == "news":
        result = await search_service.search_news(query, max_results=max_results)
    else:
        result = await search_service.search(query, max_results=max_results)

    if not result.get("success"):
        return {"error": result.get("error", "Search failed")}

    # Format results for AI consumption
    formatted_results = {
        "query": query,
        "answer": result.get("answer", ""),
        "sources": [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", "")[:500],  # Truncate to 500 chars
                "score": r.get("score", 0.0)
            }
            for r in result.get("results", [])
        ],
        "result_count": len(result.get("results", []))
    }

    return formatted_results


# Synchronous version for use in sync contexts (like tools.py)
def web_search_sync(
    query: str,
    max_results: int = 5,
    search_type: str = "general"
) -> Dict[str, Any]:
    """
    Synchronous web search function for tool use

    Args:
        query: Search query
        max_results: Number of results (1-20)
        search_type: Type of search ("general", "news")

    Returns:
        Formatted search results
    """
    if not TAVILY_API_KEY:
        return {
            "success": False,
            "error": "Tavily API key not configured. Please set TAVILY_API_KEY environment variable."
        }

    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "max_results": min(max_results, 20),
        "search_depth": "advanced" if search_type == "news" else "basic",
        "include_answer": True,
        "include_raw_content": False,
        "include_images": False
    }

    try:
        # Use synchronous httpx client
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{TAVILY_BASE_URL}/search",
                json=payload
            )
            response.raise_for_status()
            data = response.json()

            # Format results for AI consumption
            formatted_results = {
                "query": query,
                "answer": data.get("answer", ""),
                "sources": [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "content": r.get("content", "")[:500],  # Truncate to 500 chars
                        "score": r.get("score", 0.0)
                    }
                    for r in data.get("results", [])
                ],
                "result_count": len(data.get("results", []))
            }

            return formatted_results

    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP error: {e.response.status_code}"
        if e.response.status_code == 401:
            error_msg = "Invalid Tavily API key"
        elif e.response.status_code == 429:
            error_msg = "Rate limit exceeded"
        return {"error": error_msg}

    except Exception as e:
        return {"error": f"Search failed: {str(e)}"}
