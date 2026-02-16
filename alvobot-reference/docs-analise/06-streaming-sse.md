# Arquitetura de Streaming (SSE)

## Visao Geral

O sistema usa **Server-Sent Events (SSE)** para transmitir o progresso da geracao de imagens em tempo real. Em vez de esperar o batch inteiro completar, o frontend mostra cada imagem assim que ela fica pronta.

---

## Fluxo Completo

```
FRONTEND                              BACKEND
────────                              ───────

1. POST /meta/creatives/generate/init
   { articles, count, mode, format }
                    ──────────────────►
                                       Cria sessao (CreativeSessionService)
                                       Pre-aloca N slots (status: queued)
                    ◄──────────────────
   { sessionId, slots[] }

2. GET /meta/creatives/generate/stream?sessionId=xxx&token=yyy
                    ──────────────────►
                                       Abre RxJS Observable
                                       Inicia geracao em background
                    ◄──────────────────
   SSE: event: started
   SSE: event: queued (slot 0)
   SSE: event: generating (slot 0, model: gemini-3-pro)
   SSE: event: completed (slot 0, imageUrl, modelUsed)
   SSE: event: queued (slot 1)
   SSE: event: generating (slot 1, model: nano-banana-pro)
   SSE: event: failed (slot 1, error: timeout)
   SSE: event: retrying (slot 1, attempt: 2)
   SSE: event: completed (slot 1, imageUrl, modelUsed)
   ...
   SSE: event: done (diversityMetrics, stats)

3. POST /meta/creatives/generate/retry
   { sessionId, imageId }
                    ──────────────────►
                                       Regenera imagem especifica
                    ◄──────────────────
   SSE: event: retrying (slot X)
   SSE: event: completed (slot X, imageUrl)
```

---

## Eventos SSE

| Evento | Payload | Descricao |
|--------|---------|-----------|
| `sync` | `{ slots[], stats }` | Sincronizacao ao reconectar |
| `started` | `{ sessionId, totalSlots }` | Sessao iniciada |
| `queued` | `{ slotId, index }` | Slot na fila de geracao |
| `generating` | `{ slotId, model, concept }` | Geracao em andamento |
| `completed` | `{ slotId, imageUrl, storagePath, modelUsed, conceptUsed, libraryId }` | Imagem pronta |
| `failed` | `{ slotId, error, canRetry }` | Falha na geracao |
| `retrying` | `{ slotId, attempt, maxAttempts }` | Tentando novamente |
| `done` | `{ diversityMetrics, stats, pendingIds }` | Sessao finalizada |

---

## Backend: CreativeSessionService

### Gerenciamento de Sessao (Em Memoria)

```typescript
interface GenerationSession {
  id: string;
  userId: string;
  slots: Map<string, CreativeSlotDto>;  // slotId → estado
  subject: Subject<any>;                // RxJS Subject para emitir eventos
  createdAt: Date;
  stats: {
    generated: number;
    failed: number;
    pending: number;
    queued: number;
    generating: number;
  };
}

interface CreativeSlotDto {
  id: string;
  index: number;
  status: 'queued' | 'generating' | 'completed' | 'failed' | 'retrying';
  imageUrl?: string;
  storagePath?: string;
  modelUsed?: string;
  conceptUsed?: { id, slug, name };
  error?: string;
  retryCount: number;
  maxRetries: number;
}
```

### Ciclo de Vida

```
1. createSession(userId, count)
   └── Cria sessao com Map de N slots (status: queued)
   └── Cria RxJS Subject para streaming

2. emitEvent(sessionId, event)
   └── Atualiza estado do slot automaticamente
   └── Emite evento via Subject → Observable → SSE

3. getSessionObservable(sessionId)
   └── Retorna Observable para o controller fazer SSE

4. closeSession(sessionId)
   └── Emite evento 'done' com metricas
   └── Completa o Subject

5. Cleanup automatico
   └── A cada 5 minutos, remove sessoes > 1 hora (SESSION_TTL_MS)
   └── Completa o Subject para liberar conexoes SSE
```

---

## Frontend: useStreamingCreatives Hook

### Conexao SSE

```typescript
function useStreamingCreatives() {
  const [slots, setSlots] = useState<Map<string, CreativeSlot>>();
  const eventSourceRef = useRef<EventSource | null>(null);

  const startGeneration = async (config) => {
    // 1. Inicializa sessao
    const { sessionId, slots } = await api.post('/meta/creatives/generate/init', config);

    // 2. Obtem token Supabase para autenticacao SSE
    const token = supabase.auth.session()?.access_token;

    // 3. Abre conexao SSE (EventSource nao suporta headers)
    const url = `${API_URL}/meta/creatives/generate/stream?sessionId=${sessionId}&token=${token}`;
    const eventSource = new EventSource(url);

    // 4. Handlers de eventos
    eventSource.addEventListener('completed', (e) => {
      const data = JSON.parse(e.data);
      setSlots(prev => {
        prev.set(data.slotId, { ...prev.get(data.slotId), ...data, status: 'completed' });
        return new Map(prev);
      });
      // Adiciona ao store global
      wizardStore.addGeneratedImage(data);
    });

    eventSource.addEventListener('failed', (e) => {
      const data = JSON.parse(e.data);
      setSlots(prev => {
        prev.set(data.slotId, { ...prev.get(data.slotId), ...data, status: 'failed' });
        return new Map(prev);
      });
    });

    eventSource.addEventListener('done', (e) => {
      const data = JSON.parse(e.data);
      eventSource.close();
      // Atualiza metricas de diversidade no store
      wizardStore.setDiversityMetrics(data.diversityMetrics);
      // Verifica imagens pendentes (se houver)
      if (data.pendingIds?.length > 0) {
        startPendingPolling(data.pendingIds);
      }
    });
  };

  return { slots, startGeneration, retryImage, cancel };
}
```

### Autenticacao SSE

**Problema**: `EventSource` nao suporta headers customizados.

**Solucao**: Token passado via query parameter:
```
GET /meta/creatives/generate/stream?sessionId=xxx&token=eyJhbGci...
```

O backend valida o token no endpoint SSE antes de iniciar o streaming.

---

## Pending Generations (Polling)

Quando um provider (Replicate) nao completa a tempo:

```
Frontend                                Backend
────────                                ───────

1. SSE event: done (pendingIds: ['pred_123', 'pred_456'])

2. Poll: GET /meta/creatives/pending/batch?ids=pred_123,pred_456
                    ──────────────────►
                                        Verifica status em cada provider
                    ◄──────────────────
   { results: [
     { id: 'pred_123', status: 'completed', imageUrl: '...', modelUsed: '...' },
     { id: 'pred_456', status: 'pending' }
   ]}

3. Se ainda pending, poll novamente em 5 segundos

4. Se completed, atualiza imagem no grid
```

### Hook: usePendingGenerationsPolling

```typescript
function usePendingGenerationsPolling(pendingIds) {
  useEffect(() => {
    if (!pendingIds.length) return;

    const interval = setInterval(async () => {
      const results = await api.get('/meta/creatives/pending/batch', {
        params: { ids: pendingIds.join(',') }
      });

      for (const result of results) {
        if (result.status === 'completed') {
          // Atualiza imagem no store
          wizardStore.updateGeneratedImage(result.id, {
            imageUrl: result.imageUrl,
            status: 'completed'
          });
          // Remove da lista de pendentes
          pendingIds = pendingIds.filter(id => id !== result.id);
        }
      }

      if (pendingIds.length === 0) {
        clearInterval(interval);
      }
    }, 5000); // Poll a cada 5 segundos

    return () => clearInterval(interval);
  }, [pendingIds]);
}
```

---

## Vantagens da Arquitetura SSE

| Vantagem | Descricao |
|----------|-----------|
| **Feedback instantaneo** | Usuario ve cada imagem assim que fica pronta |
| **Tolerancia a falhas** | Se uma imagem falha, as outras continuam |
| **Retry granular** | Pode retentar apenas imagens falhas |
| **Pending handling** | Imagens lentas nao bloqueiam as rapidas |
| **Reconexao** | Evento `sync` restaura estado apos desconexao |
| **Cleanup automatico** | Sessoes expiram apos 1 hora |

---

## Relevancia para o Creativity Machine

### O Que Ja Temos de Similar
- Backend FastAPI com suporte a SSE
- `useWorkflowExecution` hook com streaming SSE para workflows
- Modelo de execucao com node-by-node progress

### O Que Podemos Adaptar
1. **Modelo de slots pre-alocados**: Mostrar grid com placeholders antes da geracao
2. **Eventos tipados**: `queued` → `generating` → `completed/failed`
3. **Pending generation**: Para providers lentos (fal.ai), nao bloquear o batch
4. **Retry individual**: Permitir retentar apenas imagens falhas
5. **Cleanup automatico**: Sessoes in-memory com TTL
