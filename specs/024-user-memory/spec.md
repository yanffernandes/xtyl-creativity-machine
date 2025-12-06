# Feature 024: User Memory System

## Overview

Sistema de memória persistente para usuários, inspirado no mem0, que permite ao assistente de IA lembrar informações importantes sobre o usuário dentro do contexto de um projeto. O sistema extrai automaticamente fatos relevantes das conversas e os usa para personalizar respostas futuras.

## Goals

1. **Extração automática de memórias**: Extrair fatos relevantes das conversas do usuário usando LLM
2. **Gerenciamento inteligente**: ADD/UPDATE/DELETE de memórias baseado em contradições e atualizações
3. **Busca semântica**: Recuperar memórias relevantes usando embeddings e pgvector
4. **Interface de gerenciamento**: UI para o usuário visualizar, editar e remover memórias
5. **Configuração admin**: Permitir admin escolher o modelo LLM para extração de memórias

## Non-Goals

- Graph memory (complexidade desnecessária para v1)
- Memória entre projetos diferentes (escopo é user + project)
- Memória do agente/assistente (apenas memórias do usuário)
- Sincronização em tempo real entre dispositivos

## Technical Requirements

### Backend Stack
- Python 3.11, FastAPI, SQLAlchemy
- PostgreSQL com pgvector (já existente)
- OpenAI Embeddings via OpenRouter (já configurado)

### Frontend Stack
- Next.js 14, React 18, TypeScript
- Shadcn/UI, Tailwind CSS
- Framer Motion para animações

## Architecture

### Fluxo de Extração de Memórias

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Chat       │────▶│  Memory      │────▶│  Fact           │
│  Message    │     │  Service     │     │  Extraction LLM │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │                      │
                           │                      ▼
                           │              ┌─────────────────┐
                           │              │  New Facts      │
                           │              │  {"facts": [...]}│
                           │              └─────────────────┘
                           │                      │
                           ▼                      ▼
                    ┌──────────────┐     ┌─────────────────┐
                    │  Vector      │◀────│  Memory Update  │
                    │  Store       │     │  LLM (ADD/UPD)  │
                    │  (pgvector)  │     └─────────────────┘
                    └──────────────┘
```

### Fluxo de Recuperação de Memórias

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  User       │────▶│  Memory      │────▶│  Vector Search  │
│  Message    │     │  Service     │     │  (pgvector)     │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  Relevant       │
                                         │  Memories       │
                                         └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  Inject into    │
                                         │  System Prompt  │
                                         └─────────────────┘
```

## Database Schema

### Nova tabela: `user_memories`

```sql
CREATE TABLE user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

    -- Memory content
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 para detectar duplicatas

    -- Vector embedding (1536 dimensions for text-embedding-3-small)
    embedding vector(1536),

    -- Metadata
    category VARCHAR(50), -- 'preference', 'personal', 'professional', 'plan', 'other'
    source_conversation_id VARCHAR, -- ID da conversa de origem

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes
    CONSTRAINT unique_memory_hash UNIQUE (user_id, project_id, content_hash)
);

-- Indexes
CREATE INDEX idx_user_memories_user_project ON user_memories(user_id, project_id);
CREATE INDEX idx_user_memories_embedding ON user_memories USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_user_memories_category ON user_memories(category);
```

### system_config updates

```sql
-- Adicionar configuração do modelo de memória
INSERT INTO system_config (key, value, description, category)
VALUES (
    'memory_extraction_model',
    '"openai/gpt-4.1-nano"',
    'Modelo LLM usado para extração e gerenciamento de memórias',
    'ai_models'
);
```

## API Endpoints

### Memory Management

```
GET    /projects/{project_id}/memories          # Listar memórias do usuário
POST   /projects/{project_id}/memories          # Criar memória manual
PUT    /projects/{project_id}/memories/{id}     # Atualizar memória
DELETE /projects/{project_id}/memories/{id}     # Remover memória
DELETE /projects/{project_id}/memories          # Remover todas memórias
```

### Memory Processing (Internal)

```
POST   /internal/memories/extract               # Extrair memórias de mensagem
POST   /internal/memories/search                # Buscar memórias relevantes
```

### Admin Configuration

```
GET    /admin/config/memory_extraction_model    # Obter modelo atual
PUT    /admin/config/memory_extraction_model    # Atualizar modelo
```

## Prompts (Baseados no mem0)

### 1. FACT_EXTRACTION_PROMPT

```python
FACT_EXTRACTION_PROMPT = """You are a Personal Information Organizer specialized in extracting facts about the user from conversations.

Your role is to extract relevant pieces of information and organize them into distinct facts.

Types of Information to Extract:
1. Personal Preferences: likes, dislikes, preferences in food, products, activities
2. Personal Details: names, relationships, important dates
3. Plans and Intentions: upcoming events, trips, goals
4. Professional Details: job titles, work habits, career goals
5. Health and Wellness: dietary restrictions, fitness routines
6. Miscellaneous: favorite books, movies, brands

IMPORTANT:
- Only extract facts from USER messages, NOT from assistant messages
- Return facts in the same language as the user input
- Return empty list if no relevant facts found

Output format (JSON):
{"facts": ["fact 1", "fact 2", ...]}

Examples:

User: Hi, my name is John. I work as a software engineer.
Output: {"facts": ["Name is John", "Works as a software engineer"]}

User: I'm allergic to peanuts and I prefer vegetarian food.
Output: {"facts": ["Allergic to peanuts", "Prefers vegetarian food"]}

User: Hello, how are you?
Output: {"facts": []}
"""
```

### 2. MEMORY_UPDATE_PROMPT

```python
MEMORY_UPDATE_PROMPT = """You are a memory manager that controls user memories.

Operations:
- ADD: Add new fact to memory (generate new ID)
- UPDATE: Update existing memory with new info (keep same ID)
- DELETE: Remove memory that contradicts new info
- NONE: No change needed

Guidelines:
1. ADD: New information not in existing memories
2. UPDATE: Same topic but with more/different details
3. DELETE: New fact directly contradicts existing memory
4. NONE: Information already exists or is irrelevant

Current memories:
{current_memories}

New facts to process:
{new_facts}

Return JSON format:
{
    "memory": [
        {
            "id": "<existing or new ID>",
            "text": "<memory content>",
            "event": "ADD|UPDATE|DELETE|NONE",
            "old_memory": "<only for UPDATE, previous content>"
        }
    ]
}
"""
```

## Frontend Components

### 1. MemoryDrawer

Localização: Acessível via menu de 3 pontos no ChatSidebar, junto com histórico de conversas.

```tsx
interface MemoryDrawerProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

Features:
- Lista de memórias com categoria/badge
- Busca por texto
- Filtro por categoria
- Edição inline
- Remoção individual e em massa
- Indicador de quando foi atualizada

### 2. MemoryCard

```tsx
interface MemoryCardProps {
  memory: UserMemory
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
}
```

### 3. Admin Memory Config

No painel de administração, adicionar seção para:
- Selecionar modelo de extração de memórias
- Ver estatísticas de uso de memórias
- Toggle para habilitar/desabilitar sistema de memórias globalmente

## Integration Points

### 1. Chat Flow Integration

No `llm_service.py`, antes de enviar mensagem para LLM:

```python
async def process_chat_with_memory(
    message: str,
    user_id: str,
    project_id: str,
    conversation_id: str
):
    # 1. Buscar memórias relevantes
    relevant_memories = await memory_service.search(
        query=message,
        user_id=user_id,
        project_id=project_id,
        limit=5
    )

    # 2. Injetar no system prompt
    system_prompt = build_system_prompt_with_memories(relevant_memories)

    # 3. Processar resposta do LLM
    response = await generate_response(message, system_prompt)

    # 4. Extrair e salvar novas memórias (async, não bloqueia resposta)
    asyncio.create_task(
        memory_service.extract_and_save(
            messages=[{"role": "user", "content": message}],
            user_id=user_id,
            project_id=project_id,
            conversation_id=conversation_id
        )
    )

    return response
```

### 2. System Prompt Injection

```python
def build_system_prompt_with_memories(memories: List[UserMemory]) -> str:
    if not memories:
        return base_system_prompt

    memory_section = "\n\nUser Information (from previous conversations):\n"
    for mem in memories:
        memory_section += f"- {mem.content}\n"

    return base_system_prompt + memory_section
```

## UI/UX Design

### Acesso às Memórias

1. No `ChatSidebar`, no menu de 3 pontos (onde está "Ver histórico"):
   - Adicionar item "Memórias" com ícone de Brain
   - Ao clicar, abre `MemoryDrawer` (sheet/drawer lateral)

### MemoryDrawer Layout

```
┌────────────────────────────────────────┐
│  ← Memórias                     [X]    │
├────────────────────────────────────────┤
│  🔍 Buscar memórias...                 │
│                                        │
│  Filtrar: [Todas ▼]                    │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 👤 Personal                      │  │
│  │ Nome é João                  [✎] │  │
│  │ Atualizado há 2 dias        [🗑] │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 💼 Professional                  │  │
│  │ Trabalha como desenvolvedor  [✎] │  │
│  │ Atualizado há 1 semana      [🗑] │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 🎯 Preferences                   │  │
│  │ Prefere comunicação direta   [✎] │  │
│  │ Atualizado há 3 dias        [🗑] │  │
│  └──────────────────────────────────┘  │
│                                        │
├────────────────────────────────────────┤
│  [Limpar todas as memórias]            │
└────────────────────────────────────────┘
```

### Categorias de Memória

| Categoria | Ícone | Descrição |
|-----------|-------|-----------|
| personal | 👤 | Nome, relacionamentos, datas |
| professional | 💼 | Trabalho, carreira, empresa |
| preference | 🎯 | Gostos, preferências |
| plan | 📅 | Planos, metas, eventos |
| health | 💪 | Saúde, dieta, fitness |
| other | 📝 | Outros |

## Admin Panel Integration

### Seção: AI Configuration > Memory System

```
┌─────────────────────────────────────────────────────┐
│  Memory System Configuration                         │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Enable Memory System: [✓]                          │
│                                                      │
│  Extraction Model:                                   │
│  ┌─────────────────────────────────────────────┐    │
│  │ openai/gpt-4.1-nano                     ▼   │    │
│  └─────────────────────────────────────────────┘    │
│  ℹ️ Modelo usado para extrair e gerenciar memórias  │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  Statistics:                                         │
│  • Total memories: 1,234                            │
│  • Active users with memories: 56                   │
│  • Avg memories per user: 22                        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Performance Considerations

1. **Extração assíncrona**: Memórias são extraídas após a resposta ser enviada
2. **Cache de embeddings**: Reutilizar embeddings quando possível
3. **Limite de memórias**: Máximo de 100 memórias por usuário/projeto
4. **Busca vetorial otimizada**: Usar IVFFlat index com listas apropriadas
5. **Batch processing**: Processar múltiplas mensagens em lote quando possível

## Security Considerations

1. **Isolamento**: Memórias são isoladas por user_id + project_id
2. **RLS**: Row Level Security para garantir acesso apenas às próprias memórias
3. **Sanitização**: Sanitizar conteúdo antes de salvar
4. **Logs de auditoria**: Registrar alterações em memórias para compliance
5. **Exclusão**: Usuário pode deletar todas as memórias a qualquer momento

## Testing Strategy

1. **Unit tests**: Serviços de extração e atualização de memórias
2. **Integration tests**: Fluxo completo de chat com memórias
3. **E2E tests**: UI de gerenciamento de memórias
4. **Performance tests**: Busca vetorial com volume alto

## Migration Plan

1. Criar tabela `user_memories` com migração SQL
2. Adicionar configuração `memory_extraction_model` no system_config
3. Implementar serviço de memória no backend
4. Integrar com fluxo de chat existente
5. Criar componentes de UI
6. Adicionar seção no admin panel
7. Testes e rollout gradual

## Success Metrics

1. **Adoption**: % de usuários com memórias ativas
2. **Accuracy**: Taxa de memórias corretas vs incorretas
3. **Engagement**: Frequência de uso do assistente após ativar memórias
4. **Satisfaction**: Feedback qualitativo dos usuários

## References

- [mem0 Repository](https://github.com/mem0ai/mem0)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
