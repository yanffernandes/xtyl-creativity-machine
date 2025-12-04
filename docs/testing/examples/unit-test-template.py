"""
Unit Test Template for Backend Services

Copy this template when creating new unit tests for services.
Location: backend/tests/unit/services/test_<service_name>.py
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestServiceName:
    """Test suite for ServiceName functionality."""

    @pytest.fixture
    def service(self):
        """Create a fresh service instance for each test."""
        from services.service_name import ServiceName
        return ServiceName()

    @pytest.fixture
    def mock_dependency(self):
        """Mock external dependency."""
        mock = MagicMock()
        mock.some_method.return_value = {"result": "value"}
        return mock

    # =========================================================================
    # Happy Path Tests
    # =========================================================================

    def test_basic_operation_returns_expected_result(self, service):
        """Test that basic operation works correctly."""
        # Arrange
        input_data = {"key": "value"}

        # Act
        result = service.process(input_data)

        # Assert
        assert result is not None
        assert "output" in result

    @pytest.mark.asyncio
    async def test_async_operation_completes_successfully(self, service):
        """Test async operations."""
        # Arrange
        input_data = {"key": "value"}

        # Act
        result = await service.async_process(input_data)

        # Assert
        assert result["status"] == "success"

    # =========================================================================
    # Edge Cases
    # =========================================================================

    def test_handles_empty_input(self, service):
        """Test behavior with empty input."""
        result = service.process({})
        assert result == {"default": True}

    def test_handles_none_input(self, service):
        """Test behavior with None input."""
        with pytest.raises(ValueError, match="Input cannot be None"):
            service.process(None)

    # =========================================================================
    # Error Handling
    # =========================================================================

    @patch('services.service_name.external_api')
    def test_handles_api_error_gracefully(self, mock_api, service):
        """Test error handling when external API fails."""
        # Arrange
        mock_api.call.side_effect = Exception("API Error")

        # Act & Assert
        with pytest.raises(ServiceError) as exc_info:
            service.call_external()

        assert "API Error" in str(exc_info.value)

    @patch('services.service_name.external_api')
    async def test_handles_timeout(self, mock_api, service):
        """Test timeout handling."""
        mock_api.call = AsyncMock(side_effect=TimeoutError())

        with pytest.raises(ServiceError, match="timeout"):
            await service.async_call_external()

    # =========================================================================
    # Mock Usage Examples
    # =========================================================================

    @patch('services.service_name.database')
    def test_with_mocked_database(self, mock_db, service):
        """Test with mocked database."""
        # Setup mock
        mock_db.query.return_value = [{"id": 1, "name": "test"}]

        # Act
        result = service.get_items()

        # Assert
        mock_db.query.assert_called_once()
        assert len(result) == 1

    def test_with_fixture_mock(self, service, mock_dependency):
        """Test using fixture-provided mock."""
        service.dependency = mock_dependency

        result = service.use_dependency()

        mock_dependency.some_method.assert_called()
        assert result == {"result": "value"}

    # =========================================================================
    # Parameterized Tests
    # =========================================================================

    @pytest.mark.parametrize("input_value,expected", [
        ("valid", True),
        ("invalid", False),
        ("", False),
        (None, False),
    ])
    def test_validation_with_multiple_inputs(self, service, input_value, expected):
        """Test validation with various inputs."""
        result = service.validate(input_value)
        assert result == expected
