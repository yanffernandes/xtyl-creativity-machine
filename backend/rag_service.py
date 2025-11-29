import os
import re
from typing import List
from sqlalchemy.orm import Session
from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores.pgvector import PGVector
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document as LangchainDocument
from models import Document
from database import DATABASE_URL
from image_service import image_service
import storage_service


def sanitize_text(text: str) -> str:
    """
    Remove NUL characters and other problematic bytes from text.
    PostgreSQL cannot store NUL (0x00) characters in string fields.
    """
    if not text:
        return text
    # Remove NUL characters
    text = text.replace('\x00', '')
    # Also remove other control characters except newlines and tabs
    text = re.sub(r'[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text

# Vector Store Configuration
# Note: We need a real OpenAI key or a compatible local embedding model.
# For this plan, we assume OPENROUTER_API_KEY can be used if it supports embeddings,
# or we default to a placeholder/mock if no key is present for now.
OPENAI_API_KEY = os.getenv("OPENROUTER_API_KEY", "sk-placeholder")

embeddings = OpenAIEmbeddings(
    openai_api_key=OPENAI_API_KEY,
    openai_api_base="https://openrouter.ai/api/v1", # OpenRouter base
    check_embedding_ctx_length=False
)

# Connection string for PGVector
CONNECTION_STRING = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

def process_document(db: Session, document_id: str, file_path: str, original_filename: str):
    """
    1. Upload file to R2 storage
    2. Extract text (PDF or Image with OCR)
    3. Split text
    4. Generate embeddings
    5. Store in PGVector
    """

    # 1. Upload to R2 storage
    try:
        # Read file content
        with open(file_path, 'rb') as f:
            file_data = f.read()

        # Determine content type
        content_type = "application/octet-stream"
        if original_filename.lower().endswith('.pdf'):
            content_type = "application/pdf"
        elif original_filename.lower().endswith(('.jpg', '.jpeg')):
            content_type = "image/jpeg"
        elif original_filename.lower().endswith('.png'):
            content_type = "image/png"
        elif original_filename.lower().endswith('.gif'):
            content_type = "image/gif"
        elif original_filename.lower().endswith('.webp'):
            content_type = "image/webp"

        # Upload file
        storage_service.upload_file(
            file_data=file_data,
            file_name=original_filename,
            content_type=content_type,
            folder=f"documents/{document_id}"
        )

        # If it's an image, also upload a thumbnail
        if image_service.is_image(original_filename):
            thumbnail_path = f"{file_path}_thumb.jpg"
            if image_service.generate_thumbnail(file_path, thumbnail_path):
                with open(thumbnail_path, 'rb') as f:
                    thumbnail_data = f.read()
                storage_service.upload_file(
                    file_data=thumbnail_data,
                    file_name="thumbnail.jpg",
                    content_type="image/jpeg",
                    folder=f"documents/{document_id}"
                )
                os.remove(thumbnail_path)
    except Exception as e:
        print(f"Error uploading to R2 storage: {e}")
        # Continue for now as we have the local file

    # 2. Extract text
    docs = []
    extracted_text = ""

    if image_service.is_image(original_filename):
        # Process image with OCR
        print(f"Processing image: {original_filename}")

        # Validate image
        is_valid, error_msg = image_service.validate_image(file_path)
        if not is_valid:
            print(f"Invalid image: {error_msg}")
            db_doc = db.query(Document).filter(Document.id == document_id).first()
            if db_doc:
                db_doc.status = "error"
                db_doc.content = f"Error: {error_msg}"
                db.commit()
            return

        # Extract text with OCR
        extracted_text = image_service.extract_text_ocr(file_path)
        if extracted_text:
            # Get image metadata
            metadata = image_service.get_image_metadata(file_path)
            docs = [LangchainDocument(
                page_content=extracted_text,
                metadata={
                    "document_id": document_id,
                    "source": original_filename,
                    "type": "image",
                    "width": metadata.get('width', 0),
                    "height": metadata.get('height', 0),
                    "format": metadata.get('format', 'unknown')
                }
            )]
        else:
            print(f"No text extracted from image: {original_filename}")
            # Even if no text, mark as processed
            extracted_text = f"[Image: {original_filename}]"
            docs = [LangchainDocument(
                page_content=extracted_text,
                metadata={
                    "document_id": document_id,
                    "source": original_filename,
                    "type": "image"
                }
            )]
    else:
        # Process PDF
        loader = PyPDFLoader(file_path)
        docs = loader.load()

    # 3. Split text
    if docs:
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)

        # Add document_id metadata to all splits and sanitize text
        for split in splits:
            split.metadata["document_id"] = document_id
            if "source" not in split.metadata:
                split.metadata["source"] = original_filename
            # Sanitize text to remove NUL characters that PostgreSQL can't handle
            split.page_content = sanitize_text(split.page_content)

        # Filter out empty splits after sanitization
        splits = [s for s in splits if s.page_content and s.page_content.strip()]

        # 4 & 5. Embed and Store
        if splits:
            PGVector.from_documents(
                embedding=embeddings,
                documents=splits,
                collection_name="xtyl_knowledge_base",
                connection_string=CONNECTION_STRING,
            )

    # Update document status in DB
    db_doc = db.query(Document).filter(Document.id == document_id).first()
    if db_doc:
        db_doc.status = "processed"
        if extracted_text and image_service.is_image(original_filename):
            db_doc.content = f"Image processed with OCR:\n\n{extracted_text[:500]}..."
        db.commit()

def query_knowledge_base(query: str, project_id: str = None, document_ids: List[str] = None, k: int = 4):
    store = PGVector(
        collection_name="xtyl_knowledge_base",
        connection_string=CONNECTION_STRING,
        embedding_function=embeddings,
    )

    filter = {}
    if project_id:
        filter["project_id"] = project_id # This assumes metadata has project_id, need to ensure it does

    # PGVector filter syntax depends on the underlying implementation.
    # LangChain's PGVector supports a dict filter which maps to metadata columns.
    # However, filtering by a list of IDs ("IN" clause) might be tricky with simple dict match.
    # We will use a post-filtering approach or rely on metadata filter if supported.
    # For now, let's assume we pass a filter dict.

    # If document_ids is provided, we might need to construct a more complex filter
    # or just filter the results if the dataset is small.
    # Ideally, we pass a filter to the vector store.

    kwargs = {}
    if document_ids:
        # LangChain PGVector filter format: {"document_id": {"in": [...]}} or similar depending on version
        # For simplicity/compatibility, let's try standard metadata filtering
        # Note: This might need adjustment based on exact pgvector/langchain version
        kwargs["filter"] = {"document_id": {"in": document_ids}}

    docs = store.similarity_search(query, k=k, **kwargs)
    return docs
