"""
Integration tests for Projects Router.

Tests project settings API endpoints with real database operations.
"""

import pytest
from unittest.mock import patch, MagicMock
import uuid


class TestGetProjectSettings:
    """Tests for GET /projects/{project_id}/settings endpoint."""

    def test_get_settings_requires_auth(self, test_client, test_project):
        """Should require authentication."""
        response = test_client.get(f"/projects/{test_project.id}/settings")
        assert response.status_code == 401

    def test_get_settings_not_found(self, test_client, auth_headers):
        """Should return 404 for non-existent project."""
        fake_id = str(uuid.uuid4())
        response = test_client.get(
            f"/projects/{fake_id}/settings",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_get_settings_empty_for_new_project(
        self, test_client, auth_headers, test_project
    ):
        """Should return empty dict for project with no settings."""
        response = test_client.get(
            f"/projects/{test_project.id}/settings",
            headers=auth_headers
        )

        assert response.status_code == 200
        # May be empty dict or have default values
        assert isinstance(response.json(), dict)

    def test_get_settings_returns_saved_settings(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should return previously saved settings."""
        # Set settings on project
        test_project.settings = {
            "client_name": "Test Client",
            "target_audience": "Developers"
        }
        db_session.commit()

        response = test_client.get(
            f"/projects/{test_project.id}/settings",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data.get("client_name") == "Test Client"
        assert data.get("target_audience") == "Developers"


class TestUpdateProjectSettings:
    """Tests for PUT /projects/{project_id}/settings endpoint."""

    def test_update_settings_requires_auth(self, test_client, test_project):
        """Should require authentication."""
        response = test_client.put(
            f"/projects/{test_project.id}/settings",
            json={"client_name": "Test"}
        )
        assert response.status_code == 401

    def test_update_settings_not_found(self, test_client, auth_headers):
        """Should return 404 for non-existent project."""
        fake_id = str(uuid.uuid4())
        response = test_client.put(
            f"/projects/{fake_id}/settings",
            headers=auth_headers,
            json={"client_name": "Test"}
        )
        assert response.status_code == 404

    def test_update_settings_requires_client_name(
        self, test_client, auth_headers, test_project
    ):
        """Should require client_name field."""
        response = test_client.put(
            f"/projects/{test_project.id}/settings",
            headers=auth_headers,
            json={"target_audience": "Everyone"}  # Missing client_name
        )

        assert response.status_code in [400, 422]

    def test_update_settings_syncs_project_name(
        self, test_client, auth_headers, test_project
    ):
        """Should sync project.name with client_name."""
        response = test_client.put(
            f"/projects/{test_project.id}/settings",
            headers=auth_headers,
            json={
                "client_name": "New Client Name",
                "target_audience": "Developers"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["project_name"] == "New Client Name"

    def test_update_settings_stores_all_fields(
        self, test_client, auth_headers, test_project
    ):
        """Should store all settings fields."""
        settings = {
            "client_name": "Test Client",
            "description": "Test project description",
            "target_audience": "Software developers",
            "brand_voice": "professional_formal",
            "key_messages": ["Quality", "Innovation"],
            "competitors": ["Competitor A", "Competitor B"],
            "custom_notes": "Additional context here"
        }

        response = test_client.put(
            f"/projects/{test_project.id}/settings",
            headers=auth_headers,
            json=settings
        )

        assert response.status_code == 200
        saved_settings = response.json()["settings"]
        assert saved_settings["client_name"] == "Test Client"
        assert saved_settings["brand_voice"] == "professional_formal"
        assert len(saved_settings["key_messages"]) == 2


class TestGetProjectContext:
    """Tests for GET /projects/{project_id}/settings/context endpoint."""

    def test_get_context_requires_auth(self, test_client, test_project):
        """Should require authentication."""
        response = test_client.get(f"/projects/{test_project.id}/settings/context")
        assert response.status_code == 401

    def test_get_context_for_unconfigured_project(
        self, test_client, auth_headers, test_project
    ):
        """Should return empty context for unconfigured project."""
        response = test_client.get(
            f"/projects/{test_project.id}/settings/context",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["has_settings"] is False
        assert len(data["missing_fields"]) > 0

    def test_get_context_returns_formatted_text(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should return formatted context for AI prompts."""
        test_project.settings = {
            "client_name": "Acme Corp",
            "description": "Technology company",
            "target_audience": "Enterprise customers",
            "brand_voice": "professional_formal"
        }
        db_session.commit()

        response = test_client.get(
            f"/projects/{test_project.id}/settings/context",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["has_settings"] is True
        assert "Acme Corp" in data["formatted_context"]
        assert "Enterprise customers" in data["formatted_context"]

    def test_get_context_lists_missing_fields(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should identify fields that would improve AI responses."""
        test_project.settings = {
            "client_name": "Test Client"
            # Missing: description, target_audience, brand_voice, etc.
        }
        db_session.commit()

        response = test_client.get(
            f"/projects/{test_project.id}/settings/context",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["has_settings"] is True
        # Should suggest adding missing fields
        assert len(data["missing_fields"]) > 0


class TestBrandIdentitySettings:
    """Tests for brand identity features in project settings."""

    def test_save_brand_colors(
        self, test_client, auth_headers, test_project
    ):
        """Should save brand color palette."""
        response = test_client.put(
            f"/projects/{test_project.id}/settings",
            headers=auth_headers,
            json={
                "client_name": "Color Brand",
                "brand_identity": {
                    "color_palette": ["#FF5733", "#33FF57", "#3357FF"]
                }
            }
        )

        assert response.status_code == 200
        settings = response.json()["settings"]
        assert "brand_identity" in settings
        assert len(settings["brand_identity"]["color_palette"]) == 3

    def test_save_typography_settings(
        self, test_client, auth_headers, test_project
    ):
        """Should save typography settings."""
        response = test_client.put(
            f"/projects/{test_project.id}/settings",
            headers=auth_headers,
            json={
                "client_name": "Type Brand",
                "brand_identity": {
                    "typography": {
                        "primary": "Montserrat",
                        "secondary": "Open Sans",
                        "tertiary": "Roboto Mono"
                    }
                }
            }
        )

        assert response.status_code == 200
        settings = response.json()["settings"]
        assert settings["brand_identity"]["typography"]["primary"] == "Montserrat"

    def test_brand_identity_in_context(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should include brand identity in formatted context."""
        test_project.settings = {
            "client_name": "Brand Client",
            "brand_identity": {
                "color_palette": ["#FF5733", "#33FF57"],
                "typography": {
                    "primary": "Montserrat",
                    "secondary": "Open Sans"
                }
            }
        }
        db_session.commit()

        response = test_client.get(
            f"/projects/{test_project.id}/settings/context",
            headers=auth_headers
        )

        assert response.status_code == 200
        context = response.json()["formatted_context"]
        assert "#FF5733" in context
        assert "Montserrat" in context


class TestExtractColors:
    """Tests for color extraction from images."""

    def test_extract_colors_requires_auth(self, test_client, test_project):
        """Should require authentication."""
        response = test_client.post(
            f"/projects/{test_project.id}/extract-colors"
        )
        assert response.status_code in [401, 422]  # Auth or missing file

    def test_extract_colors_not_found_project(self, test_client, auth_headers):
        """Should return 404 for non-existent project."""
        fake_id = str(uuid.uuid4())

        # Create a simple test image
        from io import BytesIO
        image_data = BytesIO(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)

        response = test_client.post(
            f"/projects/{fake_id}/extract-colors",
            headers=auth_headers,
            files={"file": ("test.png", image_data, "image/png")}
        )

        assert response.status_code == 404

    def test_extract_colors_rejects_non_image(
        self, test_client, auth_headers, test_project
    ):
        """Should reject non-image files."""
        from io import BytesIO
        text_file = BytesIO(b"This is not an image")

        response = test_client.post(
            f"/projects/{test_project.id}/extract-colors",
            headers=auth_headers,
            files={"file": ("test.txt", text_file, "text/plain")}
        )

        assert response.status_code == 400


class TestExtractColorsFromAsset:
    """Tests for color extraction from existing assets."""

    def test_extract_from_asset_not_found(
        self, test_client, auth_headers, test_project
    ):
        """Should return 404 for non-existent asset."""
        fake_asset_id = str(uuid.uuid4())

        response = test_client.post(
            f"/projects/{test_project.id}/extract-colors-from-asset",
            headers=auth_headers,
            json={"asset_id": fake_asset_id}
        )

        assert response.status_code == 404

    def test_extract_from_asset_requires_file_url(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should require asset to have file_url."""
        from models import Document

        asset = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Asset without URL",
            media_type="image",
            status="art_ok",
            is_reference_asset=True,
            file_url=None  # No file URL
        )
        db_session.add(asset)
        db_session.commit()

        response = test_client.post(
            f"/projects/{test_project.id}/extract-colors-from-asset",
            headers=auth_headers,
            json={"asset_id": str(asset.id)}
        )

        assert response.status_code == 400
        assert "file URL" in response.json()["detail"]
