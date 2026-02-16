# Data Model: Sistema de Cursos e Aulas

**Feature**: 027-courses-system
**Date**: 2025-01-15

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   courses   │1─────*│ course_modules  │1─────*│   lessons   │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)         │       │ id (PK)     │
│ title       │       │ course_id (FK)  │       │ module_id   │
│ slug        │       │ title           │       │ title       │
│ description │       │ description     │       │ description │
│ thumbnail   │       │ order_index     │       │ youtube_url │
│ status      │       │ visibility_*    │       │ video_id    │
│ visibility  │       │ created_at      │       │ duration    │
│ plan_ids[]  │       │ updated_at      │       │ order_index │
│ user_ids[]  │       └─────────────────┘       │ is_preview  │
│ order_index │                                 │ created_at  │
│ created_by  │                                 │ updated_at  │
│ created_at  │                                 └──────┬──────┘
│ updated_at  │                                        │
└─────────────┘                                        │1
                                                       │
┌──────────────────┐                          ┌───────┴────────┐
│ lesson_materials │*────────────────────────1│ lesson_progress│
├──────────────────┤                          ├────────────────┤
│ id (PK)          │                          │ id (PK)        │
│ lesson_id (FK)   │                          │ user_id (FK)   │
│ title            │                          │ lesson_id (FK) │
│ type             │                          │ completed_at   │
│ url              │                          │ last_watched   │
│ order_index      │                          │ watch_time     │
│ created_at       │                          │ created_at     │
└──────────────────┘                          │ updated_at     │
                                              └────────────────┘

External References:
- courses.created_by → auth.users.id
- courses.plan_ids[] → plans.id
- courses.user_ids[] → auth.users.id
- lesson_progress.user_id → auth.users.id
```

## Tables

### 1. courses

Armazena os cursos da plataforma.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| title | VARCHAR(255) | NOT NULL | Título do curso |
| slug | VARCHAR(255) | UNIQUE, NOT NULL | URL-friendly identifier |
| description | TEXT | | Descrição detalhada |
| thumbnail_url | TEXT | | URL da thumbnail (Supabase Storage) |
| status | VARCHAR(20) | DEFAULT 'draft', CHECK (draft, published) | Status de publicação |
| visibility_type | VARCHAR(20) | DEFAULT 'public', CHECK (public, by_plan, by_user, private) | Tipo de visibilidade |
| plan_ids | INTEGER[] | DEFAULT '{}' | IDs dos planos com acesso |
| user_ids | UUID[] | DEFAULT '{}' | IDs dos usuários com acesso |
| order_index | INTEGER | DEFAULT 0 | Ordem de exibição |
| created_by | UUID | FK → auth.users | Admin que criou |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Data de atualização |

**Indexes:**
- `idx_courses_status` ON (status)
- `idx_courses_visibility` ON (visibility_type)
- `idx_courses_slug` ON (slug) - Unique constraint já cria

**Validation Rules:**
- title: 1-255 caracteres
- slug: lowercase, hyphens, 1-255 caracteres, único
- plan_ids: array de IDs válidos da tabela plans
- user_ids: array de UUIDs válidos

### 2. course_modules

Agrupa aulas em módulos dentro de um curso.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| course_id | UUID | FK → courses, NOT NULL, ON DELETE CASCADE | Curso pai |
| title | VARCHAR(255) | NOT NULL | Título do módulo |
| description | TEXT | | Descrição do módulo |
| order_index | INTEGER | DEFAULT 0 | Ordem dentro do curso |
| visibility_override | VARCHAR(20) | CHECK (public, by_plan, by_user, NULL) | Override de visibilidade |
| plan_ids_override | INTEGER[] | | Override de planos |
| user_ids_override | UUID[] | | Override de usuários |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Data de atualização |

**Indexes:**
- `idx_course_modules_course` ON (course_id)
- `idx_course_modules_order` ON (course_id, order_index)

**Validation Rules:**
- title: 1-255 caracteres
- visibility_override: NULL herda do curso pai

### 3. lessons

Aulas individuais com vídeo do YouTube.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| module_id | UUID | FK → course_modules, NOT NULL, ON DELETE CASCADE | Módulo pai |
| title | VARCHAR(255) | NOT NULL | Título da aula |
| description | TEXT | | Descrição da aula |
| youtube_url | TEXT | NOT NULL | URL completa do YouTube |
| youtube_video_id | VARCHAR(20) | | ID extraído (11 chars) |
| duration_minutes | INTEGER | | Duração em minutos |
| order_index | INTEGER | DEFAULT 0 | Ordem dentro do módulo |
| is_free_preview | BOOLEAN | DEFAULT FALSE | Aula de preview gratuita |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Data de atualização |

**Indexes:**
- `idx_lessons_module` ON (module_id)
- `idx_lessons_order` ON (module_id, order_index)

**Validation Rules:**
- title: 1-255 caracteres
- youtube_url: deve conter video ID válido (11 caracteres alfanuméricos)
- youtube_video_id: extraído automaticamente via trigger ou aplicação
- duration_minutes: >= 0

### 4. lesson_materials

Materiais complementares anexados às aulas.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| lesson_id | UUID | FK → lessons, NOT NULL, ON DELETE CASCADE | Aula pai |
| title | VARCHAR(255) | NOT NULL | Nome do material |
| type | VARCHAR(50) | NOT NULL, CHECK (link, file, document) | Tipo do material |
| url | TEXT | NOT NULL | URL externa ou Storage |
| order_index | INTEGER | DEFAULT 0 | Ordem de exibição |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Data de criação |

**Indexes:**
- `idx_lesson_materials_lesson` ON (lesson_id)

**Validation Rules:**
- title: 1-255 caracteres
- type: enum ('link', 'file', 'document')
- url: URL válida (externa ou Supabase Storage)

### 5. lesson_progress

Tracking de progresso do usuário nas aulas.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| user_id | UUID | FK → auth.users, NOT NULL, ON DELETE CASCADE | Usuário |
| lesson_id | UUID | FK → lessons, NOT NULL, ON DELETE CASCADE | Aula |
| completed_at | TIMESTAMPTZ | | Data de conclusão |
| last_watched_at | TIMESTAMPTZ | DEFAULT NOW() | Última vez assistida |
| watch_time_seconds | INTEGER | DEFAULT 0 | Tempo total assistido |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Data de atualização |

**Constraints:**
- UNIQUE(user_id, lesson_id) - Um registro por usuário/aula

**Indexes:**
- `idx_lesson_progress_user` ON (user_id)
- `idx_lesson_progress_lesson` ON (lesson_id)
- `idx_lesson_progress_user_lesson` ON (user_id, lesson_id) - Unique constraint

## State Transitions

### Course Status

```
draft ──────────────────────────► published
  │                                   │
  │ (create)                          │ (despublicar)
  │                                   │
  ▼                                   ▼
draft ◄────────────────────────── published
                                      │
                                      │ (excluir - CASCADE)
                                      ▼
                                   deleted
```

**Transition Rules:**
- `draft → published`: Requer pelo menos 1 módulo com 1 aula
- `published → draft`: Progresso dos usuários é mantido
- `delete`: CASCADE remove módulos, aulas, progresso

### Lesson Progress

```
                    ┌──────────────┐
                    │   (novo)     │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  watching    │ (last_watched_at updated)
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │ (90% ou manual)         │
              ▼                         │
       ┌──────────────┐                 │
       │  completed   │ (completed_at)  │
       └──────┬───────┘                 │
              │                         │
              │ (desmarcar)             │
              └────────────────────────►│
```

## Views

### courses_with_stats (Admin)

```sql
CREATE OR REPLACE VIEW courses_with_stats AS
SELECT
  c.*,
  COUNT(DISTINCT cm.id) as modules_count,
  COUNT(DISTINCT l.id) as lessons_count,
  COALESCE(SUM(l.duration_minutes), 0) as total_duration_minutes,
  COUNT(DISTINCT lp.user_id) as enrolled_users_count,
  COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN lp.id END) as completions_count
FROM courses c
LEFT JOIN course_modules cm ON cm.course_id = c.id
LEFT JOIN lessons l ON l.module_id = cm.id
LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id
GROUP BY c.id;
```

### user_course_progress (User)

```sql
CREATE OR REPLACE VIEW user_course_progress AS
SELECT
  c.id as course_id,
  c.title,
  c.slug,
  c.thumbnail_url,
  c.description,
  COUNT(DISTINCT l.id) as total_lessons,
  COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END) as completed_lessons,
  ROUND(
    COUNT(DISTINCT CASE WHEN lp.completed_at IS NOT NULL THEN l.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT l.id), 0) * 100
  ) as progress_percentage,
  MAX(lp.last_watched_at) as last_activity
FROM courses c
JOIN course_modules cm ON cm.course_id = c.id
JOIN lessons l ON l.module_id = cm.id
LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = auth.uid()
WHERE c.status = 'published'
GROUP BY c.id, c.title, c.slug, c.thumbnail_url, c.description;
```

## Storage Buckets

### courses

```
Bucket: courses
Public: false (use policies)

Structure:
courses/
├── thumbnails/
│   └── {course_id}.{jpg|png|webp}
└── materials/
    └── {lesson_id}/
        └── {original_filename}

Policies:
- INSERT: admins only
- SELECT thumbnails/*: public
- SELECT materials/*: based on lesson access
- DELETE: admins only
- UPDATE: admins only
```

## Triggers & Functions

### Auto-update updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_course_modules_updated_at
  BEFORE UPDATE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lesson_progress_updated_at
  BEFORE UPDATE ON lesson_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Generate Slug

```sql
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        unaccent(title),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql;
```
