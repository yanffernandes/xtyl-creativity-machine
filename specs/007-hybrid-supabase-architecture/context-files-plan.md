# Plano de Implementação: Arquivos de Contexto (Context Files)

## Resumo

A funcionalidade "Arquivos de Contexto" existe na UI mas está **mockada**. Este plano detalha as alterações necessárias para torná-la 100% funcional, permitindo:
1. Upload de arquivos (PDF, TXT, MD, imagens) como contexto
2. Persistência da classificação (criação vs contexto)
3. Integração com RAG para busca semântica
4. Uso automático no chat para enriquecer respostas da IA

---

## Fase 1: Schema e Migração do Banco de Dados

### 1.1 Adicionar campo `is_context` na tabela `documents`

**Arquivo:** `backend/migrations/013_add_is_context_to_documents.sql`

```sql
-- Adiciona campo is_context para distinguir documentos de contexto
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_context BOOLEAN DEFAULT FALSE;

-- Índice para consultas de contexto
CREATE INDEX IF NOT EXISTS idx_documents_is_context ON documents(is_context) WHERE is_context = TRUE;

-- Índice composto para buscar contextos de um projeto
CREATE INDEX IF NOT EXISTS idx_documents_project_context ON documents(project_id, is_context) WHERE is_context = TRUE;
```

### 1.2 Atualizar Schema Supabase

**Arquivo:** `supabase-schema.sql` - Adicionar campo na definição de `documents`

### 1.3 Atualizar Models Backend

**Arquivo:** `backend/models.py` - Adicionar `is_context` em `Document`

```python
is_context = Column(Boolean, default=False)  # Flag para arquivos de contexto RAG
```

### 1.4 Atualizar Schemas Pydantic

**Arquivo:** `backend/schemas.py` - Adicionar em `DocumentBase`, `DocumentCreate`, `DocumentUpdate`, `Document`

---

## Fase 2: Backend - Endpoints e Serviços

### 2.1 Atualizar Endpoint de Upload

**Arquivo:** `backend/routers/documents.py`

- Adicionar parâmetro `is_context: bool = False` ao endpoint `/upload/{project_id}`
- Quando `is_context=True`, marcar documento e iniciar processamento RAG

### 2.2 Criar Endpoint para Listar Arquivos de Contexto

**Arquivo:** `backend/routers/documents.py`

```python
@router.get("/projects/{project_id}/context-files", response_model=List[DocumentSchema])
def list_context_files(project_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Lista todos os arquivos de contexto de um projeto"""
    return db.query(Document).filter(
        Document.project_id == project_id,
        Document.is_context == True,
        Document.deleted_at == None
    ).order_by(Document.created_at.desc()).all()
```

### 2.3 Criar Endpoint para Toggle Contexto

**Arquivo:** `backend/routers/documents.py`

```python
@router.post("/{document_id}/toggle-context")
async def toggle_document_context(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Alterna flag is_context e processa RAG se necessário"""
```

### 2.4 Atualizar RAG Service

**Arquivo:** `backend/rag_service.py`

- Garantir que `process_document` adiciona `project_id` nos metadados dos embeddings
- Permitir busca filtrada por `is_context=True`

---

## Fase 3: Frontend - Supabase Services

### 3.1 Atualizar Document Types

**Arquivo:** `frontend/src/types/supabase.ts`

```typescript
export interface Document {
  // ... campos existentes
  is_context: boolean | null
}
```

### 3.2 Atualizar Document Service

**Arquivo:** `frontend/src/lib/supabase/documents.ts`

```typescript
// Listar apenas arquivos de contexto
async listContextFiles(projectId: string): Promise<ServiceResult<Document[]>> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_context', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return { data, error: null }
}

// Toggle is_context
async toggleContext(id: string): Promise<ServiceResult<Document>> {
  // Primeiro busca o estado atual
  const { data: doc } = await this.get(id)
  if (!doc) throw new Error('Document not found')

  const { data, error } = await supabase
    .from('documents')
    .update({ is_context: !doc.is_context, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return { data, error: null }
}
```

### 3.3 Criar Hook useContextFiles

**Arquivo:** `frontend/src/hooks/use-context-files.ts`

```typescript
export function useContextFiles(projectId: string) {
  return useQuery({
    queryKey: ['context-files', projectId],
    queryFn: async () => {
      const { data, error } = await documentService.listContextFiles(projectId)
      if (error) throw error
      return data
    },
    enabled: !!projectId,
  })
}

export function useToggleContext() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Chama backend para toggle + processamento RAG
      const response = await api.post(`/documents/${id}/toggle-context`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['context-files'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
```

---

## Fase 4: Frontend - Atualização da UI

### 4.1 Atualizar Página do Projeto

**Arquivo:** `frontend/src/app/workspace/[id]/project/[projectId]/page.tsx`

**Mudanças:**
1. Remover dados mockados de `contextFiles` (linhas 276-279, 344-347)
2. Usar `useContextFiles(projectId)` para buscar contextos reais
3. Atualizar `handleToggleContext` para chamar backend
4. Atualizar área de upload para permitir `is_context=true`

```typescript
// Substituir mock por hook real
const { data: contextFiles = [], refetch: refetchContextFiles } = useContextFiles(projectId)

// Atualizar handler
const handleToggleContext = async (e: React.MouseEvent, doc: Document) => {
  e.stopPropagation()
  try {
    await api.post(`/documents/${doc.id}/toggle-context`)
    refetchDocuments()
    refetchContextFiles()
    toast({ title: "Atualizado", description: doc.is_context ? "Removido do contexto" : "Adicionado ao contexto" })
  } catch (error) {
    toast({ title: "Erro", description: "Falha ao atualizar contexto", variant: "destructive" })
  }
}
```

### 4.2 Atualizar Componente de Upload

Modificar `ImageUpload` ou criar novo componente para upload de contexto com flag `is_context=true`.

---

## Fase 5: Integração RAG no Chat

### 5.1 Buscar Contextos Automaticamente

**Arquivo:** `backend/routers/chat.py`

Modificar `generate_chat_completion_stream` para:
1. Quando `use_rag=True`, buscar automaticamente todos os `is_context=True` do projeto
2. Incluir conteúdo desses documentos no system prompt

```python
# Em generate_chat_completion_stream, após buscar documentos selecionados:
if request.use_rag and request.project_id:
    # Buscar TODOS os arquivos de contexto do projeto automaticamente
    context_docs = db.query(DBDocument).filter(
        DBDocument.project_id == request.project_id,
        DBDocument.is_context == True,
        DBDocument.deleted_at == None
    ).all()

    if context_docs:
        system_parts.append("\n📚 Arquivos de Contexto do Projeto:")
        for doc in context_docs:
            content_preview = doc.content[:3000] if doc.content else ""
            system_parts.append(f"""
- [{doc.title}] (ID: {doc.id})
{content_preview}
""")
```

### 5.2 Melhorar Query RAG

**Arquivo:** `backend/rag_service.py`

Atualizar `query_knowledge_base` para filtrar por `is_context=True`:

```python
def query_knowledge_base(query: str, project_id: str = None, k: int = 4):
    # Adicionar filtro para buscar apenas em documentos de contexto
    filter_dict = {}
    if project_id:
        filter_dict["project_id"] = project_id
    # Buscar em documentos marcados como contexto
    # (metadados devem incluir is_context)
```

---

## Fase 6: Processamento de Arquivos

### 6.1 Melhorar Processamento de PDFs

**Arquivo:** `backend/rag_service.py`

- Extrair texto completo de PDFs
- Gerar embeddings e armazenar em PGVector
- Salvar preview do conteúdo em `document.content`

### 6.2 Suporte a Arquivos de Texto

Garantir que `.txt` e `.md` sejam processados corretamente:
- Ler conteúdo completo
- Gerar embeddings
- Armazenar em PGVector

---

## Resumo de Arquivos a Modificar

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `backend/migrations/013_add_is_context_to_documents.sql` | **Novo** |
| `backend/models.py` | Adicionar campo |
| `backend/schemas.py` | Adicionar campo |
| `backend/routers/documents.py` | Novos endpoints |
| `backend/rag_service.py` | Melhorar processamento |
| `backend/routers/chat.py` | Integrar contextos |
| `supabase-schema.sql` | Adicionar campo |
| `frontend/src/types/supabase.ts` | Adicionar tipo |
| `frontend/src/lib/supabase/documents.ts` | Novos métodos |
| `frontend/src/hooks/use-context-files.ts` | **Novo** |
| `frontend/src/app/workspace/[id]/project/[projectId]/page.tsx` | Remover mock, usar hooks |

---

## Ordem de Implementação

1. ✅ Migração do banco (013_add_is_context...)
2. ✅ Atualizar models.py e schemas.py
3. ✅ Atualizar supabase-schema.sql
4. ✅ Atualizar types/supabase.ts
5. ✅ Criar endpoints backend (toggle-context, list-context)
6. ✅ Atualizar document service frontend
7. ✅ Criar hook use-context-files.ts
8. ✅ Atualizar página do projeto (remover mock)
9. ✅ Integrar no chat.py
10. ✅ Testar fluxo completo

---

## Resultado Esperado

Após implementação:
1. Usuário pode fazer upload de arquivos como "contexto"
2. Pode marcar/desmarcar criações como contexto (estrela)
3. Arquivos de contexto aparecem na aba "Arquivos de Contexto"
4. Chat usa automaticamente todos os contextos do projeto
5. RAG busca semanticamente nos documentos de contexto
6. Processamento de PDF/imagens gera embeddings para busca
