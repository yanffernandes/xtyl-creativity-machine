# Arquitetura do Agente de IA com Streaming SSE

Este documento explica como funciona o sistema de agente autônomo de IA da aplicação, incluindo o fluxo de dados, eventos SSE e ciclo de execução.

---

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────────┐  │
│  │   ChatSidebar   │───▶│  fetch() SSE     │───▶│  Event Handlers       │  │
│  │   (React)       │    │  ReadableStream  │    │  (state updates)      │  │
│  └─────────────────┘    └──────────────────┘    └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP POST + SSE Stream
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                              │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────────────┐  │
│  │  /chat/         │───▶│  Agent Loop      │───▶│  Tool Executor        │  │
│  │  completion-    │    │  (iterations)    │    │  (create_document,    │  │
│  │  stream         │    │                  │    │   generate_image...)  │  │
│  └─────────────────┘    └──────────────────┘    └───────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│                         ┌──────────────────┐                               │
│                         │  OpenRouter API  │                               │
│                         │  (LLM Provider)  │                               │
│                         └──────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Execução Detalhado

### 1. Início da Requisição (Frontend)

```typescript
// ChatSidebar.tsx - Linha ~650
console.log('🚀 CHAT SEND STARTED')
console.log('Input:', userMessage)
console.log('Model:', selectedModel)
console.log('Project ID:', projectId)

// Chamada para o endpoint de streaming
const response = await fetch('http://localhost:8000/chat/completion-stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: conversationHistory,
    model: 'x-ai/grok-4.1-fast',
    project_id: 'e5644e51-...',
    autonomous_mode: true,  // Habilita o loop de agente
    current_document: { ... }
  })
})
```

### 2. Backend Recebe e Inicia o Agente

```
┌────────────────────────────────────────────────────────────────┐
│                    AGENT LOOP (Backend)                        │
│                                                                │
│  ┌──────────────┐                                             │
│  │  Iteration 1 │                                             │
│  │  max: 15     │                                             │
│  └──────┬───────┘                                             │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  1. Envia contexto para LLM (OpenRouter)                 │ │
│  │     - System prompt com tools disponíveis                │ │
│  │     - Histórico de mensagens                             │ │
│  │     - Documento atual                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  2. LLM decide:                                          │ │
│  │     a) Chamar uma tool (create_document, generate_image) │ │
│  │     b) Responder ao usuário (fim do loop)                │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  3. Se tool chamada:                                     │ │
│  │     - Executa a tool                                     │ │
│  │     - Adiciona resultado ao contexto                     │ │
│  │     - Volta para passo 1 (próxima iteração)              │ │
│  └──────────────────────────────────────────────────────────┘ │
│         │                                                      │
│         ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  4. Se resposta final:                                   │ │
│  │     - Envia chunks de texto via SSE                      │ │
│  │     - Encerra o loop                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Tipos de Eventos SSE

O backend emite diferentes tipos de eventos durante a execução. Cada evento é uma linha no formato:

```
data: {"type": "event_type", ...payload}
```

### Tabela de Eventos

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `status` | Atualização de status geral | `{ message: string }` |
| `iteration` | Início de nova iteração do loop | `{ current: number, max: number }` |
| `timing` | Medição de tempo de uma etapa | `{ duration_ms: number, step: string }` |
| `task_list` | Lista de tarefas planejadas | `{ tasks: Task[] }` |
| `task_update` | Atualização de status de tarefa | `{ task_id: string, status: string }` |
| `tool_auto_approved` | Tool aprovada automaticamente | `{ tool: string }` |
| `tool_start` | Início de execução de tool | `{ tool: string, args: object, index: number, total: number }` |
| `tool_complete` | Tool finalizada com sucesso | `{ tool: string, result: object, duration_ms: number }` |
| `tool_error` | Erro na execução de tool | `{ tool: string, error: string }` |
| `tool_timeout` | Timeout na execução | `{ tool: string, timeout: number }` |
| `tool_retry` | Tentando novamente | `{ tool: string, attempt: number }` |
| `message_chunk` | Fragmento da resposta final | `{ content: string }` |
| `done` | Fim do streaming | `{}` |
| `error` | Erro geral | `{ message: string }` |

---

## Exemplo Real de Fluxo (do seu log)

```
Iteração 1: Usuário pede criar segunda versão do criativo
─────────────────────────────────────────────────────────────────

📨 status      → "Iniciando agente IA..."
📨 iteration   → { current: 1, max: 15 }
📨 status      → "Consultando modelo de IA..."
📨 timing      → { duration_ms: 13172, step: 'llm_call' }  // LLM pensou 13s
📨 task_list   → [ { id: 'task-1-0', description: 'Criar documento' } ]
📨 tool_auto_approved → { tool: 'create_document' }
📨 tool_start  → { tool: 'create_document', args: {...}, index: 1, total: 1 }
📨 task_update → { task_id: 'task-1-0', status: 'in_progress' }
📨 tool_complete → { tool: 'create_document', result: {...}, duration_ms: 1812 }
📨 task_update → { task_id: 'task-1-0', status: 'completed' }


Iteração 2: Agente decide gerar imagem
─────────────────────────────────────────────────────────────────

📨 iteration   → { current: 2, max: 15 }
📨 status      → "Consultando modelo de IA..."
📨 timing      → { duration_ms: 10941, step: 'llm_call' }  // LLM pensou 11s
📨 task_list   → [ { id: 'task-2-0', description: 'Gerar imagem' } ]
📨 tool_auto_approved → { tool: 'generate_image' }
📨 tool_start  → { tool: 'generate_image', args: {...}, index: 1, total: 1 }
📨 task_update → { task_id: 'task-2-0', status: 'in_progress' }
📨 tool_complete → { tool: 'generate_image', duration_ms: 43188 }  // 43s gerando
📨 task_update → { task_id: 'task-2-0', status: 'completed' }


Iteração 3: Agente responde ao usuário (streaming de texto)
─────────────────────────────────────────────────────────────────

📨 iteration   → { current: 3, max: 15 }
📨 status      → "Consultando modelo de IA..."
📨 message_chunk → { content: '##' }
📨 message_chunk → { content: ' Segunda' }
📨 message_chunk → { content: ' Vers' }
📨 message_chunk → { content: 'ão' }
📨 message_chunk → { content: ' Cri' }
📨 message_chunk → { content: 'ada' }
...
📨 done        → {}
```

---

## Diagrama Visual do Ciclo

```
                    ┌─────────────────────────────────────┐
                    │         INÍCIO DO LOOP              │
                    └─────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │    Envia mensagens + tools para LLM │
                    │    (OpenRouter API)                 │
                    └─────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │         LLM RESPONDE                │
                    └─────────────────────────────────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     │                                 │
                     ▼                                 ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │   Tool Call?          │       │   Texto Final?        │
        │   (function_call)     │       │   (content)           │
        └───────────────────────┘       └───────────────────────┘
                     │                                 │
                     ▼                                 ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  Executa a Tool       │       │  Stream chunks        │
        │  - create_document    │       │  para o frontend      │
        │  - generate_image     │       │                       │
        │  - refine_image       │       └───────────────────────┘
        │  - search_documents   │                      │
        │  - analyze_images     │                      ▼
        └───────────────────────┘       ┌───────────────────────┐
                     │                  │      FIM DO LOOP      │
                     ▼                  │      (done event)     │
        ┌───────────────────────┐       └───────────────────────┘
        │  Adiciona resultado   │
        │  ao contexto          │
        └───────────────────────┘
                     │
                     │ (volta ao início, iteration++)
                     └──────────────────────────────────────────┐
                                                                │
                    ┌───────────────────────────────────────────┘
                    ▼
        ┌───────────────────────┐
        │  Limite de iterações  │──────▶ Força fim do loop
        │  (max: 15)            │
        └───────────────────────┘
```

---

## Frontend: Processamento dos Eventos

```typescript
// ChatSidebar.tsx - Processamento do stream SSE

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  const lines = chunk.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6))

      switch (event.type) {
        case 'status':
          setStatusMessage(event.message)
          break

        case 'iteration':
          console.log(`Iteração ${event.current}/${event.max}`)
          break

        case 'task_list':
          setTasks(event.tasks)
          break

        case 'task_update':
          updateTaskStatus(event.task_id, event.status)
          break

        case 'tool_start':
          setCurrentTool({ name: event.tool, args: event.args })
          break

        case 'tool_complete':
          handleToolResult(event.tool, event.result)
          // Atualiza sidebar se documento/imagem foi criado
          invalidateSidebarCache()
          break

        case 'message_chunk':
          // Acumula texto da resposta
          setMessage(prev => prev + event.content)
          break

        case 'done':
          setIsStreaming(false)
          break
      }
    }
  }
}
```

---

## Tools Disponíveis

| Tool | Descrição | Parâmetros Principais |
|------|-----------|----------------------|
| `create_document` | Cria novo documento de texto | `title`, `content`, `media_type` |
| `update_document` | Atualiza documento existente | `document_id`, `content` |
| `generate_image` | Gera imagem com IA | `prompt`, `size`, `style` |
| `refine_image` | Refina imagem existente | `image_id`, `instructions` |
| `analyze_document_images` | Analisa imagens anexadas | `document_id` |
| `search_documents` | Busca RAG em documentos | `query`, `project_id` |
| `list_project_documents` | Lista documentos do projeto | `project_id` |

---

## Resumo do Fluxo

1. **Usuário envia mensagem** → Frontend faz POST para `/chat/completion-stream`
2. **Backend inicia loop** → Emite `status`, `iteration`
3. **LLM é consultado** → Emite `timing` com duração
4. **Se LLM pede tool** → Emite `tool_start`, executa, emite `tool_complete`
5. **Loop continua** → Volta ao passo 3 com novo contexto
6. **Se LLM responde texto** → Emite `message_chunk` em streaming
7. **Fim** → Emite `done`, frontend finaliza

---

## Performance Típica

| Etapa | Tempo Típico |
|-------|--------------|
| LLM call (decisão) | 5-15s |
| create_document | 1-3s |
| generate_image | 30-60s |
| refine_image | 30-60s |
| analyze_images | 5-15s |
| Total (2-3 tools) | 1-2 min |
