# Implementation Plan: Bug Report System

**Branch**: `021-bug-report-system` | **Date**: 2026-01-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-bug-report-system/spec.md`

## Summary

Sistema de captura de bugs integrado ao AlvoBot com botão flutuante em todas as telas, captura automática de screenshots via Canvas API, gravação de vídeo via MediaDevices API, captura de erros do console, armazenamento no Supabase Storage, e integração opcional com ClickUp via email.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend React 19, Backend NestJS 10)
**Primary Dependencies**:
- Frontend: React 19, Supabase JS, TanStack Query, Zustand, html2canvas (screenshot), MediaRecorder API (video)
- Backend: NestJS 10, Supabase service_role, Nodemailer/Resend (ClickUp email)
**Storage**: PostgreSQL (Supabase), Supabase Storage para arquivos
**Testing**: Jest (backend), Vitest (frontend)
**Target Platform**: Web (Chrome, Firefox, Edge - últimas 2 versões)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Screenshot < 500ms, Upload < 5s para 5MB, Botão render < 100ms
**Constraints**: Máx 10MB por arquivo, 5 arquivos por report, 2 min vídeo
**Scale/Scope**: Todos os usuários logados, storage indefinido

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

A constitution do projeto está em template vazio. Seguindo padrões existentes do AlvoBot:

| Gate | Status | Notes |
|------|--------|-------|
| Feature Module Pattern | PASS | Seguirá estrutura existente em `frontend/src/features/` |
| Direct Supabase Access | PASS | CRUD via RLS no frontend |
| Backend for External Services | PASS | Envio de email para ClickUp via backend |
| Design System Compliance | PASS | Usará componentes de `shared/components/` |
| RLS Policies | PASS | Políticas específicas para bug_reports |

## Project Structure

### Documentation (this feature)

```text
specs/021-bug-report-system/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API endpoints
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── features/
│   │   └── bug-report/           # NEW FEATURE MODULE
│   │       ├── api/
│   │       │   ├── queries.ts    # useBugReports, useBugReportById
│   │       │   ├── mutations.ts  # useCreateBugReport, useUpdateStatus
│   │       │   └── index.ts
│   │       ├── components/
│   │       │   ├── BugReportButton/      # Botão flutuante
│   │       │   ├── BugReportModal/       # Modal principal
│   │       │   ├── ScreenshotPreview/    # Preview do screenshot
│   │       │   ├── VideoRecorder/        # Controles de gravação
│   │       │   ├── AttachmentList/       # Lista de anexos
│   │       │   ├── BugReportList/        # Lista de reports (histórico)
│   │       │   └── index.ts
│   │       ├── pages/
│   │       │   └── BugReportsPage.tsx    # Página de histórico
│   │       ├── hooks/
│   │       │   ├── useScreenshot.ts      # Captura de screenshot
│   │       │   ├── useVideoRecorder.ts   # Gravação de vídeo
│   │       │   ├── useConsoleErrors.ts   # Captura de erros
│   │       │   └── useBrowserInfo.ts     # Info do navegador
│   │       ├── stores/
│   │       │   └── bugReportStore.ts     # Estado do modal/gravação
│   │       ├── types/
│   │       │   └── index.ts
│   │       └── utils/
│   │           └── screenshot.ts          # Funções de captura
│   │
│   └── shared/
│       └── layouts/
│           └── MainLayout/
│               └── MainLayout.tsx  # MODIFY: Add BugReportButton

backend/
├── src/
│   └── modules/
│       └── bug-report/               # NEW MODULE
│           ├── bug-report.module.ts
│           ├── bug-report.controller.ts
│           ├── bug-report.service.ts
│           └── dto/
│               ├── create-bug-report.dto.ts
│               └── send-clickup-email.dto.ts

database/
└── migrations/
    └── 003_bug_reports.sql           # Tabelas e RLS
```

**Structure Decision**: Web application seguindo feature module pattern existente. Frontend faz CRUD direto via Supabase (RLS). Backend usado apenas para envio de email ao ClickUp.

## Complexity Tracking

Nenhuma violação identificada. Feature segue padrões existentes do projeto.

---

## Phase 0: Research

### Research Tasks

1. **Screenshot Capture**: html2canvas vs dom-to-image vs native Canvas API
2. **Screen Recording**: MediaRecorder API compatibility e limitações
3. **Console Error Interception**: Padrões para captura de console.error/warn
4. **ClickUp Email Integration**: Formato de email para criação de tasks

### Findings (to be completed in research.md)

- [ ] Screenshot library comparison
- [ ] Browser compatibility matrix for MediaRecorder
- [ ] Console error capture approach
- [ ] ClickUp email-to-task format

---

## Phase 1: Design Artifacts

### Data Model (to be completed in data-model.md)

- `bug_reports` - Main entity
- `bug_report_attachments` - Files and media
- `bug_report_settings` - User preferences (ClickUp email)
- Console errors embedded in bug_reports JSON field

### API Contracts (to be completed in contracts/)

Frontend (Supabase direct):
- `GET /bug_reports` - List user's reports
- `POST /bug_reports` - Create report
- `PATCH /bug_reports/:id` - Update status

Backend:
- `POST /bug-report/send-clickup` - Send email to ClickUp

### Quick Start (to be completed in quickstart.md)

1. Run migration for bug_reports tables
2. Create Supabase Storage bucket "bug-reports"
3. Add BugReportButton to MainLayout
4. Configure ClickUp email (optional)
