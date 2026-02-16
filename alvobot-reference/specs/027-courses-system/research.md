# Research: Sistema de Cursos e Aulas

**Feature**: 027-courses-system
**Date**: 2025-01-15

## 1. YouTube IFrame API - Tracking de Progresso

### Decision
Usar YouTube IFrame API com polling a cada 5 segundos para detectar quando usuário atinge 90% do vídeo.

### Rationale
- API oficial do YouTube, bem documentada e estável
- Permite acessar `getCurrentTime()` e `getDuration()` do player
- Funciona com vídeos não listados (unlisted)
- Não requer autenticação OAuth do YouTube

### Alternatives Considered
1. **postMessage events**: Menos confiável, não fornece tempo preciso
2. **YouTube Data API**: Requer OAuth, overhead desnecessário para apenas tracking
3. **Marcação apenas manual**: Decidido incluir automática para melhor UX

### Implementation Notes
```typescript
// Hook useYouTubeProgress.ts
const PROGRESS_THRESHOLD = 0.9; // 90%
const POLLING_INTERVAL = 5000; // 5 segundos

// Eventos importantes:
// - onReady: player carregado
// - onStateChange: PLAYING, PAUSED, ENDED
// - Polling durante PLAYING para verificar currentTime/duration
```

### Risks & Mitigations
- **Risco**: Usuário pode pular para 90% sem assistir
- **Mitigação**: Aceitável para MVP; futuramente pode implementar watch_time_seconds mínimo

---

## 2. Supabase Storage - Políticas de Acesso

### Decision
Criar bucket `courses` com políticas RLS baseadas em role de admin para upload e acesso público para leitura de thumbnails.

### Rationale
- Consistente com outras features do projeto
- Thumbnails precisam ser públicas para exibição no catálogo
- Materiais seguem mesma lógica das aulas (acesso condicional)

### Storage Structure
```
courses/
├── thumbnails/          # Públicas
│   └── {course_id}.{ext}
└── materials/           # Restritas
    └── {lesson_id}/
        └── {filename}
```

### Policies
```sql
-- Bucket: courses
-- Admins podem fazer upload de qualquer arquivo
CREATE POLICY "Admins can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'courses' AND
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
  );

-- Thumbnails são públicas (path começa com 'thumbnails/')
CREATE POLICY "Public thumbnails" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'courses' AND
    (storage.foldername(name))[1] = 'thumbnails'
  );

-- Materiais seguem RLS das aulas
CREATE POLICY "Materials access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'courses' AND
    (storage.foldername(name))[1] = 'materials' AND
    EXISTS (
      -- Verificação de acesso à aula correspondente
      SELECT 1 FROM lessons l
      JOIN course_modules cm ON cm.id = l.module_id
      JOIN courses c ON c.id = cm.course_id
      WHERE l.id::text = (storage.foldername(name))[2]
      AND (
        l.is_free_preview = TRUE OR
        c.visibility_type = 'public' OR
        (c.visibility_type = 'by_plan' AND EXISTS (...)) OR
        (c.visibility_type = 'by_user' AND auth.uid() = ANY(c.user_ids))
      )
    )
  );
```

---

## 3. Drag-and-Drop - Biblioteca

### Decision
Usar `@dnd-kit/core` e `@dnd-kit/sortable` para reordenação de módulos e aulas.

### Rationale
- Já utilizado em outras partes do projeto (flows, tasks)
- API declarativa e flexível
- Suporte a acessibilidade (keyboard navigation)
- Bundle size menor que alternativas

### Alternatives Considered
1. **react-beautiful-dnd**: Descontinuado pelo Atlassian
2. **react-dnd**: Mais baixo nível, requer mais código
3. **Solução custom**: Desnecessário quando existe biblioteca madura

### Implementation Pattern
```typescript
// Reordenação otimista
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  // Update local state immediately
  setItems(arrayMove(items, oldIndex, newIndex));

  // Persist to database
  await reorderMutation.mutateAsync({
    itemId: active.id,
    newIndex: newIndex
  });
};
```

---

## 4. Visibilidade Combinada (OR Logic)

### Decision
Campos `plan_ids` e `user_ids` sempre avaliados com OR quando ambos preenchidos. Não adicionar campo `visibility_logic`.

### Rationale
- Simplifica modelo de dados (sem campo adicional)
- Cobre caso de uso mais comum: "usuários do plano X OU usuários especiais"
- Lógica AND seria raramente usada e pode ser simulada com visibilidade por usuário

### RLS Implementation
```sql
-- Verificação combinada OR
(
  visibility_type = 'public' OR
  (
    -- Tem plano válido OU está na lista de usuários
    (plan_ids IS NOT NULL AND plan_ids != '{}' AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.user_id = auth.uid()
      AND t.status IN ('approved', 'completed')
      AND t.plan_id = ANY(plan_ids)
      AND (t.expiration_date IS NULL OR t.expiration_date > NOW())
    )) OR
    (user_ids IS NOT NULL AND auth.uid() = ANY(user_ids))
  )
)
```

---

## 5. YouTube URL Validation

### Decision
Validação apenas sintática via regex, sem verificar existência do vídeo.

### Rationale
- Verificar existência requer chamada externa (latência, pode falhar)
- Vídeos não listados podem não ser verificáveis via oEmbed
- YouTube embed já mostra "vídeo indisponível" se houver problema
- Admin pode ver preview da thumbnail como validação visual

### Regex Pattern
```typescript
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
};

// Thumbnail para preview (sempre disponível para vídeos válidos)
const getThumbnailUrl = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};
```

---

## 6. Progress Calculation

### Decision
Calcular progresso via SQL view com COUNT de aulas concluídas / total de aulas.

### Rationale
- Cálculo no banco é mais eficiente que no frontend
- View pode ser usada tanto para listagem quanto para detalhes
- Permite filtros e ordenação por progresso

### View Definition
```sql
CREATE OR REPLACE VIEW user_course_progress AS
SELECT
  c.id as course_id,
  c.title,
  c.slug,
  COUNT(DISTINCT l.id) as total_lessons,
  COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END) as completed_lessons,
  ROUND(
    COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT l.id), 0) * 100
  ) as progress_percentage,
  MAX(lp.last_watched_at) as last_activity,
  (
    SELECT l2.id FROM lessons l2
    JOIN course_modules cm2 ON cm2.id = l2.module_id
    JOIN lesson_progress lp2 ON lp2.lesson_id = l2.id AND lp2.user_id = auth.uid()
    WHERE cm2.course_id = c.id
    ORDER BY lp2.last_watched_at DESC
    LIMIT 1
  ) as last_watched_lesson_id
FROM courses c
JOIN course_modules cm ON cm.course_id = c.id
JOIN lessons l ON l.module_id = cm.id
LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = auth.uid()
WHERE c.status = 'published'
GROUP BY c.id;
```

---

## 7. Admin Permission Check

### Decision
Usar tabela `admins` existente para verificar permissões de gerenciamento de cursos.

### Rationale
- Reutiliza infraestrutura existente
- Consistente com outras áreas admin do projeto
- RLS policies já usam este padrão

### Check Pattern
```sql
EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
```

---

## Summary of Decisions

| Topic | Decision |
|-------|----------|
| YouTube Progress | IFrame API + polling 5s |
| Storage | Bucket `courses`, thumbnails públicas |
| Drag-and-Drop | @dnd-kit/core + sortable |
| Visibility Logic | OR entre plan_ids e user_ids |
| YouTube Validation | Regex only, no existence check |
| Progress Calculation | SQL view com aggregation |
| Admin Permissions | Tabela `admins` existente |
