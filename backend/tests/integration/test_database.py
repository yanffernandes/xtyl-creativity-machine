"""
Integration tests for Database operations.

Tests database models, relationships, and CRUD operations.
"""

import pytest
from datetime import datetime
import uuid


class TestUserModel:
    """Tests for User model and operations."""

    def test_create_user(self, db_session):
        """Should create a user in the database."""
        from models import User

        user = User(
            id=str(uuid.uuid4()),
            email="test@example.com",
            full_name="Test User"
        )
        db_session.add(user)
        db_session.commit()

        # Query back
        saved = db_session.query(User).filter(User.email == "test@example.com").first()
        assert saved is not None
        assert saved.full_name == "Test User"

    def test_user_email_unique(self, db_session):
        """Should enforce unique email constraint."""
        from models import User
        from sqlalchemy.exc import IntegrityError

        user1 = User(
            id=str(uuid.uuid4()),
            email="unique@example.com"
        )
        db_session.add(user1)
        db_session.commit()

        user2 = User(
            id=str(uuid.uuid4()),
            email="unique@example.com"  # Same email
        )
        db_session.add(user2)

        with pytest.raises(IntegrityError):
            db_session.commit()


class TestWorkspaceModel:
    """Tests for Workspace model and operations."""

    def test_create_workspace(self, db_session, test_user):
        """Should create a workspace."""
        from models import Workspace

        workspace = Workspace(
            id=str(uuid.uuid4()),
            name="Test Workspace",
            owner_id=str(test_user.id)
        )
        db_session.add(workspace)
        db_session.commit()

        saved = db_session.query(Workspace).filter(
            Workspace.name == "Test Workspace"
        ).first()
        assert saved is not None

    def test_workspace_owner_relationship(self, db_session, test_user):
        """Should establish owner relationship."""
        from models import Workspace

        workspace = Workspace(
            id=str(uuid.uuid4()),
            name="Owned Workspace",
            owner_id=str(test_user.id)
        )
        db_session.add(workspace)
        db_session.commit()

        # Check relationship
        db_session.refresh(workspace)
        # The relationship may be accessed via backref or query


class TestProjectModel:
    """Tests for Project model and operations."""

    def test_create_project(self, db_session, test_workspace):
        """Should create a project in workspace."""
        from models import Project

        project = Project(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Test Project"
        )
        db_session.add(project)
        db_session.commit()

        saved = db_session.query(Project).filter(
            Project.name == "Test Project"
        ).first()
        assert saved is not None
        assert str(saved.workspace_id) == str(test_workspace.id)

    def test_project_settings_json(self, db_session, test_workspace):
        """Should store and retrieve JSON settings."""
        from models import Project

        settings = {
            "client_name": "Test Client",
            "brand_voice": "professional",
            "colors": ["#FF0000", "#00FF00"]
        }

        project = Project(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Settings Project",
            settings=settings
        )
        db_session.add(project)
        db_session.commit()

        saved = db_session.query(Project).filter(
            Project.name == "Settings Project"
        ).first()
        assert saved.settings["client_name"] == "Test Client"
        assert len(saved.settings["colors"]) == 2


class TestDocumentModel:
    """Tests for Document model and operations."""

    def test_create_text_document(self, db_session, test_project):
        """Should create a text document."""
        from models import Document

        doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Test Document",
            content="# Hello World\n\nThis is content.",
            media_type="text",
            status="draft"
        )
        db_session.add(doc)
        db_session.commit()

        saved = db_session.query(Document).filter(
            Document.title == "Test Document"
        ).first()
        assert saved is not None
        assert saved.media_type == "text"

    def test_create_image_document(self, db_session, test_project):
        """Should create an image document."""
        from models import Document

        doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Test Image",
            media_type="image",
            status="art_ok",
            file_url="https://storage.example.com/image.png",
            thumbnail_url="https://storage.example.com/thumb.png"
        )
        db_session.add(doc)
        db_session.commit()

        saved = db_session.query(Document).filter(
            Document.title == "Test Image"
        ).first()
        assert saved.media_type == "image"
        assert saved.file_url is not None

    def test_soft_delete_document(self, db_session, test_project):
        """Should support soft deletion."""
        from models import Document

        doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="To Delete",
            media_type="text",
            status="draft"
        )
        db_session.add(doc)
        db_session.commit()

        # Soft delete
        doc.deleted_at = datetime.utcnow()
        db_session.commit()

        # Should still exist in DB
        saved = db_session.query(Document).filter(
            Document.id == doc.id
        ).first()
        assert saved is not None
        assert saved.deleted_at is not None


class TestWorkflowTemplateModel:
    """Tests for WorkflowTemplate model and operations."""

    def test_create_workflow_template(self, db_session, test_workspace, test_user):
        """Should create a workflow template."""
        from models import WorkflowTemplate

        template = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Test Workflow",
            description="A test workflow",
            category="blog",
            nodes_json=[
                {"id": "start", "type": "start", "data": {}},
                {"id": "finish", "type": "finish", "data": {}}
            ],
            edges_json=[
                {"id": "e1", "source": "start", "target": "finish"}
            ],
            is_system=False,
            created_by=str(test_user.id)
        )
        db_session.add(template)
        db_session.commit()

        saved = db_session.query(WorkflowTemplate).filter(
            WorkflowTemplate.name == "Test Workflow"
        ).first()
        assert saved is not None
        assert len(saved.nodes_json) == 2

    def test_workflow_template_increment_usage(self, db_session, test_workspace, test_user):
        """Should track usage count."""
        from models import WorkflowTemplate

        template = WorkflowTemplate(
            id=str(uuid.uuid4()),
            workspace_id=str(test_workspace.id),
            name="Usage Tracking",
            nodes_json=[],
            edges_json=[],
            usage_count=0
        )
        db_session.add(template)
        db_session.commit()

        # Increment usage
        template.usage_count += 1
        db_session.commit()

        saved = db_session.query(WorkflowTemplate).filter(
            WorkflowTemplate.id == template.id
        ).first()
        assert saved.usage_count == 1


class TestWorkflowExecutionModel:
    """Tests for WorkflowExecution model and operations."""

    def test_create_execution(self, db_session, test_project, test_user):
        """Should create a workflow execution."""
        from models import WorkflowExecution

        execution = WorkflowExecution(
            id=str(uuid.uuid4()),
            template_id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            user_id=str(test_user.id),
            status="pending",
            config_json={"topic": "AI"}
        )
        db_session.add(execution)
        db_session.commit()

        saved = db_session.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution.id
        ).first()
        assert saved is not None
        assert saved.status == "pending"

    def test_execution_status_transitions(self, db_session, test_project, test_user):
        """Should allow status transitions."""
        from models import WorkflowExecution

        execution = WorkflowExecution(
            id=str(uuid.uuid4()),
            template_id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            user_id=str(test_user.id),
            status="pending"
        )
        db_session.add(execution)
        db_session.commit()

        # Transition through statuses
        for status in ["running", "completed"]:
            execution.status = status
            db_session.commit()
            db_session.refresh(execution)
            assert execution.status == status

    def test_execution_stores_context(self, db_session, test_project, test_user):
        """Should store execution context with node outputs."""
        from models import WorkflowExecution

        execution = WorkflowExecution(
            id=str(uuid.uuid4()),
            template_id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            user_id=str(test_user.id),
            status="completed",
            execution_context={
                "text_gen_1": {
                    "content": "Generated text",
                    "document_ids": ["doc-1"]
                }
            }
        )
        db_session.add(execution)
        db_session.commit()

        saved = db_session.query(WorkflowExecution).filter(
            WorkflowExecution.id == execution.id
        ).first()
        assert "text_gen_1" in saved.execution_context


class TestChatConversationModel:
    """Tests for ChatConversation model and operations."""

    def test_create_conversation(self, db_session, test_project, test_user):
        """Should create a chat conversation."""
        from models import ChatConversation

        conv = ChatConversation(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            user_id=str(test_user.id),
            title="Test Conversation",
            messages_json=[
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"}
            ]
        )
        db_session.add(conv)
        db_session.commit()

        saved = db_session.query(ChatConversation).filter(
            ChatConversation.title == "Test Conversation"
        ).first()
        assert saved is not None
        assert len(saved.messages_json) == 2

    def test_conversation_append_message(self, db_session, test_project, test_user):
        """Should append messages to conversation."""
        from models import ChatConversation

        conv = ChatConversation(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            user_id=str(test_user.id),
            title="Growing Conversation",
            messages_json=[{"role": "user", "content": "First"}]
        )
        db_session.add(conv)
        db_session.commit()

        # Append message
        conv.messages_json.append({"role": "assistant", "content": "Second"})
        db_session.commit()

        saved = db_session.query(ChatConversation).filter(
            ChatConversation.id == conv.id
        ).first()
        assert len(saved.messages_json) == 2


class TestDocumentAttachmentModel:
    """Tests for DocumentAttachment model and operations."""

    def test_attach_image_to_document(self, db_session, test_project):
        """Should create attachment between documents."""
        from models import Document, DocumentAttachment

        text_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Text Doc",
            media_type="text",
            status="draft"
        )
        image_doc = Document(
            id=str(uuid.uuid4()),
            project_id=str(test_project.id),
            title="Image",
            media_type="image",
            status="art_ok"
        )
        db_session.add_all([text_doc, image_doc])
        db_session.commit()

        attachment = DocumentAttachment(
            id=str(uuid.uuid4()),
            document_id=text_doc.id,
            image_id=image_doc.id,
            is_primary=True,
            attachment_order=0
        )
        db_session.add(attachment)
        db_session.commit()

        saved = db_session.query(DocumentAttachment).filter(
            DocumentAttachment.document_id == text_doc.id
        ).first()
        assert saved is not None
        assert saved.is_primary is True


class TestTransactionRollback:
    """Tests for transaction rollback behavior."""

    def test_rollback_on_error(self, db_session):
        """Should rollback transaction on error."""
        from models import User
        from sqlalchemy.exc import IntegrityError

        user = User(
            id=str(uuid.uuid4()),
            email="rollback@example.com"
        )
        db_session.add(user)
        db_session.commit()

        # Try to create duplicate (should fail)
        try:
            user2 = User(
                id=str(uuid.uuid4()),
                email="rollback@example.com"
            )
            db_session.add(user2)
            db_session.commit()
        except IntegrityError:
            db_session.rollback()

        # Session should still be usable
        count = db_session.query(User).filter(
            User.email == "rollback@example.com"
        ).count()
        assert count == 1
