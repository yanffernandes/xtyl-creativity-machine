# Quickstart: Sistema de Cursos e Aulas

**Feature**: 027-courses-system
**Date**: 2025-01-15

## Prerequisites

- [ ] Supabase project configurado
- [ ] Tabelas `admins`, `plans`, `transactions` existentes
- [ ] Frontend e Backend rodando localmente
- [ ] Node.js 18+

## 1. Database Setup

### 1.1 Create Tables

Execute no Supabase SQL Editor:

```sql
-- 1. Courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  visibility_type VARCHAR(20) DEFAULT 'public' CHECK (visibility_type IN ('public', 'by_plan', 'by_user', 'private')),
  plan_ids INTEGER[] DEFAULT '{}',
  user_ids UUID[] DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Course modules table
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  visibility_override VARCHAR(20) CHECK (visibility_override IN ('public', 'by_plan', 'by_user')),
  plan_ids_override INTEGER[],
  user_ids_override UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  youtube_url TEXT NOT NULL,
  youtube_video_id VARCHAR(20),
  duration_minutes INTEGER,
  order_index INTEGER DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Lesson materials table
CREATE TABLE lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('link', 'file', 'document')),
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Lesson progress table
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  watch_time_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Indexes
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_visibility ON courses(visibility_type);
CREATE INDEX idx_course_modules_course ON course_modules(course_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
```

### 1.2 Enable RLS

```sql
-- Enable RLS on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
```

### 1.3 Create RLS Policies

```sql
-- Courses: Admins manage, users view accessible
CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Users can view accessible courses" ON courses
  FOR SELECT USING (
    status = 'published' AND (
      visibility_type = 'public' OR
      (plan_ids != '{}' AND EXISTS (
        SELECT 1 FROM transactions t
        WHERE t.user_id = auth.uid()
        AND t.status IN ('approved', 'completed')
        AND t.plan_id = ANY(courses.plan_ids)
        AND (t.expiration_date IS NULL OR t.expiration_date > NOW())
      )) OR
      (user_ids != '{}' AND auth.uid() = ANY(user_ids))
    )
  );

-- Course modules policies
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
        (c.plan_ids != '{}' AND EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.user_id = auth.uid()
          AND t.status IN ('approved', 'completed')
          AND t.plan_id = ANY(c.plan_ids)
          AND (t.expiration_date IS NULL OR t.expiration_date > NOW())
        )) OR
        (c.user_ids != '{}' AND auth.uid() = ANY(c.user_ids))
      )
    )
  );

-- Lessons policies
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
        (c.plan_ids != '{}' AND EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.user_id = auth.uid()
          AND t.status IN ('approved', 'completed')
          AND t.plan_id = ANY(c.plan_ids)
          AND (t.expiration_date IS NULL OR t.expiration_date > NOW())
        )) OR
        (c.user_ids != '{}' AND auth.uid() = ANY(c.user_ids))
      )
    )
  );

-- Materials policies
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
        (c.plan_ids != '{}' AND EXISTS (
          SELECT 1 FROM transactions t
          WHERE t.user_id = auth.uid()
          AND t.status IN ('approved', 'completed')
          AND t.plan_id = ANY(c.plan_ids)
          AND (t.expiration_date IS NULL OR t.expiration_date > NOW())
        )) OR
        (c.user_ids != '{}' AND auth.uid() = ANY(c.user_ids))
      )
    )
  );

-- Progress policies
CREATE POLICY "Users manage own progress" ON lesson_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all progress" ON lesson_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
  );
```

### 1.4 Create Views

```sql
-- Admin view with stats
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

-- User progress view
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

### 1.5 Create Storage Bucket

No Supabase Dashboard > Storage:

1. Create bucket `courses`
2. Set as non-public
3. Add policies:

```sql
-- Admins can upload
CREATE POLICY "Admins can upload course files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'courses' AND
  EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
);

-- Admins can delete
CREATE POLICY "Admins can delete course files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'courses' AND
  EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid() AND status = 'active')
);

-- Public can read thumbnails
CREATE POLICY "Public can read thumbnails"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'courses' AND
  (storage.foldername(name))[1] = 'thumbnails'
);

-- Authenticated users can read materials (based on lesson access)
CREATE POLICY "Users can read accessible materials"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'courses' AND
  (storage.foldername(name))[1] = 'materials' AND
  auth.uid() IS NOT NULL
);
```

## 2. Frontend Setup

### 2.1 Create Feature Structure

```bash
mkdir -p frontend/src/features/courses/{api,components,pages,hooks,types,utils}
```

### 2.2 Install Dependencies

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 2.3 Add Routes

Em `frontend/src/app/router.tsx`:

```typescript
// User routes
{ path: '/courses', element: <CoursesPage /> },
{ path: '/courses/:slug', element: <CourseDetailPage /> },
{ path: '/courses/:slug/:lessonId', element: <LessonPage /> },

// Admin routes (dentro de /admin)
{ path: '/admin/courses', element: <AdminCoursesPage /> },
{ path: '/admin/courses/new', element: <AdminCourseEditorPage /> },
{ path: '/admin/courses/:id', element: <AdminCourseEditorPage /> },
```

### 2.4 Add Sidebar Link

Em `frontend/src/shared/layouts/MainLayout/Sidebar.tsx`:

```typescript
{
  path: '/courses',
  label: 'Academia',
  icon: <GraduationCapIcon />,
},
```

## 3. Quick Test

### 3.1 Create Test Course (SQL)

```sql
-- Insert test course
INSERT INTO courses (title, slug, description, status, visibility_type, created_by)
VALUES (
  'Curso de Teste',
  'curso-de-teste',
  'Um curso para testar o sistema',
  'published',
  'public',
  (SELECT id FROM auth.users LIMIT 1)
);

-- Insert test module
INSERT INTO course_modules (course_id, title, description, order_index)
VALUES (
  (SELECT id FROM courses WHERE slug = 'curso-de-teste'),
  'Módulo 1 - Introdução',
  'Aulas introdutórias',
  0
);

-- Insert test lesson
INSERT INTO lessons (module_id, title, description, youtube_url, youtube_video_id, duration_minutes, order_index)
VALUES (
  (SELECT id FROM course_modules WHERE title = 'Módulo 1 - Introdução'),
  'Aula 1 - Bem-vindo',
  'Aula de boas-vindas ao curso',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'dQw4w9WgXcQ',
  3,
  0
);
```

### 3.2 Verify RLS

```sql
-- As regular user (should see published public courses)
SELECT * FROM courses;

-- As admin (should see all courses)
SELECT * FROM courses_with_stats;
```

## 4. Development Workflow

1. **Database First**: Sempre criar/alterar schema antes do código
2. **RLS Testing**: Testar políticas com diferentes usuários
3. **Feature Folder**: Manter código organizado em api/, components/, pages/
4. **Query Keys**: Usar pattern definido em contracts/api.md

## 5. Common Commands

```bash
# Start frontend
cd frontend && npm run dev

# Start backend (se necessário)
cd backend && npm run start:dev

# Generate types from Supabase (se configurado)
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > frontend/src/shared/types/database.ts
```

## Next Steps

1. [ ] Executar SQL de criação de tabelas
2. [ ] Criar bucket de storage
3. [ ] Criar estrutura de pastas do frontend
4. [ ] Implementar tipos TypeScript
5. [ ] Implementar queries e mutations
6. [ ] Criar componentes base
7. [ ] Implementar páginas
