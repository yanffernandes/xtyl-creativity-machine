"""
Unit tests for Image Generation Service.

Tests image generation via OpenRouter API, model fetching, and image storage.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
import base64


class TestFetchOpenRouterModels:
    """Tests for fetching available image generation models."""

    @pytest.mark.asyncio
    async def test_fetch_models_returns_image_capable_models(self):
        """Should return only models that support image generation."""
        from image_generation_service import fetch_openrouter_models

        mock_response_data = {
            "data": [
                {
                    "id": "openai/dall-e-3",
                    "name": "DALL-E 3",
                    "architecture": {"output_modalities": ["image", "text"]},
                    "description": "Image generation model"
                },
                {
                    "id": "openai/gpt-4",
                    "name": "GPT-4",
                    "architecture": {"output_modalities": ["text"]},
                    "description": "Text model"
                },
                {
                    "id": "black-forest-labs/flux-pro",
                    "name": "Flux Pro",
                    "architecture": {"output_modalities": ["image"]},
                    "description": "Image generation model"
                }
            ]
        }

        # Clear cache before test
        import image_generation_service
        image_generation_service._models_cache = None
        image_generation_service._models_cache_timestamp = None

        with patch('image_generation_service.httpx.AsyncClient') as mock_client:
            # Create proper async mock
            mock_response = MagicMock()
            mock_response.json.return_value = mock_response_data
            mock_response.raise_for_status = MagicMock()

            mock_instance = AsyncMock()
            mock_instance.get = AsyncMock(return_value=mock_response)

            # Set up async context manager
            mock_client.return_value.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_client.return_value.__aexit__ = AsyncMock(return_value=None)

            with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
                models = await fetch_openrouter_models()

            # Should only return models with "image" in output_modalities
            assert len(models) == 2
            model_ids = [m["id"] for m in models]
            assert "openai/dall-e-3" in model_ids
            assert "black-forest-labs/flux-pro" in model_ids
            assert "openai/gpt-4" not in model_ids

    @pytest.mark.asyncio
    async def test_fetch_models_uses_cache(self):
        """Should use cached models if cache is still valid."""
        import image_generation_service

        # Set up cache
        cached_models = [{"id": "cached-model", "name": "Cached"}]
        image_generation_service._models_cache = cached_models
        image_generation_service._models_cache_timestamp = datetime.utcnow()

        with patch('image_generation_service.httpx.AsyncClient') as mock_client:
            models = await image_generation_service.fetch_openrouter_models()

            # Should not have made an API call
            mock_client.assert_not_called()
            assert models == cached_models

        # Clean up
        image_generation_service._models_cache = None
        image_generation_service._models_cache_timestamp = None

    @pytest.mark.asyncio
    async def test_fetch_models_returns_fallback_on_error(self):
        """Should return fallback models when API call fails."""
        from image_generation_service import fetch_openrouter_models, get_fallback_models

        import image_generation_service
        image_generation_service._models_cache = None
        image_generation_service._models_cache_timestamp = None

        with patch('image_generation_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_instance
            mock_instance.get.side_effect = Exception("Network error")

            with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
                models = await fetch_openrouter_models()

            # Should return fallback models
            fallback = get_fallback_models()
            assert len(models) == len(fallback)


class TestGetFallbackModels:
    """Tests for fallback models list."""

    def test_fallback_models_exist(self):
        """Should return a non-empty list of fallback models."""
        from image_generation_service import get_fallback_models

        models = get_fallback_models()

        assert len(models) > 0
        assert all("id" in m for m in models)
        assert all("name" in m for m in models)


class TestGenerateImageOpenRouter:
    """Tests for image generation via OpenRouter API."""

    @pytest.mark.asyncio
    async def test_generate_image_success(self):
        """Should successfully generate an image."""
        from image_generation_service import generate_image_openrouter

        mock_response = {
            "choices": [{
                "message": {
                    "images": [{
                        "type": "image_url",
                        "image_url": {"url": "data:image/png;base64,iVBORw0KGgo="}
                    }]
                }
            }],
            "usage": {"total_tokens": 100}
        }

        with patch('image_generation_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_instance
            mock_instance.post.return_value.json.return_value = mock_response
            mock_instance.post.return_value.raise_for_status = MagicMock()

            with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
                result = await generate_image_openrouter(
                    prompt="A beautiful sunset",
                    model="openai/dall-e-3"
                )

            assert "image_url" in result
            assert result["prompt"] == "A beautiful sunset"
            assert result["model"] == "openai/dall-e-3"

    @pytest.mark.asyncio
    async def test_generate_image_with_aspect_ratio(self):
        """Should pass aspect ratio to the API."""
        from image_generation_service import generate_image_openrouter

        mock_response = {
            "choices": [{
                "message": {
                    "images": [{"image_url": {"url": "data:image/png;base64,abc"}}]
                }
            }]
        }

        with patch('image_generation_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_instance
            mock_instance.post.return_value.json.return_value = mock_response
            mock_instance.post.return_value.raise_for_status = MagicMock()

            with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
                result = await generate_image_openrouter(
                    prompt="Test",
                    aspect_ratio="16:9"
                )

            assert result["aspect_ratio"] == "16:9"

    @pytest.mark.asyncio
    async def test_generate_image_raises_on_missing_api_key(self):
        """Should raise error when API key is not configured."""
        from image_generation_service import generate_image_openrouter

        with patch.dict('os.environ', {}, clear=True):
            # Remove OPENROUTER_API_KEY if it exists
            import os
            os.environ.pop('OPENROUTER_API_KEY', None)

            with pytest.raises(ValueError, match="OPENROUTER_API_KEY not configured"):
                await generate_image_openrouter(prompt="Test")

    @pytest.mark.asyncio
    async def test_generate_image_handles_402_error(self):
        """Should handle insufficient credits error (402)."""
        from image_generation_service import generate_image_openrouter
        import httpx

        with patch('image_generation_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_instance

            # Create a mock response for 402 error
            mock_response = MagicMock()
            mock_response.status_code = 402
            mock_response.text = '{"error": {"message": "Insufficient credits"}}'
            mock_response.json.return_value = {"error": {"message": "Insufficient credits"}}

            error = httpx.HTTPStatusError(
                message="402",
                request=MagicMock(),
                response=mock_response
            )
            mock_instance.post.return_value.raise_for_status.side_effect = error

            with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
                with pytest.raises(Exception, match="CRÉDITOS INSUFICIENTES"):
                    await generate_image_openrouter(prompt="Test")

    @pytest.mark.asyncio
    async def test_generate_image_handles_no_image_in_response(self):
        """Should raise error when no image is found in response."""
        from image_generation_service import generate_image_openrouter

        mock_response = {
            "choices": [{
                "message": {
                    "content": "I cannot generate images"
                }
            }]
        }

        with patch('image_generation_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_instance
            mock_instance.post.return_value.json.return_value = mock_response
            mock_instance.post.return_value.raise_for_status = MagicMock()

            with patch.dict('os.environ', {'OPENROUTER_API_KEY': 'test-key'}):
                with pytest.raises(ValueError, match="No image found"):
                    await generate_image_openrouter(prompt="Test")


class TestDownloadAndStoreImage:
    """Tests for downloading and storing images."""

    @pytest.mark.asyncio
    async def test_download_from_url(self):
        """Should download image from URL and upload to storage."""
        from image_generation_service import download_and_store_image

        with patch('image_generation_service.httpx.AsyncClient') as mock_client:
            mock_instance = AsyncMock()
            mock_client.return_value.__aenter__.return_value = mock_instance
            mock_instance.get.return_value.content = b'\x89PNG\r\n\x1a\n'  # PNG header
            mock_instance.get.return_value.raise_for_status = MagicMock()

            with patch('image_generation_service.upload_file') as mock_upload:
                mock_upload.return_value = "https://storage.example.com/image.png"

                result = await download_and_store_image(
                    image_url="https://example.com/image.png",
                    project_id="project-123"
                )

                mock_upload.assert_called_once()
                assert result["file_url"] == "https://storage.example.com/image.png"

    @pytest.mark.asyncio
    async def test_process_base64_data_url(self):
        """Should process base64 data URL correctly."""
        from image_generation_service import download_and_store_image

        # Create a simple base64 image
        image_bytes = b'\x89PNG\r\n\x1a\n'
        base64_data = base64.b64encode(image_bytes).decode()
        data_url = f"data:image/png;base64,{base64_data}"

        with patch('image_generation_service.upload_file') as mock_upload:
            mock_upload.return_value = "https://storage.example.com/image.png"

            result = await download_and_store_image(
                image_url=data_url,
                project_id="project-123"
            )

            mock_upload.assert_called_once()
            # Verify the decoded bytes were passed to upload
            call_args = mock_upload.call_args
            assert call_args.kwargs["file_data"] == image_bytes


class TestStoreBase64Image:
    """Tests for storing base64-encoded images."""

    @pytest.mark.asyncio
    async def test_store_base64_with_prefix(self):
        """Should handle base64 data with data URL prefix."""
        from image_generation_service import store_base64_image

        image_bytes = b'\x89PNG\r\n\x1a\n'
        base64_data = base64.b64encode(image_bytes).decode()
        data_with_prefix = f"data:image/png;base64,{base64_data}"

        with patch('image_generation_service.upload_file') as mock_upload:
            mock_upload.return_value = "https://storage.example.com/image.png"

            result = await store_base64_image(
                image_data=data_with_prefix,
                project_id="project-123"
            )

            mock_upload.assert_called_once()
            assert result["file_url"] == "https://storage.example.com/image.png"

    @pytest.mark.asyncio
    async def test_store_base64_without_prefix(self):
        """Should handle raw base64 data without prefix."""
        from image_generation_service import store_base64_image

        image_bytes = b'\x89PNG\r\n\x1a\n'
        base64_data = base64.b64encode(image_bytes).decode()

        with patch('image_generation_service.upload_file') as mock_upload:
            mock_upload.return_value = "https://storage.example.com/image.png"

            result = await store_base64_image(
                image_data=base64_data,
                project_id="project-123"
            )

            mock_upload.assert_called_once()


class TestGenerateAndStoreImage:
    """Tests for the complete generate and store workflow."""

    @pytest.mark.asyncio
    async def test_generate_and_store_complete_workflow(self):
        """Should generate image and store it successfully."""
        from image_generation_service import generate_and_store_image

        with patch('image_generation_service.generate_image_openrouter', new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = {
                "image_url": "data:image/png;base64,iVBORw0KGgo=",
                "model": "openai/dall-e-3",
                "prompt": "A sunset",
                "aspect_ratio": "1:1",
                "quality": "standard",
                "style": None,
                "usage": {}
            }

            with patch('image_generation_service.download_and_store_image', new_callable=AsyncMock) as mock_store:
                mock_store.return_value = {
                    "file_url": "https://storage.example.com/image.png",
                    "thumbnail_url": "https://storage.example.com/thumb.png"
                }

                result = await generate_and_store_image(
                    prompt="A sunset",
                    project_id="project-123"
                )

                assert result["file_url"] == "https://storage.example.com/image.png"
                assert "generation_metadata" in result
                assert result["generation_metadata"]["prompt"] == "A sunset"

    @pytest.mark.asyncio
    async def test_generate_and_store_with_reference_images(self):
        """Should pass reference images to generation."""
        from image_generation_service import generate_and_store_image

        with patch('image_generation_service.generate_image_openrouter', new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = {
                "image_url": "data:image/png;base64,abc",
                "model": "test",
                "prompt": "test",
                "aspect_ratio": "1:1",
                "quality": "standard",
                "style": None,
                "usage": {}
            }

            with patch('image_generation_service.download_and_store_image', new_callable=AsyncMock) as mock_store:
                mock_store.return_value = {
                    "file_url": "https://storage.example.com/image.png",
                    "thumbnail_url": "https://storage.example.com/thumb.png"
                }

                await generate_and_store_image(
                    prompt="Style like reference",
                    project_id="project-123",
                    reference_image_urls=["https://example.com/ref1.png"]
                )

                # Verify reference images were passed
                call_kwargs = mock_gen.call_args.kwargs
                assert "reference_image_urls" in call_kwargs
                assert len(call_kwargs["reference_image_urls"]) == 1


class TestGetAvailableModels:
    """Tests for getting available models list."""

    @pytest.mark.asyncio
    async def test_get_available_models_sorted(self):
        """Should return models sorted by name."""
        from image_generation_service import get_available_models

        with patch('image_generation_service.fetch_openrouter_models', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.return_value = [
                {"id": "z-model", "name": "Z Model"},
                {"id": "a-model", "name": "A Model"},
                {"id": "m-model", "name": "M Model"}
            ]

            models = await get_available_models()

            assert models[0]["name"] == "A Model"
            assert models[1]["name"] == "M Model"
            assert models[2]["name"] == "Z Model"

    @pytest.mark.asyncio
    async def test_get_available_models_returns_fallback_on_error(self):
        """Should return fallback models on error."""
        from image_generation_service import get_available_models, get_fallback_models

        with patch('image_generation_service.fetch_openrouter_models', new_callable=AsyncMock) as mock_fetch:
            mock_fetch.side_effect = Exception("API error")

            models = await get_available_models()

            # Should return fallback models
            assert len(models) > 0
