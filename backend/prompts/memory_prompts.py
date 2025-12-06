"""
Memory Extraction Prompts - Feature 024

Prompts for extracting facts from conversations and managing memory lifecycle.
Inspired by mem0ai/mem0 with adaptations for multi-language support (PT/EN).
"""

# Prompt for extracting facts from user messages
FACT_EXTRACTION_PROMPT = """You are a Personal Information Organizer specialized in extracting facts about the user from conversations.

Your role is to extract relevant pieces of information and organize them into distinct facts.

Types of Information to Extract:
1. Personal Preferences: likes, dislikes, preferences in food, products, activities
2. Personal Details: names, relationships, important dates, locations
3. Plans and Intentions: upcoming events, trips, goals, deadlines
4. Professional Details: job titles, work habits, career goals, company name
5. Health and Wellness: dietary restrictions, fitness routines, allergies
6. Miscellaneous: favorite books, movies, brands, hobbies

IMPORTANT RULES:
- Only extract facts from USER messages, NOT from assistant messages
- Return facts in the SAME LANGUAGE as the user input (Portuguese or English)
- Return empty list if no relevant facts found
- Each fact should be a complete, standalone piece of information
- Be concise - facts should be 1-2 sentences max
- Include category for each fact: personal, professional, preference, plan, health, other

Output format (JSON):
{
    "facts": [
        {"content": "fact content here", "category": "category_name"},
        {"content": "another fact", "category": "category_name"}
    ]
}

Examples:

User: Hi, my name is John. I work as a software engineer at Google.
Output: {"facts": [{"content": "Name is John", "category": "personal"}, {"content": "Works as software engineer at Google", "category": "professional"}]}

User: I'm allergic to peanuts and I prefer vegetarian food.
Output: {"facts": [{"content": "Allergic to peanuts", "category": "health"}, {"content": "Prefers vegetarian food", "category": "preference"}]}

User: Olá, meu nome é João e trabalho como designer na Acme Corp.
Output: {"facts": [{"content": "Nome é João", "category": "personal"}, {"content": "Trabalha como designer na Acme Corp", "category": "professional"}]}

User: Prefiro reuniões pela manhã e não gosto de trabalhar nos fins de semana.
Output: {"facts": [{"content": "Prefere reuniões pela manhã", "category": "preference"}, {"content": "Não gosta de trabalhar nos fins de semana", "category": "preference"}]}

User: Hello, how are you?
Output: {"facts": []}

User: Obrigado pela ajuda!
Output: {"facts": []}

Now extract facts from the following conversation. Return ONLY the JSON, no other text:
"""

# Prompt for determining memory operations (ADD/UPDATE/DELETE)
MEMORY_UPDATE_PROMPT = """You are a memory manager that controls user memories in a personalized AI system.

Your task is to analyze new facts and determine how they should affect existing memories.

Operations:
- ADD: Add new fact to memory (when it's new information not in existing memories)
- UPDATE: Update existing memory with new info (same topic but with more/different details)
- DELETE: Remove memory that contradicts new info (new fact directly contradicts existing memory)
- NONE: No change needed (information already exists or is irrelevant)

Guidelines:
1. ADD: Use when the fact is genuinely new information not covered by any existing memory
2. UPDATE: Use when the new fact provides updated/more specific info about the same topic
   - Example: "Works at Google" updated to "Works as Senior Engineer at Google"
3. DELETE: Use when the new fact directly contradicts an existing memory
   - Example: "Is vegetarian" when existing memory says "Eats meat regularly"
4. NONE: Use when the fact is already stored or is not worth storing

IMPORTANT:
- Preserve the language of existing memories (don't translate)
- New facts should be stored in the same language they were extracted
- When updating, merge information intelligently

Current memories (format: ID | content | category):
{current_memories}

New facts to process:
{new_facts}

Return a JSON response with the operations to perform:
{{
    "operations": [
        {{
            "id": "existing-memory-id or new-uuid",
            "text": "memory content",
            "category": "category_name",
            "event": "ADD|UPDATE|DELETE|NONE",
            "old_memory": "only for UPDATE, previous content"
        }}
    ]
}}

Return ONLY the JSON, no other text.
"""

# System prompt injection template for including memories in chat
MEMORY_CONTEXT_TEMPLATE = """
User Information (from previous conversations):
{memories}

Use this information to personalize your responses when relevant. Do not explicitly mention that you "remember" these facts unless the user asks about what you know about them.
"""


def format_memories_for_context(memories: list) -> str:
    """
    Format memories as a bullet list for system prompt injection.

    Args:
        memories: List of memory objects with 'content' and 'category' fields

    Returns:
        Formatted string for system prompt
    """
    if not memories:
        return ""

    lines = []
    for memory in memories:
        category = memory.category if hasattr(memory, 'category') else 'other'
        content = memory.content if hasattr(memory, 'content') else str(memory)
        lines.append(f"- [{category}] {content}")

    return MEMORY_CONTEXT_TEMPLATE.format(memories="\n".join(lines))


def format_current_memories(memories: list) -> str:
    """
    Format current memories for the update prompt.

    Args:
        memories: List of memory objects

    Returns:
        Formatted string with ID | content | category
    """
    if not memories:
        return "No existing memories."

    lines = []
    for memory in memories:
        memory_id = str(memory.id) if hasattr(memory, 'id') else "unknown"
        content = memory.content if hasattr(memory, 'content') else str(memory)
        category = memory.category if hasattr(memory, 'category') else 'other'
        lines.append(f"{memory_id} | {content} | {category}")

    return "\n".join(lines)


def format_new_facts(facts: list) -> str:
    """
    Format extracted facts for the update prompt.

    Args:
        facts: List of fact dictionaries with 'content' and 'category'

    Returns:
        Formatted string
    """
    if not facts:
        return "No new facts."

    lines = []
    for fact in facts:
        if isinstance(fact, dict):
            content = fact.get('content', str(fact))
            category = fact.get('category', 'other')
        else:
            content = str(fact)
            category = 'other'
        lines.append(f"- [{category}] {content}")

    return "\n".join(lines)
