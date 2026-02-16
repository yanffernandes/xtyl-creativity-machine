# Implementation Plan: Sistema de Cursos e Aulas

**Branch**: `027-courses-system` | **Date**: 2025-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/027-courses-system/spec.md`

## Summary

Sistema de cursos educacionais com hierarquia Curso → Módulos → Aulas, onde aulas são vídeos do YouTube. Inclui área administrativa para gerenciamento completo (CRUD, reordenação, controle de acesso) e área do usuário para visualização e tracking de progresso. O controle de acesso suporta visibilidade pública, por plano de assinatura ou por usuários específicos, usando lógica OR para combinações.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend React 19, Backend NestJS 10)
**Primary Dependencies**: React, TanStack Query, Supabase Client, dnd-kit (drag-and-drop), YouTube IFrame API
**Storage**: Supabase PostgreSQL + Supabase Storage (thumbnails, materiais)
**Testing**: Vitest (frontend), Jest (backend)
**Target Platform**: Web (SPA React + API NestJS)
**Project Type**: Web application (frontend + backend monorepo)
**Performance Goals**: Carregamento lista de cursos < 2s, player YouTube load 99% sucesso
**Constraints**: RLS obrigatório para segurança, sem vídeos privados do YouTube
**Scale/Scope**: Centenas de cursos, milhares de usuários, milhares de aulas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **RLS Obrigatório**: Todas tabelas terão RLS configurado
- [x] **Feature Module Pattern**: Seguirá estrutura api/, components/, pages/, types/
- [x] **Design System**: Usará CSS variables e componentes existentes
- [x] **Sem Hardcoded Data**: Planos e usuários vêm do banco de dados
- [x] **Backend para Operações Sensíveis**: Upload de arquivos via Supabase Storage (client-side OK com RLS)

## Project Structure

### Documentation (this feature)

```text
specs/027-courses-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API contracts
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Web application structure

backend/
├── src/
│   └── modules/
│       └── courses/
│           ├── courses.module.ts
│           ├── courses.controller.ts
│           ├── courses.service.ts
│           ├── dto/
│           │   ├── create-course.dto.ts
│           │   ├── update-course.dto.ts
│           │   ├── create-module.dto.ts
│           │   ├── create-lesson.dto.ts
│           │   └── reorder.dto.ts
│           └── entities/
│               ├── course.entity.ts
│               ├── course-module.entity.ts
│               ├── lesson.entity.ts
│               └── lesson-progress.entity.ts

frontend/
├── src/
│   └── features/
│       ├── courses/                    # Área do usuário
│       │   ├── api/
│       │   │   ├── queries.ts
│       │   │   ├── mutations.ts
│       │   │   └── index.ts
│       │   ├── components/
│       │   │   ├── CourseCard/
│       │   │   ├── CourseGrid/
│       │   │   ├── ModuleAccordion/
│       │   │   ├── LessonList/
│       │   │   ├── YouTubePlayer/
│       │   │   ├── ProgressBar/
│       │   │   └── index.ts
│       │   ├── pages/
│       │   │   ├── CoursesPage.tsx
│       │   │   ├── CourseDetailPage.tsx
│       │   │   └── LessonPage.tsx
│       │   ├── hooks/
│       │   │   ├── useYouTubeProgress.ts
│       │   │   └── useCourseProgress.ts
│       │   ├── types/
│       │   │   └── index.ts
│       │   └── utils/
│       │       └── youtube.ts
│       │
│       └── admin/                      # Área administrativa (existente)
│           └── components/
│               └── courses/            # Novo submódulo
│                   ├── CourseList/
│                   ├── CourseEditor/
│                   ├── ModuleManager/
│                   ├── LessonForm/
│                   ├── VisibilityConfig/
│                   └── index.ts
```

**Structure Decision**: Seguindo o padrão existente do projeto, a área do usuário será uma nova feature (`courses`), enquanto a área administrativa será um submódulo dentro da feature `admin` já existente. Isso mantém consistência com outras funcionalidades admin do projeto.

## Complexity Tracking

> Nenhuma violação de constitution identificada. O projeto segue padrões estabelecidos.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Implementation Phases

### Phase 1: Database & Backend Foundation
1. Criar migrations SQL para tabelas (courses, course_modules, lessons, lesson_materials, lesson_progress)
2. Configurar RLS policies
3. Criar bucket Supabase Storage para thumbnails e materiais
4. Implementar módulo NestJS para courses (se necessário para operações complexas)

### Phase 2: Admin - Gestão de Cursos
1. Lista de cursos com filtros e estatísticas
2. Formulário de criar/editar curso
3. Upload de thumbnail
4. Configuração de visibilidade

### Phase 3: Admin - Gestão de Módulos e Aulas
1. Interface de gerenciamento de módulos (drag-and-drop)
2. Formulário de criar/editar aulas
3. Preview de vídeo do YouTube
4. Gestão de materiais complementares
5. Mover aulas entre módulos

### Phase 4: Área do Usuário - Catálogo
1. Grid de cursos disponíveis
2. Filtros (em andamento, concluídos, todos)
3. Cards com progresso

### Phase 5: Área do Usuário - Player e Progresso
1. Página de detalhes do curso
2. Player do YouTube com tracking de progresso
3. Marcação automática (90%) e manual de conclusão
4. Navegação entre aulas
5. "Continuar de onde parou"

### Phase 6: Polish & Testing
1. Testes de integração para RLS
2. Testes de componentes
3. Otimização de performance
4. Ajustes de UX
