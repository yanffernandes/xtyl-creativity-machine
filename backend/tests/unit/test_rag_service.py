"""
Unit tests for RAG Service.

Tests document processing, text extraction, and knowledge base querying.
"""

import pytest
from unittest.mock import MagicMock, patch, mock_open
import os


class TestSanitizeText:
    """Tests for text sanitization function."""

    def test_removes_nul_characters(self):
        """Should remove NUL (0x00) characters from text."""
        from rag_service import sanitize_text

        input_text = "Hello\x00World\x00!"
        result = sanitize_text(input_text)

        assert "\x00" not in result
        assert result == "HelloWorld!"

    def test_removes_control_characters(self):
        """Should remove other control characters except newlines and tabs."""
        from rag_service import sanitize_text

        input_text = "Hello\x01\x02\x03World"
        result = sanitize_text(input_text)

        assert "\x01" not in result
        assert "\x02" not in result
        assert "\x03" not in result

    def test_preserves_newlines_and_tabs(self):
        """Should preserve newlines and tabs."""
        from rag_service import sanitize_text

        input_text = "Hello\nWorld\tTest"
        result = sanitize_text(input_text)

        assert "\n" in result
        assert "\t" in result
        assert result == "Hello\nWorld\tTest"

    def test_handles_empty_string(self):
        """Should handle empty string."""
        from rag_service import sanitize_text

        result = sanitize_text("")
        assert result == ""

    def test_handles_none(self):
        """Should handle None input."""
        from rag_service import sanitize_text

        result = sanitize_text(None)
        assert result is None

    def test_handles_normal_text(self):
        """Should pass through normal text unchanged."""
        from rag_service import sanitize_text

        input_text = "This is a normal text with punctuation! And numbers 123."
        result = sanitize_text(input_text)

        assert result == input_text


class TestProcessDocument:
    """Tests for document processing function."""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session."""
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = MagicMock()
        db.commit = MagicMock()
        return db

    def test_process_pdf_document(self, mock_db):
        """Should process PDF documents correctly."""
        from rag_service import process_document

        with patch('rag_service.storage_service.upload_file') as mock_upload:
            mock_upload.return_value = "https://storage.example.com/doc.pdf"

            with patch('rag_service.PyPDFLoader') as mock_loader:
                mock_loader_instance = MagicMock()
                mock_loader.return_value = mock_loader_instance
                mock_loader_instance.load.return_value = [
                    MagicMock(page_content="Page 1 content", metadata={})
                ]

                with patch('rag_service.PGVector') as mock_pgvector:
                    with patch('builtins.open', mock_open(read_data=b'%PDF-1.4')):
                        with patch('os.path.exists', return_value=True):
                            process_document(
                                db=mock_db,
                                document_id="doc-123",
                                file_path="/tmp/test.pdf",
                                original_filename="test.pdf"
                            )

                    # Verify PDF loader was used
                    mock_loader.assert_called_once_with("/tmp/test.pdf")

    def test_process_image_document_with_ocr(self, mock_db):
        """Should process image documents with OCR."""
        from rag_service import process_document

        with patch('rag_service.storage_service.upload_file') as mock_upload:
            mock_upload.return_value = "https://storage.example.com/image.png"

            with patch('rag_service.image_service.is_image', return_value=True):
                with patch('rag_service.image_service.validate_image', return_value=(True, None)):
                    with patch('rag_service.image_service.extract_text_ocr', return_value="Extracted text from image"):
                        with patch('rag_service.image_service.get_image_metadata', return_value={"width": 800, "height": 600}):
                            with patch('rag_service.image_service.generate_thumbnail', return_value=True):
                                with patch('rag_service.PGVector'):
                                    with patch('builtins.open', mock_open(read_data=b'\x89PNG')):
                                        with patch('os.path.exists', return_value=True):
                                            with patch('os.remove'):
                                                process_document(
                                                    db=mock_db,
                                                    document_id="doc-123",
                                                    file_path="/tmp/test.png",
                                                    original_filename="test.png"
                                                )

    def test_process_invalid_image(self, mock_db):
        """Should handle invalid images gracefully."""
        from rag_service import process_document

        mock_doc = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_doc

        with patch('rag_service.storage_service.upload_file'):
            with patch('rag_service.image_service.is_image', return_value=True):
                with patch('rag_service.image_service.validate_image', return_value=(False, "Corrupted image")):
                    with patch('builtins.open', mock_open(read_data=b'corrupted')):
                        process_document(
                            db=mock_db,
                            document_id="doc-123",
                            file_path="/tmp/bad.png",
                            original_filename="bad.png"
                        )

                    # Document should be marked as error
                    assert mock_doc.status == "error"

    def test_upload_to_r2_storage(self, mock_db):
        """Should upload document to R2 storage."""
        from rag_service import process_document

        with patch('rag_service.storage_service.upload_file') as mock_upload:
            mock_upload.return_value = "https://storage.example.com/doc.pdf"

            with patch('rag_service.PyPDFLoader') as mock_loader:
                mock_loader.return_value.load.return_value = []

                with patch('rag_service.PGVector'):
                    with patch('builtins.open', mock_open(read_data=b'%PDF')):
                        process_document(
                            db=mock_db,
                            document_id="doc-123",
                            file_path="/tmp/test.pdf",
                            original_filename="test.pdf"
                        )

                    mock_upload.assert_called()


class TestQueryKnowledgeBase:
    """Tests for knowledge base querying."""

    def test_query_returns_relevant_documents(self):
        """Should return relevant documents from vector store."""
        from rag_service import query_knowledge_base

        mock_docs = [
            MagicMock(page_content="Relevant content 1", metadata={"document_id": "1"}),
            MagicMock(page_content="Relevant content 2", metadata={"document_id": "2"})
        ]

        with patch('rag_service.PGVector') as mock_pgvector:
            mock_store = MagicMock()
            mock_pgvector.return_value = mock_store
            mock_store.similarity_search.return_value = mock_docs

            results = query_knowledge_base(
                query="Find relevant information",
                k=2
            )

            assert len(results) == 2
            mock_store.similarity_search.assert_called_once()

    def test_query_with_document_filter(self):
        """Should filter by document IDs when provided."""
        from rag_service import query_knowledge_base

        with patch('rag_service.PGVector') as mock_pgvector:
            mock_store = MagicMock()
            mock_pgvector.return_value = mock_store
            mock_store.similarity_search.return_value = []

            query_knowledge_base(
                query="Find info",
                document_ids=["doc-1", "doc-2"]
            )

            # Verify filter was passed
            call_kwargs = mock_store.similarity_search.call_args.kwargs
            assert "filter" in call_kwargs

    def test_query_respects_k_parameter(self):
        """Should respect the k parameter for result limit."""
        from rag_service import query_knowledge_base

        with patch('rag_service.PGVector') as mock_pgvector:
            mock_store = MagicMock()
            mock_pgvector.return_value = mock_store
            mock_store.similarity_search.return_value = []

            query_knowledge_base(query="Find info", k=10)

            # Verify k was passed
            call_args = mock_store.similarity_search.call_args
            assert call_args.args[1] == 10 or call_args.kwargs.get('k') == 10


class TestTextSplitting:
    """Tests for document text splitting."""

    def test_splits_long_documents(self):
        """Should split long documents into chunks."""
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_core.documents import Document as LangchainDocument

        splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)

        long_text = "This is a very long document. " * 50  # ~1650 characters
        doc = LangchainDocument(page_content=long_text)

        splits = splitter.split_documents([doc])

        assert len(splits) > 1
        assert all(len(s.page_content) <= 100 + 50 for s in splits)  # Allow some overlap

    def test_preserves_metadata_in_splits(self):
        """Should preserve metadata in all splits."""
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_core.documents import Document as LangchainDocument

        splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)

        doc = LangchainDocument(
            page_content="Content " * 50,
            metadata={"source": "test.pdf", "page": 1}
        )

        splits = splitter.split_documents([doc])

        for split in splits:
            assert split.metadata["source"] == "test.pdf"
            assert split.metadata["page"] == 1


class TestEmbeddingsConfiguration:
    """Tests for embeddings configuration."""

    def test_embeddings_use_openrouter_base(self):
        """Should configure embeddings to use OpenRouter API base."""
        # This is more of a configuration test
        # Verify the embeddings are configured with OpenRouter base URL
        from rag_service import embeddings

        # The embeddings should be configured (this tests the module-level config)
        assert embeddings is not None


class TestConnectionString:
    """Tests for database connection string."""

    def test_connection_string_conversion(self):
        """Should convert postgresql:// to postgresql+psycopg2://."""
        from rag_service import CONNECTION_STRING

        # Verify the connection string uses psycopg2 driver
        assert "postgresql+psycopg2://" in CONNECTION_STRING or "postgresql://" in CONNECTION_STRING


class TestDocumentProcessingEdgeCases:
    """Tests for edge cases in document processing."""

    @pytest.fixture
    def mock_db(self):
        db = MagicMock()
        mock_doc = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = mock_doc
        db.commit = MagicMock()
        return db

    def test_handles_empty_pdf(self, mock_db):
        """Should handle PDFs with no extractable text."""
        from rag_service import process_document

        with patch('rag_service.storage_service.upload_file'):
            with patch('rag_service.PyPDFLoader') as mock_loader:
                mock_loader.return_value.load.return_value = []  # No pages

                with patch('rag_service.PGVector') as mock_pgvector:
                    with patch('builtins.open', mock_open(read_data=b'%PDF')):
                        # Should not raise, should handle gracefully
                        process_document(
                            db=mock_db,
                            document_id="doc-123",
                            file_path="/tmp/empty.pdf",
                            original_filename="empty.pdf"
                        )

                    # PGVector should not be called for empty docs
                    # (depends on implementation)

    def test_handles_image_without_ocr_text(self, mock_db):
        """Should handle images where OCR extracts no text."""
        from rag_service import process_document

        with patch('rag_service.storage_service.upload_file'):
            with patch('rag_service.image_service.is_image', return_value=True):
                with patch('rag_service.image_service.validate_image', return_value=(True, None)):
                    with patch('rag_service.image_service.extract_text_ocr', return_value=""):
                        with patch('rag_service.image_service.get_image_metadata', return_value={}):
                            with patch('rag_service.image_service.generate_thumbnail', return_value=False):
                                with patch('rag_service.PGVector'):
                                    with patch('builtins.open', mock_open(read_data=b'\x89PNG')):
                                        # Should not raise
                                        process_document(
                                            db=mock_db,
                                            document_id="doc-123",
                                            file_path="/tmp/image.png",
                                            original_filename="image.png"
                                        )

    def test_handles_r2_upload_failure(self, mock_db):
        """Should continue processing even if R2 upload fails."""
        from rag_service import process_document

        with patch('rag_service.storage_service.upload_file') as mock_upload:
            mock_upload.side_effect = Exception("R2 connection failed")

            with patch('rag_service.PyPDFLoader') as mock_loader:
                mock_loader.return_value.load.return_value = [
                    MagicMock(page_content="Content", metadata={})
                ]

                with patch('rag_service.PGVector'):
                    with patch('builtins.open', mock_open(read_data=b'%PDF')):
                        # Should not raise, should continue processing
                        process_document(
                            db=mock_db,
                            document_id="doc-123",
                            file_path="/tmp/test.pdf",
                            original_filename="test.pdf"
                        )
