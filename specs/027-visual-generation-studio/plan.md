# Plano de Implementação: Visual Generation Studio

## Visão Geral

Este plano organiza a implementação em **4 fases** com entregáveis claros. Cada fase pode ser validada independentemente.

---

## Fase 1: Backend - Fundação e Performance

**Objetivo**: Criar endpoints otimizados e estrutura de dados para o studio.

### Task 1.1: Endpoint Bootstrap Agregado
**Arquivo**: `backend/routers/projects.py`

Criar endpoint que retorna tudo necessário em 1 request:

```python
@router.get("/{project_id}/bootstrap")
async def get_project_bootstrap(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna todos os dados necessários para carregar o projeto.
    Substitui 8+ requests por 1.
    """
    return {
        "project": get_project(db, project_id, current_user.id),
        "settings": get_project_settings(db, project_id),
        "models": {
            "text": get_text_models(),
            "image": get_image_models()
        },
        "visual_context": get_visual_context(db, project_id, limit=5),
        "memories": get_project_memories(db, project_id, current_user.id, limit=10),
        "recent_documents": get_recent_documents(db, project_id, limit=10),
        "style_presets": get_style_presets(db)
    }
```

### Task 1.2: Tabela e Endpoint de Style Presets
**Arquivos**:
- `backend/migrations/027_style_presets.sql`
- `backend/routers/image_generation.py`

```sql
CREATE TABLE style_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_pt VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    prompt_modifier TEXT NOT NULL,
    thumbnail_url TEXT,
    category VARCHAR(50) DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Presets iniciais
INSERT INTO style_presets (name, name_pt, slug, prompt_modifier, category, sort_order) VALUES
('Photographic', 'Fotográfico', 'photographic', 'professional photography, high resolution, natural lighting, sharp focus, realistic', 'realistic', 1),
('Watercolor', 'Aquarela', 'watercolor', 'watercolor painting style, soft brushstrokes, flowing colors, artistic, hand-painted aesthetic', 'artistic', 2),
('3D Render', 'Render 3D', '3d-render', '3D render, octane render, volumetric lighting, highly detailed, CGI, digital art', 'digital', 3),
('Illustration', 'Ilustração', 'illustration', 'digital illustration, vector art style, clean lines, vibrant colors, graphic design', 'artistic', 4),
('Minimalist', 'Minimalista', 'minimalist', 'minimalist design, clean composition, negative space, simple elements, elegant, modern', 'design', 5),
('Vibrant', 'Vibrante', 'vibrant', 'vibrant colors, high saturation, bold, dynamic, energetic, eye-catching', 'style', 6),
('Vintage', 'Vintage', 'vintage', 'vintage aesthetic, retro style, film grain, muted colors, nostalgic, 70s/80s inspired', 'style', 7),
('Cinematic', 'Cinematográfico', 'cinematic', 'cinematic lighting, movie scene, dramatic, widescreen composition, film quality, professional color grading', 'realistic', 8);
```

### Task 1.3: Endpoint Generate Batch
**Arquivo**: `backend/routers/image_generation.py`

```python
@router.post("/generate-batch")
async def generate_image_batch(
    request: ImageBatchRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Gera múltiplas variações em paralelo.
    Retorna imediatamente com batch_id, resultados via SSE.
    """
    batch_id = str(uuid.uuid4())

    # Inicia geração em background
    background_tasks.add_task(
        generate_variations_async,
        batch_id=batch_id,
        prompt=request.prompt,
        style_preset=request.style_preset,
        aspect_ratio=request.aspect_ratio,
        model=request.model,
        creativity=request.creativity,
        count=request.count,
        user_id=current_user.id,
        project_id=request.project_id
    )

    return {"batch_id": batch_id, "status": "processing"}

@router.get("/batch/{batch_id}/stream")
async def stream_batch_progress(batch_id: str):
    """SSE stream para acompanhar progresso do batch."""
    # Similar ao workflow execution stream
```

### Task 1.4: Model para Style Preset
**Arquivo**: `backend/models.py`

```python
class StylePreset(Base):
    __tablename__ = "style_presets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    name_pt = Column(String(100), nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    prompt_modifier = Column(Text, nullable=False)
    thumbnail_url = Column(Text)
    category = Column(String(50), default="general")
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## Fase 2: Frontend - Estrutura de Abas e Componentes Base

**Objetivo**: Reorganizar a interface do projeto em abas e criar componentes do studio.

### Task 2.1: Criar Hook useProjectBootstrap
**Arquivo**: `frontend/src/hooks/useProjectBootstrap.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface BootstrapData {
  project: Project;
  settings: ProjectSettings;
  models: {
    text: Model[];
    image: Model[];
  };
  visual_context: VisualAsset[];
  memories: Memory[];
  recent_documents: Document[];
  style_presets: StylePreset[];
}

export function useProjectBootstrap(projectId: string) {
  return useQuery({
    queryKey: ['project-bootstrap', projectId],
    queryFn: async () => {
      const response = await api.get<BootstrapData>(`/projects/${projectId}/bootstrap`);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!projectId,
  });
}
```

### Task 2.2: Criar Estrutura de Abas
**Arquivo**: `frontend/src/app/workspace/[id]/project/[projectId]/page.tsx`

Refatorar para usar sistema de abas:

```typescript
type TabType = 'chat' | 'images' | 'documents' | 'assets';

const [activeTab, setActiveTab] = useState<TabType>('chat');

return (
  <div>
    <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

    {activeTab === 'chat' && <ChatTab {...props} />}
    {activeTab === 'images' && <ImageStudioTab {...props} />}
    {activeTab === 'documents' && <DocumentsTab {...props} />}
    {activeTab === 'assets' && <AssetsTab {...props} />}
  </div>
);
```

### Task 2.3: Criar Componente TabNavigation
**Arquivo**: `frontend/src/components/project/TabNavigation.tsx`

```typescript
const tabs = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'images', label: 'Imagens', icon: Image },
  { id: 'documents', label: 'Documentos', icon: FileText },
  { id: 'assets', label: 'Assets', icon: Palette },
];
```

### Task 2.4: Extrair ChatSidebar para ChatTab
**Arquivo**: `frontend/src/components/project/tabs/ChatTab.tsx`

Mover lógica do chat para componente isolado, mantendo toda funcionalidade existente.

### Task 2.5: Criar ImageStudio Container
**Arquivo**: `frontend/src/components/image-studio/ImageStudio.tsx`

Container principal que orquestra todos os sub-componentes.

---

## Fase 3: Frontend - Componentes do Image Studio

**Objetivo**: Implementar todos os controles visuais e grid de resultados.

### Task 3.1: PromptInput
**Arquivo**: `frontend/src/components/image-studio/PromptInput.tsx`

```typescript
interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

// Textarea expansível com sugestões de autocomplete
// Atalho: Enter para gerar, Shift+Enter para nova linha
```

### Task 3.2: StylePresetGrid
**Arquivo**: `frontend/src/components/image-studio/StylePresetGrid.tsx`

```typescript
interface StylePresetGridProps {
  presets: StylePreset[];
  selected: string | null;
  onSelect: (presetSlug: string) => void;
}

// Grid 4x2 de cards com:
// - Thumbnail do estilo
// - Nome
// - Borda azul quando selecionado
// - Hover effect
```

### Task 3.3: FormatSelector
**Arquivo**: `frontend/src/components/image-studio/FormatSelector.tsx`

```typescript
const formats = [
  { id: '1:1', label: 'Quadrado', width: 1024, height: 1024 },
  { id: '16:9', label: 'Wide', width: 1792, height: 1024 },
  { id: '9:16', label: 'Story', width: 1024, height: 1792 },
  { id: '4:3', label: 'Post', width: 1365, height: 1024 },
];

// Toggle buttons com ícones representando o formato
```

### Task 3.4: CreativitySlider
**Arquivo**: `frontend/src/components/image-studio/CreativitySlider.tsx`

```typescript
interface CreativitySliderProps {
  value: number; // 0-100
  onChange: (value: number) => void;
}

// Slider com Radix UI
// Label mostrando porcentagem
// Tooltip explicando o que faz
```

### Task 3.5: VariationGrid
**Arquivo**: `frontend/src/components/image-studio/VariationGrid.tsx`

```typescript
interface VariationGridProps {
  variations: GeneratedImage[];
  isLoading: boolean;
  onRefine: (image: GeneratedImage) => void;
  onDownload: (image: GeneratedImage) => void;
  onSave: (image: GeneratedImage) => void;
}

// Grid 2x2
// Skeleton durante loading
// Imagens aparecem conforme ficam prontas (SSE)
```

### Task 3.6: VariationCard
**Arquivo**: `frontend/src/components/image-studio/VariationCard.tsx`

```typescript
// Card individual com:
// - Imagem
// - Overlay com ações no hover
// - Badge de número (1, 2, 3, 4)
// - Loading state individual
// - Clique para expandir
```

### Task 3.7: Hook useImageStudio
**Arquivo**: `frontend/src/hooks/useImageStudio.ts`

```typescript
interface ImageStudioState {
  prompt: string;
  stylePreset: string | null;
  format: string;
  model: string;
  creativity: number;
  variations: GeneratedImage[];
  isGenerating: boolean;
  error: string | null;
}

interface ImageStudioActions {
  setPrompt: (prompt: string) => void;
  setStylePreset: (preset: string) => void;
  setFormat: (format: string) => void;
  setModel: (model: string) => void;
  setCreativity: (value: number) => void;
  generate: () => Promise<void>;
  refine: (image: GeneratedImage) => void;
  save: (image: GeneratedImage, folderId?: string) => Promise<void>;
  reset: () => void;
}

export function useImageStudio(projectId: string): [ImageStudioState, ImageStudioActions]
```

---

## Fase 4: Onboarding e Polish

**Objetivo**: Tour guiado para novos usuários e refinamentos de UX.

### Task 4.1: Hook useOnboarding
**Arquivo**: `frontend/src/hooks/useOnboarding.ts`

```typescript
const ONBOARDING_STEPS = [
  {
    target: '[data-tour="prompt-input"]',
    title: 'Descreva sua imagem',
    content: 'Digite o que você quer criar. Seja específico!',
  },
  {
    target: '[data-tour="style-presets"]',
    title: 'Escolha um estilo',
    content: 'Selecione um estilo visual para sua imagem.',
  },
  {
    target: '[data-tour="generate-button"]',
    title: 'Gere variações',
    content: 'Clique para gerar 4 opções diferentes.',
  },
  {
    target: '[data-tour="variation-actions"]',
    title: 'Escolha e refine',
    content: 'Salve a melhor ou refine para ajustar.',
  },
  {
    target: '[data-tour="chat-tab"]',
    title: 'Use o Chat para mais',
    content: 'Para criações mais complexas, converse com a IA.',
  },
];

export function useOnboarding() {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // Verificar localStorage
  // Controlar navegação entre passos
  // Marcar como completo
}
```

### Task 4.2: Componente TourOverlay
**Arquivo**: `frontend/src/components/onboarding/TourOverlay.tsx`

```typescript
// Overlay escuro com spotlight no elemento alvo
// Tooltip com título, conteúdo, botões
// Animação suave entre passos
// Botão "Pular" sempre visível
```

### Task 4.3: GenerationHistory
**Arquivo**: `frontend/src/components/image-studio/GenerationHistory.tsx`

```typescript
// Lista lateral colapsável
// Mostra últimas 10 gerações da sessão
// Clique para restaurar configurações
// Permite voltar a resultado anterior
```

### Task 4.4: ReferenceAssetPicker
**Arquivo**: `frontend/src/components/image-studio/ReferenceAssetPicker.tsx`

```typescript
// Modal para selecionar asset de referência
// Integra com visual_context existente
// Preview da imagem selecionada
// Adiciona à geração como referência
```

### Task 4.5: Skeleton States
Adicionar skeletons em:
- StylePresetGrid (durante load inicial)
- VariationGrid (durante geração)
- Todo o ImageStudio (durante bootstrap)

### Task 4.6: Testes de Performance
- Medir tempo de carregamento antes/depois
- Verificar se bootstrap está <500ms
- Otimizar se necessário

---

## Checklist de Entrega

### Fase 1 (Backend)
- [ ] Endpoint `/projects/{id}/bootstrap` funcionando
- [ ] Endpoint `/image-generation/style-presets` funcionando
- [ ] Endpoint `/image-generation/generate-batch` funcionando
- [ ] Migration executada com presets populados
- [ ] Testes manuais via curl/Postman

### Fase 2 (Estrutura)
- [ ] Sistema de abas funcionando
- [ ] ChatTab isolado e funcional
- [ ] ImageStudio renderizando
- [ ] useProjectBootstrap reduzindo requests
- [ ] Navegação entre abas fluida

### Fase 3 (Componentes)
- [ ] Todos os controles visuais funcionando
- [ ] Geração de 4 variações simultâneas
- [ ] SSE mostrando progresso
- [ ] Ações de refine/download/save funcionando
- [ ] Hook useImageStudio completo

### Fase 4 (Polish)
- [ ] Onboarding aparece na primeira visita
- [ ] Tour pode ser pulado
- [ ] Não reaparece após conclusão
- [ ] Histórico de geração funcional
- [ ] Tempo de carregamento <1s

---

## Estimativa de Esforço

| Fase | Complexidade | Arquivos |
|------|--------------|----------|
| Fase 1 | Média | ~6 arquivos |
| Fase 2 | Média | ~8 arquivos |
| Fase 3 | Alta | ~10 arquivos |
| Fase 4 | Média | ~5 arquivos |

**Total**: ~29 arquivos novos/modificados

---

## Ordem de Execução Recomendada

1. **Task 1.1** - Bootstrap (maior impacto em performance)
2. **Task 1.2** - Style Presets (necessário para UI)
3. **Task 2.1** - useProjectBootstrap hook
4. **Task 2.2 + 2.3** - Sistema de abas
5. **Task 2.4** - Extrair ChatTab
6. **Task 2.5 + 3.1-3.6** - ImageStudio completo
7. **Task 1.3** - Generate Batch
8. **Task 3.7** - useImageStudio hook
9. **Task 4.1-4.4** - Onboarding e polish
10. **Task 4.5-4.6** - Refinamentos finais
