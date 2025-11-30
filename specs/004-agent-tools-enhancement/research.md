# Research: Melhoria do Sistema de Ferramentas do Assistente IA

**Feature**: 004-agent-tools-enhancement
**Date**: 2025-11-26

## Research Questions

### 1. Como implementar modo autônomo sem quebrar fluxo de aprovação existente?

**Decision**: Adicionar flag `autonomous_mode` no request de chat e verificar antes de enviar `tool_approval_request`

**Rationale**:
- O fluxo atual já usa `pending_approvals` dict com asyncio.Event para esperar aprovação
- Em modo autônomo, simplesmente pular a espera e executar diretamente
- Manter o evento `tool_start` para UI mostrar progresso mesmo sem aprovação

**Alternatives Considered**:
1. ❌ Criar endpoint separado para modo autônomo - duplicaria código desnecessariamente
2. ❌ Auto-aprovar no frontend - manteria latência de round-trip desnecessária
3. ✅ Flag no backend - execução mais rápida, menos eventos SSE

**Implementation Pattern**:
```python
# chat.py - dentro do loop de tool execution
if autonomous_mode:
    # Skip approval, execute directly
    yield f"data: {json.dumps({'type': 'tool_start', ...})}\n\n"
    result = execute_tool(tool_name, tool_args, db)
    yield f"data: {json.dumps({'type': 'tool_complete', ...})}\n\n"
else:
    # Existing approval flow
    yield f"data: {json.dumps({'type': 'tool_approval_request', ...})}\n\n"
    # ... wait for approval
```

---

### 2. Como persistir preferências do usuário globalmente?

**Decision**: Criar tabela `user_preferences` com coluna JSONB para extensibilidade

**Rationale**:
- O modelo User atual não tem campos de preferências
- Workspace tem `available_models` como JSONB - padrão estabelecido
- JSONB permite adicionar novas preferências sem migrations
- Um registro por usuário (1:1 relationship)

**Alternatives Considered**:
1. ❌ Adicionar campos no modelo User - poluiria modelo com dados não-essenciais
2. ❌ localStorage no frontend - não sincroniza entre dispositivos
3. ✅ Tabela separada com JSONB - flexível e escalável

---

### 3. Como implementar lista de tarefas visual com atualização em tempo real?

**Decision**: Novo evento SSE `task_list` com array de tarefas, seguido de `task_update` para cada mudança

**Rationale**:
- SSE já suporta múltiplos tipos de evento
- O LLM pode gerar a lista de tarefas como parte do primeiro response
- Cada execução de ferramenta atualiza o status correspondente

**Event Structure**:
```typescript
// Evento inicial com lista completa
{
  type: 'task_list',
  tasks: [
    { id: '1', description: 'Criar pasta Ideias', status: 'pending' },
    { id: '2', description: 'Criar documento 1', status: 'pending' },
    { id: '3', description: 'Criar documento 2', status: 'pending' }
  ]
}

// Evento de atualização individual
{
  type: 'task_update',
  task_id: '1',
  status: 'completed', // ou 'in_progress', 'failed'
  result?: { ... }
}
```

---

### 4. Como detectar e prevenir loops infinitos?

**Decision**: Detectar repetição de tool calls com mesmos argumentos + contador de iterações

**Rationale**:
- Loop infinito = mesma ferramenta com mesmos args em sequência
- Manter histórico das últimas N tool calls
- Se repetir 3x consecutivas, considerar loop e pausar

**Implementation**:
```python
recent_tool_calls = []  # Últimas 5 chamadas

def is_potential_loop(tool_name, tool_args):
    call_signature = f"{tool_name}:{json.dumps(tool_args, sort_keys=True)}"
    recent_tool_calls.append(call_signature)
    if len(recent_tool_calls) > 5:
        recent_tool_calls.pop(0)

    # Se as últimas 3 são iguais, é loop
    if len(recent_tool_calls) >= 3:
        last_three = recent_tool_calls[-3:]
        if len(set(last_three)) == 1:
            return True
    return False
```

---

### 5. Como implementar timeout com indicador de progresso e cancelamento?

**Decision**: Timer no frontend com evento de cancelamento + timeout no backend com asyncio.wait_for

**Rationale**:
- Frontend mostra timer visual e botão cancelar
- Backend usa asyncio.wait_for com timeout configurável
- Cancelamento envia evento `tool_cancel` que o backend escuta

**Implementation**:
```python
# Backend
TOOL_TIMEOUTS = {
    'generate_image': 120,  # 2 minutos
    'default': 60  # 1 minuto
}

timeout = TOOL_TIMEOUTS.get(tool_name, TOOL_TIMEOUTS['default'])
try:
    result = await asyncio.wait_for(
        execute_tool_async(tool_name, tool_args, db),
        timeout=timeout
    )
except asyncio.TimeoutError:
    yield f"data: {json.dumps({'type': 'tool_error', 'error': 'Timeout'})}\n\n"
```

---

### 6. Como implementar retry automático em caso de falha?

**Decision**: Retry 1x com backoff de 2s antes de pausar para decisão do usuário

**Rationale**:
- Falhas transientes (network, rate limit) se resolvem com retry
- Mais de 1 retry pode mascarar problemas reais
- Backoff evita sobrecarregar o serviço

**Implementation**:
```python
MAX_RETRIES = 1
RETRY_DELAY = 2  # segundos

for attempt in range(MAX_RETRIES + 1):
    try:
        result = execute_tool(tool_name, tool_args, db)
        break
    except Exception as e:
        if attempt < MAX_RETRIES:
            yield f"data: {json.dumps({'type': 'tool_retry', 'attempt': attempt + 1})}\n\n"
            await asyncio.sleep(RETRY_DELAY)
        else:
            # Pausa e pergunta ao usuário
            yield f"data: {json.dumps({'type': 'tool_failed', 'error': str(e)})}\n\n"
```

---

## Best Practices Identified

### SSE Streaming Pattern (Existing)
- Usar `StreamingResponse` com `media_type="text/event-stream"`
- Eventos no formato `data: {json}\n\n`
- Tipos de evento tipados para frontend parsing

### Tool Definition Pattern (Existing)
- Seguir formato OpenRouter function calling
- `TOOL_DEFINITIONS` list com schema JSON
- `execute_tool()` dispatcher function

### User Preferences Pattern (New)
- Tabela dedicada com FK para User
- JSONB para extensibilidade
- Endpoint REST simples (GET/PUT)

---

## Dependencies Confirmed

| Dependency | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.104+ | Backend API framework |
| SQLAlchemy | 2.0+ | ORM with JSONB support |
| asyncio | stdlib | Async operations, timeouts |
| React | 18+ | Frontend UI |
| Framer Motion | 10+ | Task list animations |

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Loop detection false positives | Médio | Permitir override manual, log para análise |
| Timeout muito curto para imagens | Alto | 120s para imagens, monitorar métricas |
| Preferências dessincronizadas | Baixo | Fetch no mount + invalidate on change |
| SSE connection drop durante execução | Médio | Frontend mostra estado final no reconnect |

---

## Conclusion

Todos os unknowns foram resolvidos. A implementação pode prosseguir para Phase 1 (Data Model & Contracts).
