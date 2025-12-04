"""
Integration tests for Documents Router.

Tests document management API endpoints with real database operations.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import uuid
from io import BytesIO


class TestListProjectDocuments:
    """Tests for GET /documents/projects/{project_id}/documents endpoint."""

    def test_list_documents_requires_auth(self, test_client, test_project):
        """Should require authentication."""
        response = test_client.get(f"/documents/projects/{test_project.id}/documents")
        assert response.status_code == 401

    def test_list_documents_returns_empty_for_new_project(
        self, test_client, auth_headers, test_project
    ):
        """Should return empty list for project with no documents."""
        response = test_client.get(
            f"/documents/projects/{test_project.id}/documents",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_list_documents_excludes_deleted(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should not return soft-deleted documents."""
        from models import Document
        from datetime import datetime

        # Create active document
        active_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Active Doc",
            content="Content",
            status="draft",
            media_type="text"
        )

        # Create deleted document
        deleted_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Deleted Doc",
            content="Content",
            status="draft",
            media_type="text",
            deleted_at=datetime.utcnow()
        )

        db_session.add_all([active_doc, deleted_doc])
        db_session.commit()

        response = test_client.get(
            f"/documents/projects/{test_project.id}/documents",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Active Doc"


class TestGetDocument:
    """Tests for GET /documents/{document_id} endpoint."""

    def test_get_document_not_found(self, test_client, auth_headers):
        """Should return 404 for non-existent document."""
        fake_id = str(uuid.uuid4())
        response = test_client.get(
            f"/documents/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_get_document_success(self, test_client, auth_headers, test_document):
        """Should return document details."""
        response = test_client.get(
            f"/documents/{test_document.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_document.id)
        assert data["title"] == test_document.title


class TestCreateDocument:
    """Tests for POST /documents/projects/{project_id}/documents endpoint."""

    def test_create_document_success(self, test_client, auth_headers, test_project):
        """Should create a new document."""
        response = test_client.post(
            f"/documents/projects/{test_project.id}/documents",
            headers=auth_headers,
            json={
                "title": "New Document",
                "content": "# Heading\n\nContent here",
                "status": "draft",
                "media_type": "text"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Document"
        assert data["project_id"] == str(test_project.id)
        assert data["status"] == "draft"


class TestUpdateDocument:
    """Tests for PUT /documents/{document_id} endpoint."""

    def test_update_document_not_found(self, test_client, auth_headers):
        """Should return 404 for non-existent document."""
        fake_id = str(uuid.uuid4())
        response = test_client.put(
            f"/documents/{fake_id}",
            headers=auth_headers,
            json={"title": "Updated"}
        )
        assert response.status_code == 404

    def test_update_document_title(self, test_client, auth_headers, test_document):
        """Should update document title."""
        response = test_client.put(
            f"/documents/{test_document.id}",
            headers=auth_headers,
            json={"title": "Updated Title"}
        )

        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    def test_update_document_content(self, test_client, auth_headers, test_document):
        """Should update document content."""
        new_content = "# New Content\n\nUpdated body text"
        response = test_client.put(
            f"/documents/{test_document.id}",
            headers=auth_headers,
            json={"content": new_content}
        )

        assert response.status_code == 200
        assert response.json()["content"] == new_content


class TestDeleteDocument:
    """Tests for DELETE /documents/{document_id} endpoint."""

    def test_soft_delete_document(self, test_client, auth_headers, test_document):
        """Should soft delete document by default."""
        response = test_client.delete(
            f"/documents/{test_document.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "archived" in data["message"].lower()

    def test_hard_delete_document(self, test_client, auth_headers, test_document):
        """Should permanently delete with hard_delete flag."""
        response = test_client.delete(
            f"/documents/{test_document.id}?hard_delete=true",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert "permanently deleted" in response.json()["message"].lower()


class TestRestoreDocument:
    """Tests for POST /documents/{document_id}/restore endpoint."""

    def test_restore_archived_document(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should restore a soft-deleted document."""
        from models import Document
        from datetime import datetime

        doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Archived Doc",
            content="Content",
            status="draft",
            media_type="text",
            deleted_at=datetime.utcnow()
        )
        db_session.add(doc)
        db_session.commit()

        response = test_client.post(
            f"/documents/{doc.id}/restore",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert "restored" in response.json()["message"].lower()


class TestMoveDocument:
    """Tests for POST /documents/{document_id}/move endpoint."""

    def test_move_document_to_root(self, test_client, auth_headers, test_document):
        """Should move document to root (no folder)."""
        response = test_client.post(
            f"/documents/{test_document.id}/move",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["folder_id"] is None


class TestListArchivedDocuments:
    """Tests for GET /documents/projects/{project_id}/archived endpoint."""

    def test_list_archived_documents(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should return only archived documents."""
        from models import Document
        from datetime import datetime

        # Create archived document
        archived_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Archived Doc",
            content="Content",
            status="draft",
            media_type="text",
            deleted_at=datetime.utcnow()
        )
        db_session.add(archived_doc)
        db_session.commit()

        response = test_client.get(
            f"/documents/projects/{test_project.id}/archived",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] >= 1
        assert any(d["title"] == "Archived Doc" for d in data["documents"])


class TestDocumentExport:
    """Tests for document export endpoints."""

    def test_export_pdf_not_found(self, test_client, auth_headers):
        """Should return 404 for non-existent document."""
        fake_id = str(uuid.uuid4())
        response = test_client.get(
            f"/documents/{fake_id}/export/pdf",
            headers=auth_headers
        )
        assert response.status_code == 404

    def test_export_pdf_requires_text_document(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should reject non-text documents for PDF export."""
        from models import Document

        image_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Image",
            media_type="image",
            status="art_ok"
        )
        db_session.add(image_doc)
        db_session.commit()

        response = test_client.get(
            f"/documents/{image_doc.id}/export/pdf",
            headers=auth_headers
        )

        assert response.status_code == 400
        assert "text documents" in response.json()["detail"].lower()

    def test_export_markdown_success(self, test_client, auth_headers, test_document):
        """Should export document as markdown."""
        response = test_client.get(
            f"/documents/{test_document.id}/export/md",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "text/markdown; charset=utf-8"


class TestDocumentSharing:
    """Tests for document sharing endpoints."""

    def test_create_share_link(self, test_client, auth_headers, test_document):
        """Should create a share link for a document."""
        response = test_client.post(
            f"/documents/{test_document.id}/share",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "share_token" in data
        assert data["is_public"] is True

    def test_create_share_link_with_expiry(self, test_client, auth_headers, test_document):
        """Should create share link with expiration."""
        response = test_client.post(
            f"/documents/{test_document.id}/share?expires_in_days=7",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["expires_at"] is not None

    def test_revoke_share_link(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should revoke share link."""
        from models import Document

        shared_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Shared Doc",
            content="Content",
            media_type="text",
            status="draft",
            is_public=True,
            share_token="test-token"
        )
        db_session.add(shared_doc)
        db_session.commit()

        response = test_client.delete(
            f"/documents/{shared_doc.id}/share",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json()["is_public"] is False

    def test_get_shared_document_public(
        self, test_client, test_project, db_session
    ):
        """Should access shared document without authentication."""
        from models import Document

        shared_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Public Doc",
            content="Public content",
            media_type="text",
            status="draft",
            is_public=True,
            share_token="public-test-token"
        )
        db_session.add(shared_doc)
        db_session.commit()

        response = test_client.get(f"/documents/shared/public-test-token")

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Public Doc"
        assert data["read_only"] is True


class TestContextFiles:
    """Tests for context file endpoints."""

    def test_list_context_files(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should return only context files."""
        from models import Document

        context_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Context File",
            content="Reference content",
            media_type="text",
            status="processed",
            is_context=True
        )
        db_session.add(context_doc)
        db_session.commit()

        response = test_client.get(
            f"/documents/projects/{test_project.id}/context-files",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(doc["is_context"] for doc in data)

    def test_toggle_context_flag(self, test_client, auth_headers, test_document):
        """Should toggle is_context flag."""
        # First, get current state
        initial_response = test_client.get(
            f"/documents/{test_document.id}",
            headers=auth_headers
        )
        initial_is_context = initial_response.json().get("is_context", False)

        # Toggle
        response = test_client.post(
            f"/documents/{test_document.id}/toggle-context",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_context"] != initial_is_context


class TestDocumentAttachments:
    """Tests for document attachment endpoints."""

    def test_get_attachments_empty(self, test_client, auth_headers, test_document):
        """Should return empty list for document with no attachments."""
        response = test_client.get(
            f"/documents/{test_document.id}/attachments",
            headers=auth_headers
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_attach_image_to_document(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should attach an image to a document."""
        from models import Document

        # Create text document
        text_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Text Doc",
            content="Content",
            media_type="text",
            status="draft"
        )

        # Create image document
        image_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Image",
            media_type="image",
            status="art_ok",
            file_url="https://storage.example.com/image.png"
        )

        db_session.add_all([text_doc, image_doc])
        db_session.commit()

        response = test_client.post(
            f"/documents/{text_doc.id}/attachments",
            headers=auth_headers,
            json={
                "image_id": str(image_doc.id),
                "is_primary": True,
                "attachment_order": 0
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["image_id"] == str(image_doc.id)
        assert data["is_primary"] is True

    def test_attach_non_image_fails(
        self, test_client, auth_headers, test_project, db_session
    ):
        """Should reject attaching non-image documents."""
        from models import Document

        text_doc1 = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Text Doc 1",
            media_type="text",
            status="draft"
        )

        text_doc2 = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Text Doc 2",
            media_type="text",
            status="draft"
        )

        db_session.add_all([text_doc1, text_doc2])
        db_session.commit()

        response = test_client.post(
            f"/documents/{text_doc1.id}/attachments",
            headers=auth_headers,
            json={
                "image_id": str(text_doc2.id),
                "is_primary": False,
                "attachment_order": 0
            }
        )

        assert response.status_code == 400
        assert "image" in response.json()["detail"].lower()
