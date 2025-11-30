"""
Context Retrieval Service

Integrates with RAG service to retrieve relevant documents for workflow nodes
Provides context-aware document retrieval based on:
- Project documents
- Folder filtering
- Search queries
- Semantic similarity
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from models import Document, Project, Folder
import rag_service
import logging

logger = logging.getLogger(__name__)


class ContextRetrievalService:
    """
    Service for retrieving context documents for workflow execution
    """

    def __init__(self, db: Session):
        self.db = db

    async def retrieve_context(
        self,
        project_id: str,
        query: Optional[str] = None,
        folder_ids: Optional[List[str]] = None,
        max_results: int = 5,
        use_rag: bool = True
    ) -> Dict[str, Any]:
        """
        Retrieve relevant documents for workflow context

        Args:
            project_id: Project to search within
            query: Optional search query for semantic search
            folder_ids: Optional list of folder IDs to filter by
            max_results: Maximum number of documents to return
            use_rag: Whether to use RAG for semantic search

        Returns:
            Dict with:
                - documents: List of retrieved documents
                - count: Number of documents retrieved
                - context: Concatenated text context
        """
        # Verify project exists
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project not found: {project_id}")

        # Build base query
        query_builder = self.db.query(Document).filter(
            Document.project_id == project_id
        )

        # Apply folder filter if provided
        if folder_ids:
            query_builder = query_builder.filter(Document.folder_id.in_(folder_ids))

        # If RAG is enabled and query provided, use semantic search
        if use_rag and query:
            try:
                documents = await self._retrieve_with_rag(
                    project_id=project_id,
                    query=query,
                    folder_ids=folder_ids,
                    max_results=max_results
                )
            except Exception as e:
                logger.warning(f"RAG search failed, falling back to keyword search: {e}")
                documents = self._retrieve_without_rag(
                    query_builder=query_builder,
                    query=query,
                    max_results=max_results
                )
        else:
            # Fallback to regular query
            documents = query_builder.order_by(
                Document.updated_at.desc()
            ).limit(max_results).all()

        # Build context string
        context_parts = []
        doc_list = []

        for doc in documents:
            doc_list.append({
                "id": doc.id,
                "title": doc.title,
                "content_preview": doc.content[:200] if doc.content else "",
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
                "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
                "folder_id": doc.folder_id
            })

            # Add to context
            context_parts.append(
                f"Document: {doc.title}\n{doc.content}\n---"
            )

        return {
            "documents": doc_list,
            "count": len(doc_list),
            "context": "\n\n".join(context_parts) if context_parts else "",
            "search_method": "rag" if (use_rag and query) else "database"
        }

    async def _retrieve_with_rag(
        self,
        project_id: str,
        query: str,
        folder_ids: Optional[List[str]],
        max_results: int
    ) -> List[Document]:
        """
        Retrieve documents using RAG semantic search
        """
        # Use RAG service to find relevant document IDs
        # Use RAG service to find relevant document IDs
        # Note: rag_service.query_knowledge_base is synchronous, but we can call it directly
        # or wrap in run_in_executor if needed. For now assuming it's fast enough or we accept blocking.
        rag_docs = rag_service.query_knowledge_base(
            project_id=project_id,
            query=query,
            k=max_results
        )

        if not rag_docs:
            return []

        # Extract document IDs from RAG results (Langchain Documents)
        doc_ids = [doc.metadata.get("document_id") for doc in rag_docs if doc.metadata.get("document_id")]

        # Fetch full documents
        query_builder = self.db.query(Document).filter(
            Document.id.in_(doc_ids),
            Document.project_id == project_id
        )

        # Apply folder filter
        if folder_ids:
            query_builder = query_builder.filter(Document.folder_id.in_(folder_ids))

        documents = query_builder.all()

        # Sort by RAG relevance score
        doc_map = {doc.id: doc for doc in documents}
        sorted_docs = []
        doc_map = {doc.id: doc for doc in documents}
        sorted_docs = []
        for rag_doc in rag_docs:
            doc_id = rag_doc.metadata.get("document_id")
            if doc_id and doc_id in doc_map:
                sorted_docs.append(doc_map[doc_id])

        return sorted_docs[:max_results]

    def _retrieve_without_rag(
        self,
        query_builder,
        query: Optional[str],
        max_results: int
    ) -> List[Document]:
        """
        Retrieve documents using keyword search
        """
        if query:
            # Simple keyword search in title and content
            search_filter = or_(
                Document.title.ilike(f"%{query}%"),
                Document.content.ilike(f"%{query}%")
            )
            query_builder = query_builder.filter(search_filter)

        return query_builder.order_by(
            Document.updated_at.desc()
        ).limit(max_results).all()

    def get_folder_tree(self, project_id: str) -> List[Dict[str, Any]]:
        """
        Get folder tree for project (for UI selection)
        """
        folders = self.db.query(Folder).filter(
            Folder.project_id == project_id
        ).order_by(Folder.name).all()

        return [
            {
                "id": folder.id,
                "name": folder.name,
                "parent_id": folder.parent_id
            }
            for folder in folders
        ]

    def get_document_count(
        self,
        project_id: str,
        folder_ids: Optional[List[str]] = None
    ) -> int:
        """
        Get count of documents matching criteria
        """
        query = self.db.query(Document).filter(
            Document.project_id == project_id
        )

        if folder_ids:
            query = query.filter(Document.folder_id.in_(folder_ids))

        return query.count()


async def retrieve_workflow_context(
    db: Session,
    project_id: str,
    context_params: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Convenience function for workflow nodes to retrieve context

    Args:
        db: Database session
        project_id: Project ID
        context_params: Parameters from context retrieval node:
            - query: Search query
            - folder_ids: Folder filter
            - max_results: Max documents
            - use_rag: Enable semantic search

    Returns:
        Context dictionary with documents and text
    """
    service = ContextRetrievalService(db)

    return await service.retrieve_context(
        project_id=project_id,
        query=context_params.get("query"),
        folder_ids=context_params.get("folder_ids"),
        max_results=context_params.get("max_results", 5),
        use_rag=context_params.get("use_rag", True)
    )
