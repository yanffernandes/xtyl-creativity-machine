"""
Memory Service - User Memory System (Feature 024)

Provides persistent memory for AI assistant, inspired by mem0ai/mem0.
Automatically extracts facts from conversations and manages memory lifecycle
with ADD/UPDATE/DELETE operations.

Key Features:
- SHA-256 content hashing for deduplication
- Vector embeddings for semantic search (pgvector)
- LLM-based fact extraction and memory updates
- Scoped to user + project for isolation
"""

import hashlib
import json
import logging
import os
from typing import Any, Dict, List, Optional
from uuid import UUID

import httpx
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from config import get_openrouter_headers
from models import UserMemory, SystemConfig

logger = logging.getLogger("memory_service")
logger.setLevel(logging.DEBUG)

# OpenRouter configuration
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small"
DEFAULT_EXTRACTION_MODEL = "openai/gpt-4.1-nano"


def get_api_key() -> Optional[str]:
    """Get OpenRouter API key from environment."""
    return os.getenv("OPENROUTER_API_KEY")


class MemoryService:
    """
    Service for managing user memories with vector embeddings.

    Memories are scoped to user + project for complete isolation.
    Uses pgvector for efficient semantic similarity search.
    """

    def __init__(self, db: Session):
        """
        Initialize memory service.

        Args:
            db: SQLAlchemy database session
        """
        self.db = db

    def _get_config_value(self, key: str, default: Any = None) -> Any:
        """Get a configuration value from system_config table."""
        config = self.db.query(SystemConfig).filter(SystemConfig.key == key).first()
        if config and config.value is not None:
            # Handle JSON-wrapped strings
            value = config.value
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    return value
            return value
        return default

    def _get_extraction_model(self) -> str:
        """Get the configured model for memory extraction."""
        return self._get_config_value("memory_extraction_model", DEFAULT_EXTRACTION_MODEL)

    def _is_memory_system_enabled(self) -> bool:
        """Check if memory system is globally enabled."""
        value = self._get_config_value("memory_system_enabled", True)
        if isinstance(value, str):
            return value.lower() == "true"
        return bool(value)

    def _get_max_memories_per_project(self) -> int:
        """Get maximum memories per user per project."""
        value = self._get_config_value("memory_max_per_user_project", 100)
        if isinstance(value, str):
            return int(value)
        return int(value)

    @staticmethod
    def _generate_content_hash(content: str) -> str:
        """Generate SHA-256 hash for content deduplication."""
        normalized = content.strip().lower()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    async def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for text using OpenRouter API.

        Args:
            text: Text to generate embedding for

        Returns:
            List of floats representing the embedding vector (1536 dims)
        """
        api_key = get_api_key()
        if not api_key:
            logger.warning("OpenRouter API key not configured")
            return None

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{OPENROUTER_BASE_URL}/embeddings",
                    headers=get_openrouter_headers(api_key),
                    json={
                        "model": DEFAULT_EMBEDDING_MODEL,
                        "input": text,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["data"][0]["embedding"]
            except Exception as e:
                logger.error(f"Error generating embedding: {e}")
                return None

    async def add(
        self,
        user_id: UUID,
        project_id: str,
        content: str,
        category: str = "other",
        source_conversation_id: Optional[str] = None,
    ) -> Optional[UserMemory]:
        """
        Add a new memory for a user.

        Args:
            user_id: UUID of the user
            project_id: ID of the project
            content: Memory content
            category: Memory category (personal, professional, etc.)
            source_conversation_id: Optional conversation ID where memory was extracted

        Returns:
            Created UserMemory or None if duplicate or error
        """
        # Check if memory system is enabled
        if not self._is_memory_system_enabled():
            logger.info("Memory system is disabled")
            return None

        # Check memory limit
        current_count = (
            self.db.query(func.count(UserMemory.id))
            .filter(UserMemory.user_id == user_id, UserMemory.project_id == project_id)
            .scalar()
        )
        max_memories = self._get_max_memories_per_project()
        if current_count >= max_memories:
            logger.warning(f"Memory limit reached for user {user_id} in project {project_id}")
            return None

        # Generate content hash for deduplication
        content_hash = self._generate_content_hash(content)

        # Check for existing memory with same hash
        existing = (
            self.db.query(UserMemory)
            .filter(
                UserMemory.user_id == user_id,
                UserMemory.project_id == project_id,
                UserMemory.content_hash == content_hash,
            )
            .first()
        )
        if existing:
            logger.info(f"Duplicate memory detected for user {user_id}")
            return existing

        # Generate embedding
        embedding = await self._generate_embedding(content)

        # Create memory
        memory = UserMemory(
            user_id=user_id,
            project_id=project_id,
            content=content,
            content_hash=content_hash,
            embedding=embedding,
            category=category,
            source_conversation_id=source_conversation_id,
        )

        self.db.add(memory)
        self.db.commit()
        self.db.refresh(memory)

        logger.info(f"Created memory {memory.id} for user {user_id}")
        return memory

    def get(self, memory_id: UUID, user_id: UUID) -> Optional[UserMemory]:
        """
        Get a specific memory by ID.

        Args:
            memory_id: UUID of the memory
            user_id: UUID of the user (for access control)

        Returns:
            UserMemory or None if not found
        """
        return (
            self.db.query(UserMemory)
            .filter(UserMemory.id == memory_id, UserMemory.user_id == user_id)
            .first()
        )

    def list(
        self,
        user_id: UUID,
        project_id: str,
        category: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[List[UserMemory], int]:
        """
        List memories for a user in a project.

        Args:
            user_id: UUID of the user
            project_id: ID of the project
            category: Optional category filter
            page: Page number (1-indexed)
            per_page: Items per page

        Returns:
            Tuple of (memories list, total count)
        """
        # Debug: check what's in the database
        all_memories = self.db.query(UserMemory).filter(
            UserMemory.project_id == project_id
        ).all()
        logger.debug(f"[MEMORY_SERVICE] All memories in project {project_id}: {len(all_memories)}")
        for m in all_memories[:5]:
            logger.debug(f"  - Memory user_id={m.user_id} (type={type(m.user_id)}), looking for {user_id} (type={type(user_id)})")

        query = self.db.query(UserMemory).filter(
            UserMemory.user_id == user_id,
            UserMemory.project_id == project_id,
        )

        if category:
            query = query.filter(UserMemory.category == category)

        total = query.count()
        memories = (
            query.order_by(UserMemory.updated_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )

        logger.debug(f"[MEMORY_SERVICE] Query returned {total} memories for user {user_id}")
        return memories, total

    async def update(
        self,
        memory_id: UUID,
        user_id: UUID,
        content: Optional[str] = None,
        category: Optional[str] = None,
    ) -> Optional[UserMemory]:
        """
        Update an existing memory.

        Args:
            memory_id: UUID of the memory to update
            user_id: UUID of the user (for access control)
            content: New content (optional)
            category: New category (optional)

        Returns:
            Updated UserMemory or None if not found
        """
        memory = self.get(memory_id, user_id)
        if not memory:
            return None

        if content is not None:
            memory.content = content
            memory.content_hash = self._generate_content_hash(content)
            # Regenerate embedding for new content
            embedding = await self._generate_embedding(content)
            if embedding:
                memory.embedding = embedding

        if category is not None:
            memory.category = category

        self.db.commit()
        self.db.refresh(memory)

        logger.info(f"Updated memory {memory_id}")
        return memory

    def delete(self, memory_id: UUID, user_id: UUID) -> bool:
        """
        Delete a specific memory.

        Args:
            memory_id: UUID of the memory to delete
            user_id: UUID of the user (for access control)

        Returns:
            True if deleted, False if not found
        """
        memory = self.get(memory_id, user_id)
        if not memory:
            return False

        self.db.delete(memory)
        self.db.commit()

        logger.info(f"Deleted memory {memory_id}")
        return True

    def delete_all(self, user_id: UUID, project_id: str) -> int:
        """
        Delete all memories for a user in a project.

        Args:
            user_id: UUID of the user
            project_id: ID of the project

        Returns:
            Number of memories deleted
        """
        result = (
            self.db.query(UserMemory)
            .filter(UserMemory.user_id == user_id, UserMemory.project_id == project_id)
            .delete()
        )
        self.db.commit()

        logger.info(f"Deleted {result} memories for user {user_id} in project {project_id}")
        return result

    async def search(
        self,
        query: str,
        user_id: UUID,
        project_id: str,
        limit: int = 5,
        category: Optional[str] = None,
    ) -> List[UserMemory]:
        """
        Search memories using vector similarity.

        Args:
            query: Search query
            user_id: UUID of the user
            project_id: ID of the project
            limit: Maximum number of results
            category: Optional category filter

        Returns:
            List of similar memories ordered by relevance
        """
        # Generate embedding for query
        query_embedding = await self._generate_embedding(query)
        if not query_embedding:
            logger.warning("Failed to generate query embedding")
            return []

        # Build the vector search query using pgvector
        # Using cosine distance: embedding <=> query_embedding
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        category_filter = "AND category = :category" if category else ""

        sql = text(f"""
            SELECT id, user_id, project_id, content, content_hash, category,
                   source_conversation_id, created_at, updated_at,
                   1 - (embedding <=> '{embedding_str}'::vector) as similarity
            FROM user_memories
            WHERE user_id = :user_id
              AND project_id = :project_id
              AND embedding IS NOT NULL
              {category_filter}
            ORDER BY embedding <=> '{embedding_str}'::vector
            LIMIT :limit
        """)

        params = {
            "user_id": str(user_id),
            "project_id": project_id,
            "limit": limit,
        }
        if category:
            params["category"] = category

        result = self.db.execute(sql, params)
        rows = result.fetchall()

        # Convert rows to UserMemory objects
        memories = []
        for row in rows:
            memory = self.db.query(UserMemory).filter(UserMemory.id == row.id).first()
            if memory:
                memories.append(memory)

        logger.info(f"Found {len(memories)} memories for query: {query[:50]}...")
        return memories

    async def search_relevant(
        self,
        message: str,
        user_id: UUID,
        project_id: str,
        limit: int = 5,
    ) -> List[UserMemory]:
        """
        Search for memories relevant to a chat message.

        Convenience method for chat integration.

        Args:
            message: User's chat message
            user_id: UUID of the user
            project_id: ID of the project
            limit: Maximum number of results

        Returns:
            List of relevant memories
        """
        if not self._is_memory_system_enabled():
            return []

        return await self.search(message, user_id, project_id, limit)

    def build_memory_context(self, memories: List[UserMemory]) -> str:
        """
        Build a context string from memories for system prompt injection.

        Args:
            memories: List of relevant memories

        Returns:
            Formatted string for injection into system prompt
        """
        if not memories:
            return ""

        context_lines = ["", "User Information (from previous conversations):"]
        for memory in memories:
            context_lines.append(f"- {memory.content}")

        return "\n".join(context_lines)

    def get_memory_stats(self, user_id: Optional[UUID] = None) -> Dict[str, Any]:
        """
        Get memory statistics.

        Args:
            user_id: Optional user filter for per-user stats

        Returns:
            Dict with statistics
        """
        query = self.db.query(UserMemory)
        if user_id:
            query = query.filter(UserMemory.user_id == user_id)

        total = query.count()

        # Count by category
        category_counts = (
            self.db.query(UserMemory.category, func.count(UserMemory.id))
            .group_by(UserMemory.category)
        )
        if user_id:
            category_counts = category_counts.filter(UserMemory.user_id == user_id)

        by_category = {row[0]: row[1] for row in category_counts.all()}

        # Count unique users with memories
        unique_users = self.db.query(func.count(func.distinct(UserMemory.user_id))).scalar()

        return {
            "total_memories": total,
            "by_category": by_category,
            "unique_users": unique_users,
            "avg_memories_per_user": round(total / unique_users, 1) if unique_users else 0,
        }

    async def _call_llm(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        """
        Call LLM for fact extraction/memory updates.

        Args:
            prompt: User prompt
            system_prompt: System prompt

        Returns:
            LLM response text or None on error
        """
        api_key = get_api_key()
        if not api_key:
            logger.warning("OpenRouter API key not configured")
            return None

        model = self._get_extraction_model()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    f"{OPENROUTER_BASE_URL}/chat/completions",
                    headers=get_openrouter_headers(api_key),
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.1,  # Low temperature for consistent extraction
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except Exception as e:
                logger.error(f"Error calling LLM for memory extraction: {e}")
                return None

    async def extract_facts(
        self,
        messages: List[Dict[str, str]],
    ) -> List[Dict[str, str]]:
        """
        Extract facts from conversation messages.

        Args:
            messages: List of message dicts with 'role' and 'content'

        Returns:
            List of extracted facts with 'content' and 'category'
        """
        from prompts.memory_prompts import FACT_EXTRACTION_PROMPT

        # Filter only user messages for extraction
        user_messages = [m for m in messages if m.get("role") == "user"]
        if not user_messages:
            return []

        # Build conversation text
        conversation_text = "\n".join([
            f"User: {m['content']}" for m in user_messages[-5:]  # Last 5 messages max
        ])

        prompt = f"{FACT_EXTRACTION_PROMPT}\n\n{conversation_text}"

        response = await self._call_llm(prompt)
        if not response:
            return []

        try:
            # Parse JSON response
            # Handle potential markdown code blocks
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            response = response.strip()

            data = json.loads(response)
            facts = data.get("facts", [])

            # Normalize to list of dicts
            normalized = []
            for fact in facts:
                if isinstance(fact, dict):
                    normalized.append({
                        "content": fact.get("content", str(fact)),
                        "category": fact.get("category", "other"),
                    })
                elif isinstance(fact, str):
                    normalized.append({"content": fact, "category": "other"})

            logger.info(f"Extracted {len(normalized)} facts from conversation")
            return normalized

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse fact extraction response: {e}")
            return []

    async def process_facts_and_update(
        self,
        facts: List[Dict[str, str]],
        user_id: UUID,
        project_id: str,
        source_conversation_id: Optional[str] = None,
    ) -> Dict[str, int]:
        """
        Process extracted facts and update memories (ADD/UPDATE/DELETE).

        Args:
            facts: List of extracted facts
            user_id: UUID of the user
            project_id: ID of the project
            source_conversation_id: Optional conversation ID

        Returns:
            Dict with counts of operations performed
        """
        from prompts.memory_prompts import (
            MEMORY_UPDATE_PROMPT,
            format_current_memories,
            format_new_facts,
        )

        if not facts:
            return {"added": 0, "updated": 0, "deleted": 0}

        # Get current memories for this user/project
        current_memories, _ = self.list(user_id, project_id, per_page=100)

        # Build prompt for memory update decision
        prompt = MEMORY_UPDATE_PROMPT.format(
            current_memories=format_current_memories(current_memories),
            new_facts=format_new_facts(facts),
        )

        response = await self._call_llm(prompt)
        if not response:
            # Fallback: just add all facts as new memories
            for fact in facts:
                await self.add(
                    user_id=user_id,
                    project_id=project_id,
                    content=fact["content"],
                    category=fact.get("category", "other"),
                    source_conversation_id=source_conversation_id,
                )
            return {"added": len(facts), "updated": 0, "deleted": 0}

        try:
            # Parse response
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            response = response.strip()

            data = json.loads(response)
            operations = data.get("operations", [])

            counts = {"added": 0, "updated": 0, "deleted": 0}

            for op in operations:
                event = op.get("event", "NONE").upper()
                memory_id = op.get("id")
                text = op.get("text", "")
                category = op.get("category", "other")

                if event == "ADD":
                    memory = await self.add(
                        user_id=user_id,
                        project_id=project_id,
                        content=text,
                        category=category,
                        source_conversation_id=source_conversation_id,
                    )
                    if memory:
                        counts["added"] += 1

                elif event == "UPDATE" and memory_id:
                    try:
                        memory_uuid = UUID(memory_id)
                        updated = await self.update(
                            memory_id=memory_uuid,
                            user_id=user_id,
                            content=text,
                            category=category,
                        )
                        if updated:
                            counts["updated"] += 1
                    except ValueError:
                        logger.warning(f"Invalid memory ID for update: {memory_id}")

                elif event == "DELETE" and memory_id:
                    try:
                        memory_uuid = UUID(memory_id)
                        if self.delete(memory_uuid, user_id):
                            counts["deleted"] += 1
                    except ValueError:
                        logger.warning(f"Invalid memory ID for delete: {memory_id}")

            logger.info(f"Memory operations: {counts}")
            return counts

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse memory update response: {e}")
            # Fallback: add all facts
            for fact in facts:
                await self.add(
                    user_id=user_id,
                    project_id=project_id,
                    content=fact["content"],
                    category=fact.get("category", "other"),
                    source_conversation_id=source_conversation_id,
                )
            return {"added": len(facts), "updated": 0, "deleted": 0}

    async def extract_and_save(
        self,
        messages: List[Dict[str, str]],
        user_id: UUID,
        project_id: str,
        conversation_id: Optional[str] = None,
    ) -> Dict[str, int]:
        """
        Extract facts from messages and save to memory.

        This is the main entry point for automatic memory extraction.
        Should be called asynchronously after chat response is sent.

        Args:
            messages: Conversation messages
            user_id: UUID of the user
            project_id: ID of the project
            conversation_id: Optional conversation ID

        Returns:
            Dict with counts of operations performed
        """
        if not self._is_memory_system_enabled():
            return {"added": 0, "updated": 0, "deleted": 0}

        try:
            # Step 1: Extract facts
            facts = await self.extract_facts(messages)
            if not facts:
                return {"added": 0, "updated": 0, "deleted": 0}

            # Step 2: Process and update memories
            return await self.process_facts_and_update(
                facts=facts,
                user_id=user_id,
                project_id=project_id,
                source_conversation_id=conversation_id,
            )

        except Exception as e:
            logger.error(f"Error in extract_and_save: {e}")
            return {"added": 0, "updated": 0, "deleted": 0}
