# Implementation Plan: Custom Alert Dialogs

**Branch**: `014-custom-alerts` | **Date**: 2025-11-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-custom-alerts/spec.md`

## Summary

Replace all native browser `confirm()` and `alert()` calls with custom styled components that match the application's glassmorphism design system. Confirmation dialogs will use the existing AlertDialog component with an imperative API wrapper, while informational alerts will use the existing Toast system with enhanced type variants.

## Technical Context

**Language/Version**: TypeScript 5.x (Frontend only)
**Primary Dependencies**: React 18, Radix UI (AlertDialog, Toast), Framer Motion
**Storage**: N/A (frontend-only, no data persistence)
**Testing**: Manual testing across 10 files with browser alerts
**Target Platform**: Web (Next.js 16 App Router)
**Project Type**: Web application (frontend changes only)
**Performance Goals**: Dialog render < 100ms, smooth 60fps animations
**Constraints**: Must integrate with existing Shadcn/UI component library, minimal migration effort per location
**Scale/Scope**: 17 browser alert occurrences across 10 files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| III. User Experience Excellence | ✅ Pass | Dialogs/toasts will use glassmorphism styling, animations via Framer Motion |
| III. Premium Visual Design | ✅ Pass | Custom styling matches design system, not default browser appearance |
| III. Interaction & Feedback | ✅ Pass | Clear confirmation dialogs, toast notifications with types (info, success, warning, error) |
| III. Performance as UX | ✅ Pass | Dialogs render instantly, animations are smooth |
| Design & Visual Identity | ✅ Pass | Using existing Shadcn/UI components with glassmorphism customization |
| Component Standards | ✅ Pass | "Modals/dialogs MUST have graceful enter/exit animations", "Toast notifications MUST be positioned consistently and dismissible" |
| Error Handling Standards | ✅ Pass | Toast types support error classification (User Errors, System Errors) |
| Accessibility | ✅ Pass | AlertDialog from Radix provides ARIA labels, focus trap, keyboard navigation |

**Pre-Phase 0 Gate**: ✅ PASS - All constitution requirements satisfied

## Project Structure

### Documentation (this feature)

```text
specs/014-custom-alerts/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - frontend types only)
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A (no API changes)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── alert-dialog.tsx     # Existing - enhance styling
│   │   │   ├── toast.tsx            # Existing - add type variants
│   │   │   ├── toaster.tsx          # Existing - already integrated
│   │   │   └── use-toast.ts         # Existing - already imperative
│   │   └── confirm-dialog/
│   │       ├── ConfirmDialogProvider.tsx  # New - context provider
│   │       ├── useConfirm.ts              # New - imperative hook
│   │       └── index.ts                   # New - exports
│   ├── app/
│   │   └── layout.tsx               # Add ConfirmDialogProvider
│   └── hooks/
│       └── use-toast.ts             # Re-export from components/ui
```

**Structure Decision**: Frontend-only changes. New `confirm-dialog/` directory for the imperative confirmation API. Existing toast system will be enhanced with type variants (info, success, warning, error).

## Complexity Tracking

> No constitution violations. Implementation uses existing patterns and components.

| Aspect | Approach | Rationale |
|--------|----------|-----------|
| Confirmation API | React Context + Promise | Matches existing toast pattern, minimal learning curve |
| Toast Types | Extend existing toastVariants | Reuse infrastructure, add success/warning/info variants |
| Migration | Direct replacement | `confirm()` → `await confirm()`, `alert()` → `toast()` |

## Files to Modify

### Browser Alerts Inventory (17 occurrences)

| File | Type | Count | Message |
|------|------|-------|---------|
| ShareDialog.tsx | confirm | 1 | "Tem certeza que deseja revogar o compartilhamento?" |
| project/[projectId]/page.tsx | confirm | 1 | "Tem certeza que deseja excluir este item?" |
| FolderTree.tsx | confirm | 1 | "Arquivar pasta X e todo seu conteúdo?" |
| workflows/page.tsx | confirm | 1 | "Tem certeza que deseja excluir este workflow?" |
| settings/page.tsx | confirm | 1 | "Tem certeza que deseja remover este membro?" |
| workflows/[workflowId]/page.tsx | confirm | 1 | "Are you sure you want to delete this workflow?" |
| ConversationsList.tsx | confirm | 1 | "Tem certeza que deseja excluir esta conversa?" |
| executions/[executionId]/page.tsx | confirm | 1 | "Are you sure you want to stop this workflow?" |
| AttachImageModal.tsx | alert | 4 | Various image attachment errors |
| DocumentAttachments.tsx | confirm | 1 | "Remove this image from the document?" |
| ImageViewer.tsx | confirm | 1 | "Tem certeza que deseja arquivar esta imagem?" |
| ActiveWorkflowsPanel.tsx | alert+confirm | 4 | Workflow pause/resume/stop errors + confirmation |

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create `ConfirmDialogProvider` with AlertDialog + Promise-based API
2. Create `useConfirm` hook for imperative usage
3. Enhance toast with success/warning/info variants
4. Add providers to root layout

### Phase 2: Migration
1. Replace all `confirm()` calls with `await confirm()`
2. Replace all `alert()` calls with `toast()`
3. Verify styling matches glassmorphism design

### Phase 3: Polish
1. Add glassmorphism styling to AlertDialog
2. Ensure consistent animations
3. Test keyboard navigation and accessibility
