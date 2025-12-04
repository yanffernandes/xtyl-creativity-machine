"""
Integration Test Template for Backend Routers

Copy this template when creating new integration tests for API endpoints.
Location: backend/tests/integration/routers/test_<router_name>.py
"""

import pytest
from httpx import AsyncClient


class TestEndpointName:
    """Test suite for /endpoint API."""

    # =========================================================================
    # Authentication Tests
    # =========================================================================

    def test_requires_authentication(self, test_client):
        """Test that endpoint requires authentication."""
        response = test_client.get("/api/resource")
        assert response.status_code == 401

    def test_rejects_invalid_token(self, test_client):
        """Test that invalid token is rejected."""
        response = test_client.get(
            "/api/resource",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401

    # =========================================================================
    # GET Endpoints
    # =========================================================================

    def test_list_returns_empty_initially(self, test_client, auth_headers):
        """Test listing resources returns empty list for new user."""
        response = test_client.get("/api/resources", headers=auth_headers)

        assert response.status_code == 200
        assert response.json()["items"] == []

    def test_list_returns_user_resources(self, test_client, auth_headers, sample_resource):
        """Test listing returns only user's resources."""
        response = test_client.get("/api/resources", headers=auth_headers)

        assert response.status_code == 200
        items = response.json()["items"]
        assert len(items) == 1
        assert items[0]["id"] == sample_resource.id

    def test_get_by_id_not_found(self, test_client, auth_headers):
        """Test getting non-existent resource."""
        response = test_client.get(
            "/api/resources/nonexistent-id",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_get_by_id_success(self, test_client, auth_headers, sample_resource):
        """Test getting existing resource."""
        response = test_client.get(
            f"/api/resources/{sample_resource.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json()["id"] == sample_resource.id

    # =========================================================================
    # POST Endpoints
    # =========================================================================

    def test_create_requires_body(self, test_client, auth_headers):
        """Test that create requires request body."""
        response = test_client.post(
            "/api/resources",
            headers=auth_headers,
            json={}
        )
        assert response.status_code == 422  # Validation error

    def test_create_validates_required_fields(self, test_client, auth_headers):
        """Test validation of required fields."""
        response = test_client.post(
            "/api/resources",
            headers=auth_headers,
            json={"optional_field": "value"}
        )

        assert response.status_code == 422
        errors = response.json()["detail"]
        assert any("name" in str(e) for e in errors)

    def test_create_success(self, test_client, auth_headers):
        """Test successful resource creation."""
        response = test_client.post(
            "/api/resources",
            headers=auth_headers,
            json={"name": "New Resource", "description": "Test"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Resource"
        assert "id" in data

    # =========================================================================
    # PUT/PATCH Endpoints
    # =========================================================================

    def test_update_not_found(self, test_client, auth_headers):
        """Test updating non-existent resource."""
        response = test_client.patch(
            "/api/resources/nonexistent-id",
            headers=auth_headers,
            json={"name": "Updated"}
        )
        assert response.status_code == 404

    def test_update_success(self, test_client, auth_headers, sample_resource):
        """Test successful update."""
        response = test_client.patch(
            f"/api/resources/{sample_resource.id}",
            headers=auth_headers,
            json={"name": "Updated Name"}
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    def test_cannot_update_others_resource(self, test_client, other_user_headers, sample_resource):
        """Test that users cannot update others' resources."""
        response = test_client.patch(
            f"/api/resources/{sample_resource.id}",
            headers=other_user_headers,
            json={"name": "Hacked"}
        )
        assert response.status_code == 403

    # =========================================================================
    # DELETE Endpoints
    # =========================================================================

    def test_delete_not_found(self, test_client, auth_headers):
        """Test deleting non-existent resource."""
        response = test_client.delete(
            "/api/resources/nonexistent-id",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_delete_success(self, test_client, auth_headers, sample_resource, db_session):
        """Test successful deletion."""
        response = test_client.delete(
            f"/api/resources/{sample_resource.id}",
            headers=auth_headers
        )

        assert response.status_code == 204

        # Verify deleted
        from models import Resource
        deleted = db_session.query(Resource).filter_by(id=sample_resource.id).first()
        assert deleted is None  # or assert deleted.is_deleted for soft delete

    # =========================================================================
    # Fixtures
    # =========================================================================

    @pytest.fixture
    def sample_resource(self, db_session, test_user):
        """Create a sample resource for testing."""
        from models import Resource
        resource = Resource(
            name="Test Resource",
            user_id=test_user.id
        )
        db_session.add(resource)
        db_session.commit()
        return resource
