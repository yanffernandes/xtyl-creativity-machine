# Quickstart: Melhoria do Sistema de Ferramentas do Assistente IA

**Feature**: 004-agent-tools-enhancement
**Date**: 2025-11-26

## Overview

Esta feature adiciona:
1. **Modo Autônomo** - Toggle para executar todas as ferramentas automaticamente
2. **Lista de Tarefas Visual** - Mostra plano de execução com progresso em tempo real
3. **Novas Ferramentas** - rename_document, rename_folder, get_folder_contents
4. **Limite de Iterações Expandido** - De 5 para 15 (configurável)

## Prerequisites

- PostgreSQL com migration 011 aplicada
- Backend FastAPI rodando
- Frontend Next.js conectado

## Quick Implementation Guide

### 1. Backend: Migration

```bash
# Aplicar migration
cd backend
alembic upgrade head
# ou executar SQL diretamente:
psql $DATABASE_URL -f migrations/011_add_user_preferences.sql
```

### 2. Backend: Model & Schema

```python
# models.py - adicionar
class UserPreferences(Base):
    __tablename__ = "user_preferences"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    autonomous_mode = Column(Boolean, default=False)
    max_iterations = Column(Integer, default=15)
    # ... outros campos

# schemas.py - adicionar
class UserPreferencesRead(BaseModel):
    autonomous_mode: bool = False
    max_iterations: int = 15
    # ...

class UserPreferencesUpdate(BaseModel):
    autonomous_mode: Optional[bool] = None
    max_iterations: Optional[int] = None
    # ...
```

### 3. Backend: Preferences Router

```python
# routers/preferences.py
@router.get("/preferences")
def get_preferences(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == current_user.id).first()
    if not prefs:
        return UserPreferencesRead()  # defaults
    return prefs

@router.put("/preferences")
def update_preferences(
    data: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # upsert logic
    ...
```

### 4. Backend: Chat Router Changes

```python
# chat.py - modificar completion_stream

# 1. Receber autonomous_mode no request
class ChatCompletionRequest(BaseModel):
    # ... existing fields
    autonomous_mode: bool = False

# 2. Aumentar limite
max_iterations = 15  # era 5

# 3. No loop de tools, checar autonomous_mode
if request.autonomous_mode:
    # Skip approval, execute directly
    yield f"data: {json.dumps({'type': 'tool_start', ...})}\n\n"
    result = execute_tool(...)
    yield f"data: {json.dumps({'type': 'tool_complete', ...})}\n\n"
else:
    # Existing approval flow
    ...
```

### 5. Backend: New Tools

```python
# tools.py - adicionar

def rename_document_tool(db: Session, document_id: str, new_title: str) -> Dict:
    doc = get_document(db, document_id)
    if not doc:
        return {"error": f"Document {document_id} not found"}
    doc.title = new_title
    db.commit()
    return {"id": doc.id, "title": doc.title, "message": "Document renamed"}

def rename_folder_tool(db: Session, folder_id: str, new_name: str) -> Dict:
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        return {"error": f"Folder {folder_id} not found"}
    folder.name = new_name
    db.commit()
    return {"id": folder.id, "name": folder.name, "message": "Folder renamed"}

def get_folder_contents_tool(db: Session, folder_id: str, include_subfolders: bool = True) -> Dict:
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        return {"error": f"Folder {folder_id} not found"}

    docs = db.query(Document).filter(Document.folder_id == folder_id).all()
    subfolders = db.query(Folder).filter(Folder.parent_folder_id == folder_id).all() if include_subfolders else []

    return {
        "folder_id": folder_id,
        "folder_name": folder.name,
        "documents": [{"id": d.id, "title": d.title} for d in docs],
        "subfolders": [{"id": f.id, "name": f.name} for f in subfolders]
    }

# Adicionar ao TOOL_DEFINITIONS e execute_tool()
```

### 6. Frontend: Preferences Hook

```typescript
// hooks/useUserPreferences.ts
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  useEffect(() => {
    fetchPreferences().then(setPreferences);
  }, []);

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    const updated = await api.put('/preferences', updates);
    setPreferences(updated);
  };

  return { preferences, updatePreferences };
}
```

### 7. Frontend: Toggle Update

```tsx
// ChatSidebar.tsx - modificar toggle
<div className="flex items-center justify-between px-1">
  <span className="text-xs font-medium text-muted-foreground">
    Modo Autônomo
  </span>
  <Switch
    checked={preferences?.autonomous_mode ?? false}
    onCheckedChange={(checked) => updatePreferences({ autonomous_mode: checked })}
    className="scale-75"
  />
</div>
```

### 8. Frontend: Task List Component

```tsx
// components/TaskListCard.tsx
export function TaskListCard({ tasks }: { tasks: Task[] }) {
  return (
    <div className="border rounded-lg p-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <ListTodo className="h-4 w-4" />
        <span className="text-sm font-medium">Tarefas Planejadas</span>
      </div>
      <div className="space-y-1">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-2 text-sm">
            {task.status === 'completed' && <Check className="h-3 w-3 text-green-500" />}
            {task.status === 'in_progress' && <Loader2 className="h-3 w-3 animate-spin" />}
            {task.status === 'pending' && <Circle className="h-3 w-3 text-muted" />}
            {task.status === 'failed' && <X className="h-3 w-3 text-red-500" />}
            <span className={task.status === 'completed' ? 'line-through text-muted-foreground' : ''}>
              {task.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing Checklist

- [ ] Toggle "Modo Autônomo" persiste entre sessões
- [ ] Em modo autônomo, ferramentas executam sem aprovação
- [ ] Lista de tarefas aparece para solicitações complexas
- [ ] Progresso atualiza em tempo real
- [ ] Limite de 15 iterações funciona
- [ ] Novas ferramentas (rename_document, rename_folder, get_folder_contents) funcionam
- [ ] Timeout de 60s padrão / 120s para imagens
- [ ] Retry automático funciona (1x)
- [ ] Desativar toggle no meio da execução pausa para próximas

## Troubleshooting

### Toggle não persiste
- Verificar se migration foi aplicada
- Verificar se endpoint /preferences está funcionando
- Checar console para erros de API

### Ferramentas ainda pedem aprovação em modo autônomo
- Verificar se `autonomous_mode` está sendo passado no request
- Checar logs do backend para valor recebido

### Lista de tarefas não aparece
- Verificar se LLM está gerando lista (check system prompt)
- Verificar eventos SSE `task_list` no network tab
