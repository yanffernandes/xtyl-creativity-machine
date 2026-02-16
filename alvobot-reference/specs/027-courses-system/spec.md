# Feature Specification: Sistema de Cursos e Aulas

**Feature Branch**: `027-courses-system`
**Created**: 2025-01-15
**Status**: Draft
**Input**: Sistema simplificado de cursos com módulos e aulas, com vídeos do YouTube, sistema administrativo completo para gerenciamento, e controle de acesso por visibilidade (público, por plano, ou por usuário específico)

## Clarifications

### Session 2025-01-15
- Q: Onde thumbnails dos cursos serão armazenadas? → A: Upload para Supabase Storage
- Q: Como validar URLs do YouTube? → A: Validar apenas formato (extrair video ID via regex), sem verificar se vídeo existe
- Q: Como marcar progresso das aulas? → A: Automático ao atingir 90% do vídeo + opção manual
- Q: Como funciona visibilidade combinada? → A: Sempre OR - acesso se plano OU se user_id na lista
- Q: Materiais complementares permitem upload? → A: Ambos (upload para Supabase Storage ou URL externa)

---

## Visão Geral

O **Sistema de Cursos** permite disponibilizar conteúdo educacional aos usuários da plataforma de forma organizada em cursos e módulos. O sistema inclui uma área administrativa completa para gerenciamento de todo o conteúdo e uma área do usuário para visualização das aulas disponíveis.

### Principais Funcionalidades

1. **Gestão de Cursos** - Criar, editar e organizar cursos com metadados completos
2. **Gestão de Módulos** - Organizar aulas em módulos dentro de cada curso
3. **Gestão de Aulas** - Criar aulas com vídeo do YouTube, descrição e materiais
4. **Controle de Acesso** - Definir visibilidade por público, plano ou usuários específicos
5. **Progresso do Usuário** - Rastrear conclusão de aulas e módulos
6. **Área do Aluno** - Interface para usuários assistirem às aulas

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar Novo Curso (Admin) (Priority: P1)

Como um administrador, quero criar novos cursos com título, descrição e thumbnail, para que eu possa organizar o conteúdo educacional da plataforma.

**Why this priority**: A criação de cursos é a base de todo o sistema. Sem cursos, não há como adicionar módulos ou aulas.

**Independent Test**: Pode ser testado acessando o painel admin, clicando em "Novo Curso", preenchendo os campos obrigatórios e verificando se o curso aparece na listagem.

**Acceptance Scenarios**:

1. **Given** um administrador autenticado no painel admin, **When** ele acessa a seção de cursos e clica em "Novo Curso", **Then** o sistema exibe um formulário com campos para título, descrição, thumbnail e configurações de visibilidade.

2. **Given** o formulário de novo curso preenchido, **When** o admin salva, **Then** o curso é criado com status "rascunho" e aparece na listagem de cursos.

3. **Given** um curso criado, **When** o admin edita os dados, **Then** as alterações são salvas e refletidas imediatamente.

4. **Given** um curso com módulos e aulas, **When** o admin tenta excluir, **Then** o sistema exibe confirmação alertando sobre a exclusão em cascata.

---

### User Story 2 - Gerenciar Módulos (Admin) (Priority: P1)

Como um administrador, quero criar e organizar módulos dentro de um curso, para estruturar o conteúdo de forma lógica e progressiva.

**Why this priority**: Módulos são a estrutura organizacional fundamental para agrupar aulas relacionadas.

**Independent Test**: Pode ser testado criando 3 módulos em um curso e verificando se é possível reordená-los via drag-and-drop.

**Acceptance Scenarios**:

1. **Given** um curso existente, **When** o admin clica em "Adicionar Módulo", **Then** um formulário é exibido para nome e descrição do módulo.

2. **Given** múltiplos módulos em um curso, **When** o admin arrasta um módulo, **Then** a ordem é atualizada e persistida no banco.

3. **Given** um módulo com aulas, **When** o admin edita o módulo, **Then** apenas os metadados do módulo são alterados, mantendo as aulas intactas.

4. **Given** um módulo vazio, **When** o admin tenta excluir, **Then** a exclusão é permitida sem confirmação adicional.

5. **Given** um módulo com aulas, **When** o admin tenta excluir, **Then** o sistema exibe confirmação alertando que as aulas também serão removidas.

---

### User Story 3 - Criar e Editar Aulas (Admin) (Priority: P1)

Como um administrador, quero criar aulas com vídeo do YouTube, descrição detalhada e materiais complementares, para entregar conteúdo educacional completo.

**Why this priority**: As aulas são o conteúdo principal que os usuários irão consumir.

**Independent Test**: Pode ser testado criando uma aula com URL do YouTube, descrição e verificando se o embed funciona corretamente.

**Acceptance Scenarios**:

1. **Given** um módulo existente, **When** o admin clica em "Adicionar Aula", **Then** um formulário é exibido com campos para título, URL do YouTube, descrição, duração estimada e ordem.

2. **Given** uma URL do YouTube válida (pública ou não listada), **When** o admin cola no campo, **Then** o sistema extrai o video ID e exibe preview do vídeo.

3. **Given** uma URL do YouTube inválida ou privada, **When** o admin tenta salvar, **Then** o sistema exibe erro indicando que a URL não é acessível.

4. **Given** uma aula criada, **When** o admin edita, **Then** pode alterar qualquer campo incluindo mover a aula para outro módulo.

5. **Given** múltiplas aulas em um módulo, **When** o admin arrasta uma aula, **Then** a ordem é atualizada dentro do módulo.

---

### User Story 4 - Mover Aulas Entre Módulos (Admin) (Priority: P2)

Como um administrador, quero mover aulas de um módulo para outro, para reorganizar o conteúdo conforme necessário.

**Why this priority**: Reorganização é comum durante a curadoria de conteúdo, mas não é crítica para o funcionamento básico.

**Independent Test**: Pode ser testado criando 2 módulos, adicionando aulas ao primeiro, e movendo uma aula para o segundo módulo.

**Acceptance Scenarios**:

1. **Given** uma aula em um módulo, **When** o admin clica em "Mover", **Then** uma lista de módulos do mesmo curso é exibida para seleção.

2. **Given** módulo de destino selecionado, **When** o admin confirma, **Then** a aula é movida e aparece no final do módulo de destino.

3. **Given** uma aula movida, **When** o admin visualiza o módulo original, **Then** a aula não aparece mais e a ordem das demais é reajustada.

---

### User Story 5 - Configurar Visibilidade do Curso (Admin) (Priority: P1)

Como um administrador, quero definir quem pode acessar cada curso (público, por plano, ou usuários específicos), para controlar o acesso ao conteúdo.

**Why this priority**: O controle de acesso é fundamental para monetização e segmentação de conteúdo.

**Independent Test**: Pode ser testado criando 3 cursos com visibilidades diferentes e verificando o acesso com diferentes perfis de usuário.

**Acceptance Scenarios**:

1. **Given** o formulário de curso, **When** o admin seleciona visibilidade "Público", **Then** todos os usuários autenticados podem ver o curso.

2. **Given** visibilidade "Por Plano" selecionada, **When** o admin escolhe planos específicos, **Then** apenas usuários com esses planos ativos veem o curso.

3. **Given** visibilidade "Usuários Específicos" selecionada, **When** o admin adiciona usuários por email, **Then** apenas esses usuários veem o curso.

4. **Given** um curso com visibilidade restrita, **When** um usuário sem permissão tenta acessar diretamente, **Then** o sistema exibe mensagem de acesso negado.

5. **Given** um curso com visibilidade por plano, **When** o plano do usuário expira, **Then** o acesso ao curso é automaticamente revogado.

---

### User Story 6 - Configurar Visibilidade de Módulos (Admin) (Priority: P2)

Como um administrador, quero definir visibilidade específica para módulos individuais, para ter controle granular sobre o conteúdo.

**Why this priority**: Permite oferecer módulos de demonstração públicos dentro de cursos pagos.

**Independent Test**: Pode ser testado criando um curso pago com o primeiro módulo público como "degustação".

**Acceptance Scenarios**:

1. **Given** um módulo dentro de um curso restrito, **When** o admin marca como "Público", **Then** esse módulo específico fica visível para todos.

2. **Given** um módulo com visibilidade própria, **When** o usuário acessa o curso, **Then** vê apenas os módulos permitidos para seu perfil.

3. **Given** visibilidade não definida no módulo, **When** verificada a permissão, **Then** herda a visibilidade do curso pai.

---

### User Story 7 - Visualizar Catálogo de Cursos (Usuário) (Priority: P1)

Como um usuário da plataforma, quero ver todos os cursos disponíveis para mim, para escolher o que desejo estudar.

**Why this priority**: É a porta de entrada do usuário para o conteúdo educacional.

**Independent Test**: Pode ser testado com um usuário logado verificando se apenas os cursos permitidos para seu perfil são exibidos.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** acessa a seção de cursos, **Then** vê uma lista de cursos disponíveis com thumbnail, título, descrição resumida e progresso.

2. **Given** cursos com diferentes visibilidades, **When** o usuário visualiza, **Then** vê apenas os cursos para os quais tem permissão.

3. **Given** um curso em andamento, **When** exibido na lista, **Then** mostra uma barra de progresso indicando % de conclusão.

4. **Given** a lista de cursos, **When** o usuário clica em um curso, **Then** é direcionado para a página do curso com módulos e aulas.

---

### User Story 8 - Assistir Aulas (Usuário) (Priority: P1)

Como um usuário, quero assistir às aulas com vídeo incorporado do YouTube e descrição, para aprender o conteúdo.

**Why this priority**: É a funcionalidade central de consumo de conteúdo.

**Independent Test**: Pode ser testado acessando uma aula e verificando se o player do YouTube funciona corretamente.

**Acceptance Scenarios**:

1. **Given** uma aula acessada, **When** o usuário visualiza, **Then** vê o player do YouTube, título, descrição e navegação para próxima/anterior.

2. **Given** um vídeo não listado do YouTube, **When** incorporado, **Then** o vídeo é reproduzido normalmente dentro da plataforma.

3. **Given** uma aula sendo assistida, **When** o usuário atinge 90% do vídeo, **Then** a aula é marcada como concluída automaticamente (ou pode marcar manualmente via botão).

4. **Given** a última aula de um módulo concluída, **When** verificado o progresso, **Then** o módulo é marcado como concluído automaticamente.

---

### User Story 9 - Acompanhar Progresso (Usuário) (Priority: P2)

Como um usuário, quero ver meu progresso em cada curso e módulo, para saber o que já estudei e o que falta.

**Why this priority**: Melhora a experiência mas não é crítico para o funcionamento básico.

**Independent Test**: Pode ser testado completando algumas aulas e verificando se os percentuais são calculados corretamente.

**Acceptance Scenarios**:

1. **Given** aulas marcadas como concluídas, **When** o usuário vê a lista de módulos, **Then** cada módulo mostra X de Y aulas concluídas.

2. **Given** progresso em múltiplos módulos, **When** o usuário vê o curso, **Then** a barra de progresso geral reflete o total de aulas concluídas.

3. **Given** uma aula já concluída, **When** o usuário acessa novamente, **Then** a aula aparece marcada como concluída com opção de desmarcar.

---

### User Story 10 - Publicar/Despublicar Curso (Admin) (Priority: P1)

Como um administrador, quero controlar quando um curso fica disponível (publicado) ou oculto (rascunho), para gerenciar lançamentos.

**Why this priority**: Permite preparar conteúdo antes de disponibilizar aos usuários.

**Independent Test**: Pode ser testado criando um curso, verificando que não aparece para usuários, publicando e verificando que aparece.

**Acceptance Scenarios**:

1. **Given** um curso em rascunho, **When** o admin clica em "Publicar", **Then** o curso fica visível para usuários conforme regras de visibilidade.

2. **Given** um curso publicado, **When** o admin clica em "Despublicar", **Then** o curso some da listagem de usuários mas mantém dados intactos.

3. **Given** um curso despublicado com progresso de usuários, **When** verificado, **Then** o progresso é mantido para quando o curso voltar.

---

### Edge Cases

- **O que acontece quando um vídeo do YouTube é removido?** O sistema exibe mensagem de "Vídeo indisponível" na aula, admin recebe notificação para atualizar.
- **Como tratar usuários que perdem acesso a um curso em andamento?** O progresso é mantido, mas o acesso é bloqueado até que a condição de visibilidade seja satisfeita novamente.
- **O que acontece se um módulo é excluído com progresso de usuários?** O progresso das aulas desse módulo é removido, o progresso geral do curso é recalculado.
- **Como lidar com cursos sem módulos/aulas?** Cursos vazios não podem ser publicados; o sistema valida antes de permitir publicação.
- **O que acontece se o plano associado à visibilidade é excluído?** O curso herda visibilidade "nenhum acesso" até que admin reconfigure.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Gestão de Cursos (Admin)
- **FR-001**: Sistema DEVE permitir criar cursos com título, descrição, thumbnail e visibilidade
- **FR-002**: Sistema DEVE permitir editar todos os campos de um curso existente
- **FR-003**: Sistema DEVE permitir excluir cursos (com confirmação se houver conteúdo)
- **FR-004**: Sistema DEVE permitir publicar/despublicar cursos
- **FR-005**: Sistema DEVE listar todos os cursos com filtros por status e visibilidade
- **FR-006**: Sistema DEVE exibir estatísticas do curso (módulos, aulas, alunos, conclusões)

#### Gestão de Módulos (Admin)
- **FR-007**: Sistema DEVE permitir criar módulos dentro de um curso
- **FR-008**: Sistema DEVE permitir editar nome e descrição de módulos
- **FR-009**: Sistema DEVE permitir reordenar módulos via drag-and-drop
- **FR-010**: Sistema DEVE permitir excluir módulos (com confirmação se houver aulas)
- **FR-011**: Sistema DEVE permitir definir visibilidade específica por módulo (opcional, herda do curso)

#### Gestão de Aulas (Admin)
- **FR-012**: Sistema DEVE permitir criar aulas com título, URL do YouTube, descrição e duração
- **FR-013**: Sistema DEVE validar formato da URL do YouTube e extrair video ID via regex (sem verificar existência do vídeo)
- **FR-014**: Sistema DEVE exibir preview do vídeo ao colar URL válida (usando thumbnail do YouTube)
- **FR-015**: Sistema DEVE permitir editar todos os campos de uma aula
- **FR-016**: Sistema DEVE permitir reordenar aulas dentro de um módulo
- **FR-017**: Sistema DEVE permitir mover aulas entre módulos do mesmo curso
- **FR-018**: Sistema DEVE permitir excluir aulas (com confirmação)
- **FR-019**: Sistema DEVE permitir adicionar materiais complementares (upload para Supabase Storage ou URL externa)

#### Controle de Acesso
- **FR-020**: Sistema DEVE suportar visibilidade "Público" (todos usuários autenticados)
- **FR-021**: Sistema DEVE suportar visibilidade "Por Plano" (lista de plan_ids)
- **FR-022**: Sistema DEVE suportar visibilidade "Usuários Específicos" (lista de user_ids)
- **FR-023**: Sistema DEVE verificar permissão de acesso em tempo real (considerar expiração de plano)
- **FR-024**: Sistema DEVE combinar visibilidades usando lógica OR (acesso se plano válido OU user_id na lista)

#### Área do Usuário
- **FR-025**: Sistema DEVE listar cursos disponíveis para o usuário logado
- **FR-026**: Sistema DEVE exibir progresso geral em cada curso na listagem
- **FR-027**: Sistema DEVE exibir página do curso com módulos e aulas
- **FR-028**: Sistema DEVE exibir player de vídeo do YouTube incorporado na página da aula
- **FR-029**: Sistema DEVE marcar aulas como concluídas automaticamente ao atingir 90% do vídeo (via YouTube IFrame API) + botão manual
- **FR-030**: Sistema DEVE calcular progresso por módulo e por curso automaticamente
- **FR-031**: Sistema DEVE permitir navegação sequencial entre aulas (anterior/próxima)
- **FR-032**: Sistema DEVE lembrar última aula assistida e oferecer "continuar de onde parou"

### Key Entities

- **Course**: Curso com título, descrição, thumbnail (upload Supabase Storage), status (draft/published), visibilidade
- **CourseModule**: Módulo pertencente a um curso, com nome, descrição, ordem
- **Lesson**: Aula pertencente a um módulo, com título, youtube_url, descrição, duração, ordem
- **LessonProgress**: Registro de progresso do usuário em uma aula (completed_at)
- **CourseAccess**: Regras de acesso do curso (visibility_type, plan_ids, user_ids)
- **LessonMaterial**: Materiais complementares da aula (tipo, url ou upload Supabase Storage, nome)

---

## Data Model

### Tabelas Principais

```sql
-- Cursos
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  visibility_type VARCHAR(20) DEFAULT 'public' CHECK (visibility_type IN ('public', 'by_plan', 'by_user', 'private')),
  plan_ids INTEGER[] DEFAULT '{}',  -- IDs dos planos com acesso (quando visibility_type = 'by_plan')
  user_ids UUID[] DEFAULT '{}',     -- IDs dos usuários com acesso (quando visibility_type = 'by_user')
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Módulos
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  -- Visibilidade opcional (herda do curso se NULL)
  visibility_override VARCHAR(20) CHECK (visibility_override IN ('public', 'by_plan', 'by_user', NULL)),
  plan_ids_override INTEGER[],
  user_ids_override UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aulas
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  youtube_video_id VARCHAR(20),  -- Extraído automaticamente da URL
  duration_minutes INTEGER,       -- Duração estimada em minutos
  order_index INTEGER DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT FALSE,  -- Permite preview mesmo sem acesso ao curso
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Materiais complementares
CREATE TABLE lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('link', 'file', 'document')),
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progresso do usuário
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  watch_time_seconds INTEGER DEFAULT 0,  -- Tempo assistido (opcional, para analytics)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Índices para performance
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_visibility ON courses(visibility_type);
CREATE INDEX idx_course_modules_course ON course_modules(course_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
```

### Row Level Security (RLS)

```sql
-- Habilitar RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

-- Cursos: Admins podem tudo, usuários veem apenas publicados com acesso
CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can view accessible courses" ON courses
  FOR SELECT USING (
    status = 'published' AND (
      visibility_type = 'public' OR
      (visibility_type = 'by_plan' AND EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.user_id = auth.uid()
        AND t.status IN ('approved', 'completed')
        AND t.plan_id = ANY(courses.plan_ids)
        AND (t.expiration_date IS NULL OR t.expiration_date > NOW())
      )) OR
      (visibility_type = 'by_user' AND auth.uid() = ANY(user_ids))
    )
  );

-- Módulos: Admins podem tudo, usuários veem baseado no curso pai
CREATE POLICY "Admins can manage modules" ON course_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can view accessible modules" ON course_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_modules.course_id
      AND c.status = 'published'
      AND (
        c.visibility_type = 'public' OR
        (c.visibility_type = 'by_plan' AND EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.user_id = auth.uid()
          AND t.status IN ('approved', 'completed')
          AND t.plan_id = ANY(c.plan_ids)
          AND (t.expiration_date IS NULL OR t.expiration_date > NOW())
        )) OR
        (c.visibility_type = 'by_user' AND auth.uid() = ANY(c.user_ids))
      )
    )
  );

-- Aulas: Similar aos módulos
CREATE POLICY "Admins can manage lessons" ON lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can view accessible lessons" ON lessons
  FOR SELECT USING (
    is_free_preview = TRUE OR
    EXISTS (
      SELECT 1 FROM course_modules cm
      JOIN courses c ON c.id = cm.course_id
      WHERE cm.id = lessons.module_id
      AND c.status = 'published'
      AND (
        c.visibility_type = 'public' OR
        (c.visibility_type = 'by_plan' AND EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.user_id = auth.uid()
          AND t.status IN ('approved', 'completed')
          AND t.plan_id = ANY(c.plan_ids)
          AND (t.expiration_date IS NULL OR t.expiration_date > NOW())
        )) OR
        (c.visibility_type = 'by_user' AND auth.uid() = ANY(c.user_ids))
      )
    )
  );

-- Materiais: Segue a mesma lógica das aulas
CREATE POLICY "Admins can manage materials" ON lesson_materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can view accessible materials" ON lesson_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN course_modules cm ON cm.id = l.module_id
      JOIN courses c ON c.id = cm.course_id
      WHERE l.id = lesson_materials.lesson_id
      AND c.status = 'published'
      AND (
        l.is_free_preview = TRUE OR
        c.visibility_type = 'public' OR
        (c.visibility_type = 'by_plan' AND EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.user_id = auth.uid()
          AND t.status IN ('approved', 'completed')
          AND t.plan_id = ANY(c.plan_ids)
          AND (t.expiration_date IS NULL OR t.expiration_date > NOW())
        )) OR
        (c.visibility_type = 'by_user' AND auth.uid() = ANY(c.user_ids))
      )
    )
  );

-- Progresso: Usuário gerencia apenas seu próprio progresso
CREATE POLICY "Users manage own progress" ON lesson_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all progress" ON lesson_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
  );
```

### Views Úteis

```sql
-- View de curso com estatísticas
CREATE OR REPLACE VIEW courses_with_stats AS
SELECT
  c.*,
  COUNT(DISTINCT cm.id) as modules_count,
  COUNT(DISTINCT l.id) as lessons_count,
  COALESCE(SUM(l.duration_minutes), 0) as total_duration_minutes,
  COUNT(DISTINCT lp.user_id) as enrolled_users_count
FROM courses c
LEFT JOIN course_modules cm ON cm.course_id = c.id
LEFT JOIN lessons l ON l.module_id = cm.id
LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id
GROUP BY c.id;

-- View de progresso do usuário por curso
CREATE OR REPLACE VIEW user_course_progress AS
SELECT
  c.id as course_id,
  auth.uid() as user_id,
  COUNT(DISTINCT l.id) as total_lessons,
  COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END) as completed_lessons,
  ROUND(
    COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT l.id), 0) * 100,
    2
  ) as progress_percentage,
  MAX(lp.last_watched_at) as last_activity
FROM courses c
JOIN course_modules cm ON cm.course_id = c.id
JOIN lessons l ON l.module_id = cm.id
LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = auth.uid()
GROUP BY c.id;
```

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administradores conseguem criar um curso completo (com módulos e aulas) em menos de 15 minutos
- **SC-002**: Taxa de erro ao validar URLs do YouTube menor que 1%
- **SC-003**: Usuários conseguem encontrar e iniciar um curso em menos de 3 cliques
- **SC-004**: 90% dos usuários conseguem marcar aulas como concluídas sem dificuldade
- **SC-005**: O cálculo de progresso é preciso e reflete corretamente as aulas concluídas
- **SC-006**: Controle de acesso impede 100% das tentativas de acesso não autorizado
- **SC-007**: Carregamento da lista de cursos em menos de 2 segundos
- **SC-008**: Player de vídeo do YouTube carrega corretamente em 99% das vezes

---

## Assumptions

- O sistema de planos (tabela `plans` e `transactions`) já está implementado e funcional
- O sistema de administração já existe com tabela `admins` para verificar permissões
- O Supabase Auth já está configurado para autenticação de usuários
- Os vídeos do YouTube serão públicos ou não listados (não privados)
- O design system do projeto será reutilizado para consistência visual
- O frontend segue o padrão de features com api/, components/, pages/, types/

---

## UI/UX Guidelines

### Admin - Lista de Cursos
- Tabela com colunas: Thumbnail, Título, Status, Visibilidade, Módulos, Aulas, Alunos
- Filtros por status (Todos, Rascunho, Publicado) e visibilidade
- Ações rápidas: Editar, Publicar/Despublicar, Excluir
- Botão "Novo Curso" proeminente

### Admin - Editor de Curso
- Sidebar com lista de módulos (drag-and-drop para reordenar)
- Área principal com detalhes do módulo selecionado e suas aulas
- Formulário modal para criar/editar aula
- Preview do vídeo ao colar URL do YouTube
- Configurações de visibilidade em seção dedicada

### Usuário - Catálogo de Cursos
- Grid de cards com thumbnail, título, descrição resumida, progresso
- Filtro simples (Em andamento, Concluídos, Todos)
- Indicador visual de progresso em cada card

### Usuário - Página do Curso
- Header com thumbnail, título, descrição, progresso geral
- Lista de módulos em accordion com aulas dentro
- Indicador de aulas concluídas por módulo
- Botão "Continuar" que leva para última aula assistida

### Usuário - Página da Aula
- Player do YouTube responsivo (16:9)
- Título e descrição abaixo do player
- Botão "Marcar como Concluída"
- Navegação lateral com lista de aulas do módulo
- Botões "Anterior" e "Próxima" para navegação sequencial
- Seção de materiais complementares (se houver)

---

## Referências Técnicas

### YouTube URL Parsing

O sistema deve aceitar múltiplos formatos de URL do YouTube:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`

Regex sugerida para extração:
```typescript
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};
```

### YouTube IFrame API (Para Tracking de Progresso)

O sistema usa a YouTube IFrame API para detectar quando o usuário atinge 90% do vídeo:

```typescript
// Carregar API
const tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';

// Criar player com eventos
const player = new YT.Player('player', {
  videoId: 'VIDEO_ID',
  events: {
    onStateChange: (event) => {
      if (event.data === YT.PlayerState.PLAYING) {
        // Iniciar tracking de tempo
      }
    }
  }
});

// Verificar progresso periodicamente
const checkProgress = () => {
  const currentTime = player.getCurrentTime();
  const duration = player.getDuration();
  if (currentTime / duration >= 0.9) {
    // Marcar como concluída
  }
};
```

### YouTube Embed (Fallback)

```html
<iframe
  src="https://www.youtube.com/embed/{VIDEO_ID}?rel=0&modestbranding=1&enablejsapi=1"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>
```

### Supabase Storage (Thumbnails e Materiais)

Bucket: `courses` (ou `course-assets`)

Estrutura sugerida:
```
courses/
  thumbnails/
    {course_id}.jpg
  materials/
    {lesson_id}/
      {filename}
```

Políticas de Storage:
- Admins: upload/delete em qualquer arquivo
- Usuários: apenas leitura de arquivos de cursos que têm acesso

---

## Rotas Sugeridas

### Admin
- `/admin/courses` - Lista de cursos
- `/admin/courses/new` - Criar novo curso
- `/admin/courses/:id` - Editar curso (módulos e aulas)

### Usuário
- `/courses` - Catálogo de cursos (ou `/academy`)
- `/courses/:slug` - Página do curso
- `/courses/:slug/:lessonId` - Página da aula

---

## Fora do Escopo (V1)

- Certificados de conclusão
- Quizzes/Avaliações
- Comentários em aulas
- Sistema de notas/avaliações de cursos
- Upload direto de vídeos (apenas YouTube)
- Streaming adaptativo próprio
- Gamificação (badges, pontos)
- Fórum de discussão
