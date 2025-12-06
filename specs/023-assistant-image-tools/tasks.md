# Implementation Tasks: Assistant Image Analysis & Refinement Tools

**Feature**: 023-assistant-image-tools
**Generated**: 2025-12-05
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Task Summary

| Phase | Description | Tasks | Parallel |
|-------|-------------|-------|----------|
| 1 | Setup & Infrastructure | 3 | 2 |
| 2 | Foundational (Vision Service) | 2 | 1 |
| 3 | US1 - Image Analysis | 6 | 3 |
| 4 | US2 - Image Refinement | 4 | 2 |
| 5 | US3 - List Document Images | 4 | 2 |
| 6 | US4 - Increase max_iterations | 3 | 1 |
| 7 | Polish & Integration | 3 | 2 |
| **Total** | | **25** | **13** |

---

## Phase 1: Setup & Infrastructure

**Goal**: Prepare codebase for new image tools

### Tasks

- [x] T001 Verify existing vision_service.py has base image analysis capability in backend/vision_service.py
- [x] T002 [P] Verify image_generation_service.py supports base_image_url parameter in backend/image_generation_service.py
- [x] T003 [P] Verify DocumentAttachment model relationships are correct in backend/models.py

---

## Phase 2: Foundational (Vision Service Extension)

**Goal**: Add URL-based image analysis capability required by all image analysis tools

**Blocks**: Phase 3 (US1), Phase 4 (US2)

### Tasks

- [x] T004 Add analyze_image_from_url() async function to backend/vision_service.py
- [x] T005 [P] Add error handling for inaccessible URLs and invalid image formats in backend/vision_service.py

---

## Phase 3: User Story 1 - Analyze Attached Document Images (P1)

**Goal**: Users can analyze images attached to documents via natural language

**Independent Test**: Open document with attached images, ask "Analise as imagens deste documento", receive detailed analysis

**Acceptance Criteria**:
- Assistant analyzes each attached image providing visual elements, text, colors, composition
- Multiple images can be compared
- Text in images is extracted (OCR-like)

### Tasks

- [x] T006 [US1] Implement analyze_image_tool() function in backend/tools.py
- [x] T007 [P] [US1] Add analyze_image tool definition to TOOL_DEFINITIONS in backend/tools.py
- [x] T008 [P] [US1] Add analyze_image case to execute_tool() in backend/tools.py
- [x] T009 [US1] Implement analyze_document_images_tool() function in backend/tools.py
- [x] T010 [P] [US1] Add analyze_document_images tool definition to TOOL_DEFINITIONS in backend/tools.py
- [x] T011 [US1] Add analyze_document_images case to execute_tool() in backend/tools.py

---

## Phase 4: User Story 2 - Image Refinement via Text Instructions (P2)

**Goal**: Users can refine existing images by providing natural language modification instructions

**Independent Test**: Select image, request "mude a cor do texto para vermelho", receive new refined image

**Acceptance Criteria**:
- Refined image is generated using base_image_url mechanism
- Original image is preserved, new image created
- Refined image can be auto-attached to document

### Tasks

- [x] T012 [US2] Implement refine_image_tool() function using base_image_url in backend/tools.py
- [x] T013 [P] [US2] Add refine_image tool definition to TOOL_DEFINITIONS in backend/tools.py
- [x] T014 [P] [US2] Add refine_image case to execute_tool() in backend/tools.py
- [x] T015 [US2] Add auto-attachment logic for refined images to target document in backend/tools.py

---

## Phase 5: User Story 3 - List and Select Document Images (P2)

**Goal**: Users can list all attached images and reference specific ones by position or title

**Independent Test**: Ask "liste as imagens deste documento", receive numbered list, then "analise a imagem 2"

**Acceptance Criteria**:
- All attached images listed with position, title, thumbnail URL
- Images can be referenced by position (1, 2, 3) or title

### Tasks

- [x] T016 [US3] Implement list_document_images_tool() function in backend/tools.py
- [x] T017 [P] [US3] Add list_document_images tool definition to TOOL_DEFINITIONS in backend/tools.py
- [x] T018 [P] [US3] Add list_document_images case to execute_tool() in backend/tools.py
- [x] T019 [US3] Add tool descriptions to _get_tool_description() for all 4 new tools in backend/routers/chat.py

---

## Phase 6: User Story 4 - Increase max_iterations Limit (P3)

**Goal**: Increase default task chain limit from 15 to 25 for all users

**Independent Test**: Run conversation requiring 20+ tool calls, verify completion without hitting limit

**Acceptance Criteria**:
- New default is 25 (was 15)
- Existing users migrated from 15 to 25
- Max limit remains 50

### Tasks

- [x] T020 [US4] Update max_iterations default from 15 to 25 in backend/schemas.py
- [x] T021 [P] [US4] Update max_iterations default from 15 to 25 in backend/models.py
- [x] T022 [US4] Create migration 024_update_max_iterations.sql to update existing users in backend/migrations/

---

## Phase 7: Polish & Integration

**Goal**: Frontend integration and final touches

### Tasks

- [x] T023 Add image thumbnail display for tool results in frontend/src/components/ToolExecutionCard.tsx
- [x] T024 [P] Update system prompt to include attached images context when document is open in backend/routers/chat.py
- [ ] T025 [P] Manual end-to-end testing: analyze → refine → save workflow

---

## Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Vision Service) ──────────────────────────┐
    │                                               │
    ├───────────────┬───────────────┐               │
    ▼               ▼               ▼               │
Phase 3 (US1)   Phase 5 (US3)   Phase 6 (US4)      │
    │               │               │               │
    │               │               │               │
    ▼               │               │               │
Phase 4 (US2) ◄─────┘               │               │
    │                               │               │
    └───────────────────────────────┴───────────────┘
                    │
                    ▼
              Phase 7 (Polish)
```

**Notes**:
- US1 (Analyze) must complete before US2 (Refine) since refine uses analysis patterns
- US3 (List) can run in parallel with US1
- US4 (max_iterations) is independent, can run anytime after Phase 1
- Phase 7 depends on all user stories being complete

---

## Parallel Execution Opportunities

### Within Phase 3 (US1)
```bash
# Can run in parallel:
T007, T008, T010  # Tool definitions and execute cases
```

### Within Phase 4 (US2)
```bash
# Can run in parallel:
T013, T014  # Tool definition and execute case
```

### Within Phase 5 (US3)
```bash
# Can run in parallel:
T017, T018  # Tool definition and execute case
```

### Cross-Phase Parallelism
```bash
# After Phase 2, can run in parallel:
- Phase 3 (US1 - Analyze)
- Phase 5 (US3 - List)
- Phase 6 (US4 - max_iterations)
```

---

## MVP Scope

**Recommended MVP**: Complete Phases 1-3 (US1 - Image Analysis)

This delivers:
- Ability to analyze attached images
- Extract text from images
- Compare multiple images
- Foundation for refinement (Phase 4)

**MVP Task Count**: 11 tasks (T001-T011)

---

## Implementation Strategy

1. **Start with Phase 1-2**: Setup and vision service extension
2. **Deliver US1 first**: Image analysis is the foundational capability
3. **Add US3 in parallel**: List images enables better UX for subsequent features
4. **Complete US2**: Refinement builds on analysis
5. **Add US4 anytime**: Independent migration task
6. **Polish last**: Frontend integration after all backend tools work

---

## Verification Checklist

After completing all tasks, verify:

- [x] All 4 tool functions exist in backend/tools.py
- [x] All 4 tool definitions in TOOL_DEFINITIONS list
- [x] All 4 cases in execute_tool() function
- [x] analyze_image_from_url() exists in vision_service.py
- [x] max_iterations default is 25 in schemas.py and models.py
- [x] Migration 024 exists and updates existing users
- [x] Tool descriptions added to _get_tool_description()
- [x] Frontend displays image thumbnails in tool results
- [x] System prompt includes attached images context when document is open
- [ ] End-to-end test: analyze → refine → save works
