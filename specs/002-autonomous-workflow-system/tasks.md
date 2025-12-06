# Implementation Tasks: Autonomous Workflow System

**Branch**: `002-autonomous-workflow-system` | **Date**: 2025-11-25
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Status**: ✅ COMPLETED

## Task Dependencies & Execution Order

**Critical Path**: Phase 1 → Phase 2 (Foundation) → Phase 3 (US3) → Phase 4 (US1) → Phase 5 (US4) → Phase 6 (US2) → Phase 7 (US5) → Phase 8 (Polish)

**User Story Priority Order**:
1. **Foundation** (Blocks all stories) - Database, Celery, validation core
2. **US3** (P1) - Document-Image Attachments - Can work independently after foundation
3. **US1** (P1) - Pre-built Templates - MVP candidate, depends on foundation + US3
4. **US4** (P2) - Execution Control - Extends US1
5. **US2** (P2) - Visual Builder - Depends on foundation, can work parallel to US1 after
6. **US5** (P3) - Template Library - Depends on US1 + US2
7. **Polish** - Cross-cutting improvements

**Parallel Execution Examples**:
- T003-T006 can run in parallel (independent file creation)
- T015-T018 can run in parallel (model definitions)
- T045-T049 can run in parallel (frontend node components)
- T075-T078 can run in parallel (template seeding)

---

## Phase 1: Setup & Infrastructure (T001-T012)

### Project Structure & Dependencies

- [x] [T001] Create specs directory structure at /Users/yanfernandes/GitHub/xtyl-creativity-machine/specs/002-autonomous-workflow-system/
- [x] [T002] [P] Create research.md placeholder at /Users/yanfernandes/GitHub/xtyl-creativity-machine/specs/002-autonomous-workflow-system/research.md
- [x] [T003] [P] Create data-model.md placeholder at /Users/yanfernandes/GitHub/xtyl-creativity-machine/specs/002-autonomous-workflow-system/data-model.md
- [x] [T004] [P] Create quickstart.md placeholder at /Users/yanfernandes/GitHub/xtyl-creativity-machine/specs/002-autonomous-workflow-system/quickstart.md
- [x] [T005] [P] Create contracts directory at /Users/yanfernandes/GitHub/xtyl-creativity-machine/specs/002-autonomous-workflow-system/contracts/
- [x] [T006] [P] Create checklists directory at /Users/yanfernandes/GitHub/xtyl-creativity-machine/specs/002-autonomous-workflow-system/checklists/

### Backend Dependencies

- [x] [T007] Add celery[redis]==5.3.4 to backend/requirements.txt
- [x] [T008] [P] Add redis==5.0.1 to backend/requirements.txt
- [x] [T009] [P] Add celery-types==0.21.0 to backend/requirements.txt for type hints

### Frontend Dependencies

- [x] [T010] Add reactflow@11.10.4 to frontend/package.json
- [x] [T011] [P] Add @xyflow/react@11.10.4 to frontend/package.json (ReactFlow alias)

### Docker Compose Configuration

- [x] [T012] Add redis service to docker-compose.yml (image: redis:7-alpine, health check, volume for persistence)
- [x] [T013] Add celery-worker service to docker-compose.yml (extends backend, command: celery -A backend.celery_app worker --loglevel=info)
- [x] [T014] Add CELERY_BROKER_URL and CELERY_RESULT_BACKEND environment variables to backend service in docker-compose.yml

---

## Phase 2: Foundational Backend (T015-T034) - BLOCKS ALL STORIES

### Database Models

- [x] [T015] [P] Create WorkflowTemplate model in backend/models.py (id, workspace_id, name, description, category, nodes_json, edges_json, default_params_json, is_system, usage_count, created_at, updated_at)
- [x] [T016] [P] Create WorkflowNode model in backend/models.py (id, template_id, node_id, node_type, label, config_json, position_x, position_y)
- [x] [T017] [P] Create WorkflowExecution model in backend/models.py (id, template_id, project_id, workspace_id, user_id, status, config_json, progress_percent, current_node_id, started_at, completed_at, error_message, total_cost)
- [x] [T018] [P] Create AgentJob model in backend/models.py (id, execution_id, node_id, job_type, status, input_data_json, output_data_json, error_message, tokens_used, started_at, completed_at)
- [x] [T019] Create DocumentAttachment model in backend/models.py (id, document_id, image_id, is_primary, attachment_order, created_at, created_by_workflow_id) with unique constraint on (document_id, image_id)

### Database Migration

- [x] [T020] Create Alembic migration 00X_add_workflows.py for WorkflowTemplate table with indexes on (workspace_id, category), (workspace_id, is_system)
- [x] [T021] Add WorkflowNode table creation to migration 00X_add_workflows.py with foreign key to WorkflowTemplate, index on template_id
- [x] [T022] Add WorkflowExecution table creation to migration 00X_add_workflows.py with foreign keys to WorkflowTemplate, Project, Workspace, User, indexes on (workspace_id, status), execution_id
- [x] [T023] Add AgentJob table creation to migration 00X_add_workflows.py with foreign key to WorkflowExecution, indexes on (execution_id, status)
- [x] [T024] Add DocumentAttachment table creation to migration 00X_add_workflows.py with foreign keys to Document and Image (as document_id), indexes on document_id and image_id

### Pydantic Schemas

- [x] [T025] [P] Create WorkflowTemplateSchema in backend/schemas.py (base, create, update, response with computed fields for node_count, avg_execution_time)
- [x] [T026] [P] Create WorkflowNodeSchema in backend/schemas.py (base, create, update with validation for node_type enum: generate_copy, generate_image, attach_to_document, review, conditional, parallel, merge)
- [x] [T027] [P] Create WorkflowExecutionSchema in backend/schemas.py (base, create/launch, response with nested agent_jobs, progress tracking)
- [x] [T028] [P] Create AgentJobSchema in backend/schemas.py (base, response with status, timing, tokens)
- [x] [T029] Create DocumentAttachmentSchema in backend/schemas.py (base, create, response with image metadata)

### Celery Infrastructure

- [x] [T030] Create backend/celery_app.py with Celery instance initialization (broker_url from env, result_backend redis, task_serializer json)
- [x] [T031] Create backend/tasks/__init__.py to register task modules
- [x] [T032] Create backend/tasks/workflow_tasks.py with execute_workflow_task stub (accepts execution_id, loads execution from DB)

### Workflow Validation Service

- [x] [T033] Create backend/services/workflow_validator.py with validate_node_connections function (cycle detection using DFS, invalid edge validation)
- [x] [T034] Add validate_node_config function to workflow_validator.py (checks required fields per node type, validates prompt templates, quantity ranges)

---

## Phase 3: US3 - Document-Image Attachments (P1) 🎯 MVP CANDIDATE (T035-T044)

**Goal**: Enable attaching images to copy documents
**Independent Test**: Create doc, attach images, verify persistence

### Backend - Document Attachments

- [x] [T035] [US3] Create GET /api/documents/{docId}/attachments endpoint in backend/routers/documents.py to list attached images with metadata
- [x] [T036] [US3] Create POST /api/documents/{docId}/attachments endpoint in backend/routers/documents.py to attach existing images (accepts image_ids array, validates max 20 attachments)
- [x] [T037] [US3] Create DELETE /api/documents/{docId}/attachments/{imageId} endpoint in backend/routers/documents.py to detach image (doesn't delete image document)
- [x] [T038] [US3] Create PUT /api/documents/{docId}/attachments/{imageId}/primary endpoint in backend/routers/documents.py to set primary image (unsets previous primary)

### Frontend - Document Attachments UI

- [x] [T039] [US3] Create frontend/src/components/document/DocumentAttachments.tsx component with grid layout for attached image cards
- [x] [T040] [US3] Add "Attach Images" button to document editor toolbar in existing document editor component
- [x] [T041] [US3] Create frontend/src/components/document/AttachImageModal.tsx with tabs for "Select from Project" and "Upload New"
- [x] [T042] [US3] Implement multi-select image grid in AttachImageModal with thumbnail previews, file size display
- [x] [T043] [US3] Add "Set as Primary" badge/button to image cards in DocumentAttachments component with star icon
- [x] [T044] [US3] Integrate DocumentAttachments component into document detail view below main content area

---

## Phase 4: US1 - Pre-built Templates & Execution (P1) 🎯 MVP (T045-T075)

**Goal**: Launch workflows from templates
**Independent Test**: Select template, configure, launch, verify documents created

### Core Workflow Engine

- [x] [T045] [US1] Create backend/services/workflow_engine.py with execute_workflow function (orchestrates node execution, manages state transitions)
- [x] [T046] [US1] Add handle_workflow_state_transition to workflow_engine.py (pending→running, running→paused, running→completed/failed/stopped with atomic DB updates)
- [x] [T047] [US1] Add calculate_workflow_progress to workflow_engine.py (computes progress_percent based on completed nodes vs total nodes)
- [x] [T048] [US1] Create backend/services/node_executor.py with execute_node dispatcher function (routes to specific node type handlers)

### Node Execution Handlers

- [x] [T049] [US1] [P] Implement execute_generate_copy_node in node_executor.py (calls existing AI chat service, creates draft documents, returns document_ids)
- [x] [T050] [US1] [P] Implement execute_generate_image_node in node_executor.py (calls existing image generation service, creates draft images, returns image_ids)
- [x] [T051] [US1] [P] Implement execute_attach_to_document_node in node_executor.py (creates DocumentAttachment records based on node config: single→single, single→multiple, multiple→single)
- [x] [T052] [US1] [P] Implement execute_review_node in node_executor.py (sets workflow to paused, sends notification, waits for user approval)
- [x] [T053] [US1] Implement execute_parallel_node in node_executor.py (uses Celery group to execute child nodes concurrently)

### Celery Workflow Tasks

- [x] [T054] [US1] Implement execute_workflow_task in backend/tasks/workflow_tasks.py (loads execution, iterates nodes in topological order, calls node_executor for each)
- [x] [T055] [US1] Add execute_node_task to workflow_tasks.py (wraps node_executor.execute_node, updates AgentJob status, handles errors)
- [x] [T056] [US1] Add workflow state persistence after each node completion in execute_workflow_task (atomic update of WorkflowExecution.current_node_id, progress_percent)

### Backend API - Workflow Templates

- [x] [T057] [US1] Create backend/routers/workflows.py with GET /api/workflows/templates endpoint (list templates, filter by category, workspace_id, include system templates)
- [x] [T058] [US1] Add GET /api/workflows/templates/{id} endpoint to workflows.py (return template detail with nodes, edges, default_params, usage stats)
- [x] [T059] [US1] Add POST /api/workflows/templates endpoint to workflows.py (create custom template, validates nodes/edges via workflow_validator)
- [x] [T060] [US1] Add PUT /api/workflows/templates/{id} endpoint to workflows.py (update template, re-validates)
- [x] [T061] [US1] Add POST /api/workflows/templates/{id}/clone endpoint to workflows.py (creates copy with is_system=false, new name)

### Backend API - Workflow Executions

- [x] [T062] [US1] Create backend/routers/workflow_executions.py with POST /api/workflows/executions/launch endpoint (validates config, creates WorkflowExecution, enqueues execute_workflow_task)
- [x] [T063] [US1] Add GET /api/workflows/executions/{id} endpoint to workflow_executions.py (return execution status, progress, current_node, agent_jobs with nested data)
- [x] [T064] [US1] Add GET /api/workflows/executions endpoint to workflow_executions.py (list executions for workspace/project, filter by status)

### Frontend - API Client

- [x] [T065] [US1] Create frontend/src/lib/api/workflows.ts with fetchTemplates, fetchTemplateById, createTemplate, updateTemplate, cloneTemplate functions using axios
- [x] [T066] [US1] Add launchWorkflow, fetchExecution, fetchExecutions functions to workflows.ts API client

### Frontend - Workflow Launch UI

- [x] [T067] [US1] Create frontend/src/app/workspace/[id]/workflows/page.tsx as template gallery page with grid layout
- [x] [T068] [US1] Create frontend/src/components/workflow/TemplateCard.tsx component displaying template name, description, node count, category badge, usage count
- [x] [T069] [US1] Create frontend/src/components/workflow/LaunchWorkflowModal.tsx with parameter configuration form (topic input, quantity sliders, context document multi-select)
- [x] [T070] [US1] Add template selection handler to workflows page.tsx that opens LaunchWorkflowModal with selected template
- [x] [T071] [US1] Implement launch button handler in LaunchWorkflowModal that calls launchWorkflow API, shows success toast, redirects to execution monitor

### Frontend - Execution Monitoring

- [x] [T072] [US1] Create frontend/src/app/workspace/[id]/workflows/executions/[executionId]/page.tsx as execution detail page
- [x] [T073] [US1] Create frontend/src/hooks/useWorkflowExecution.ts hook with polling (2-second interval) to fetch execution status
- [x] [T074] [US1] Create frontend/src/components/workflow/ExecutionProgress.tsx component displaying progress bar, current node label, estimated time remaining

### Pre-built Template Seeding

- [x] [T075] [US1] [P] Create backend/seeds/workflow_templates.py with seed_system_templates function
- [x] [T076] [US1] [P] Add "Facebook Ads Campaign" template to workflow_templates.py (nodes: generate 10 copies, generate 5 images, attach images to copies)
- [x] [T077] [US1] [P] Add "Instagram Carousel" template to workflow_templates.py (nodes: generate 1 long copy, generate 10 carousel images, attach all images to copy)
- [x] [T078] [US1] [P] Add "Blog Post with Social" template to workflow_templates.py (nodes: generate blog post, generate featured image, generate 5 social snippets, attach featured image to blog)
- [x] [T079] [US1] Add "Email Campaign" template to workflow_templates.py (nodes: generate subject line variations, generate email body, generate header image)
- [x] [T080] [US1] Add "Landing Page Hero" template to workflow_templates.py (nodes: generate headline variations, generate hero image, generate CTA copy)
- [x] [T081] [US1] Add database seed command to run workflow_templates.seed_system_templates on first deployment

---

## Phase 5: US4 - Execution Control (P2) (T082-T091)

**Goal**: Monitor and control running workflows
**Independent Test**: Launch workflow, pause, resume, stop

### Backend - Execution Control

- [x] [T082] [US4] Add POST /api/workflows/executions/{id}/pause endpoint to workflow_executions.py (sets status to paused, signals Celery task to stop after current node)
- [x] [T083] [US4] Add POST /api/workflows/executions/{id}/resume endpoint to workflow_executions.py (sets status back to running, re-enqueues workflow task from current_node_id)
- [x] [T084] [US4] Add POST /api/workflows/executions/{id}/stop endpoint to workflow_executions.py (sets status to stopped, revokes Celery task, marks incomplete agent_jobs as cancelled)
- [x] [T085] [US4] Add POST /api/workflows/executions/{id}/retry-node endpoint to workflow_executions.py (resets failed node's agent_jobs to pending, re-executes node)
- [x] [T086] [US4] Implement Celery task signal handling in execute_workflow_task to check for pause requests between nodes (query execution status from DB)

### Frontend - Active Workflows Panel

- [x] [T087] [US4] Create frontend/src/components/workflow/ActiveWorkflowsPanel.tsx as slide-over sidebar component
- [x] [T088] [US4] Add "Active Workflows" icon button to main app header that toggles ActiveWorkflowsPanel
- [x] [T089] [US4] Populate ActiveWorkflowsPanel with list of running/paused executions using fetchExecutions API (filter status: running,paused)
- [x] [T090] [US4] Add pause/resume/stop control buttons to ExecutionProgress component with confirmation modals
- [x] [T091] [US4] Implement retry button for failed nodes in execution detail page, calls retryNode API endpoint

---

## Phase 6: US2 - Visual Workflow Builder (P2) (T092-T110)

**Goal**: Create custom workflows
**Independent Test**: Build workflow from scratch, save, execute

### ReactFlow Canvas Setup

- [x] [T092] [US2] Create frontend/src/components/workflow/WorkflowCanvas.tsx wrapper component initializing ReactFlow with custom theme
- [x] [T093] [US2] Configure ReactFlow custom styles in WorkflowCanvas using Tailwind classes (node borders, edge colors matching Ethereal Blue theme)
- [x] [T094] [US2] Add node dragging handler to WorkflowCanvas that updates node positions in state
- [x] [T095] [US2] Add edge connection handler to WorkflowCanvas that validates connections via useWorkflowValidation hook before adding edge

### Custom Node Components

- [x] [T096] [US2] [P] Create frontend/src/components/workflow/nodes/GenerateCopyNode.tsx with custom design (icon, label, handles for input/output connections)
- [x] [T097] [US2] [P] Create frontend/src/components/workflow/nodes/GenerateImageNode.tsx with custom design
- [x] [T098] [US2] [P] Create frontend/src/components/workflow/nodes/AttachToDocumentNode.tsx with custom design (shows attachment strategy icon)
- [x] [T099] [US2] [P] Create frontend/src/components/workflow/nodes/ReviewNode.tsx with custom design (human icon, pause indicator)
- [x] [T100] [US2] [P] Create frontend/src/components/workflow/nodes/ConditionalNode.tsx with custom design (diamond shape, branch indicators)
- [x] [T101] [US2] [P] Create frontend/src/components/workflow/nodes/ParallelNode.tsx with custom design (shows parallel execution lanes)
- [x] [T102] [US2] Register all custom node types with ReactFlow in WorkflowCanvas using nodeTypes prop

### Node Configuration Panel

- [x] [T103] [US2] Create frontend/src/components/workflow/NodeConfigPanel.tsx as right sidebar that appears when node is selected
- [x] [T104] [US2] Add GenerateCopyNodeConfig form to NodeConfigPanel with fields: prompt template (textarea), quantity (number), temperature (slider), context documents (multi-select), output status (dropdown)
- [x] [T105] [US2] Add GenerateImageNodeConfig form to NodeConfigPanel with fields: prompt template, style preset, dimensions, quantity
- [x] [T106] [US2] Add AttachToDocumentNodeConfig form to NodeConfigPanel with fields: attachment strategy (dropdown: single→single, single→multiple, multiple→single), source node selection
- [x] [T107] [US2] Add ReviewNodeConfig form to NodeConfigPanel with fields: review instructions (textarea), auto-approve after timeout (toggle + duration)

### Workflow Toolbar & Save

- [x] [T108] [US2] Create frontend/src/components/workflow/WorkflowToolbar.tsx as top toolbar with Save, Test Run, Launch buttons
- [x] [T109] [US2] Implement Save button handler that calls createTemplate or updateTemplate API with current nodes/edges state
- [x] [T110] [US2] Create frontend/src/app/workspace/[id]/workflows/builder/[templateId]/page.tsx as workflow builder route containing WorkflowCanvas, NodeConfigPanel, WorkflowToolbar

---

## Phase 7: US5 - Template Library (P3) (T111-T118)

**Goal**: Browse and clone templates
**Independent Test**: Browse gallery, preview, clone

### Template Gallery Enhancements

- [x] [T111] [US5] Add category filter dropdown to workflows page.tsx template gallery (Social Media, Paid Ads, Blog Content, Email Campaigns)
- [x] [T112] [US5] Add search input to workflows page.tsx that filters templates by name/description
- [x] [T113] [US5] Sort templates in gallery by usage_count desc (most popular first) with toggle for "Newest"

### Template Preview Modal

- [x] [T114] [US5] Create frontend/src/components/workflow/TemplatePreviewModal.tsx that displays full workflow diagram read-only
- [x] [T115] [US5] Add example inputs/outputs section to TemplatePreviewModal (mock data showing what template produces)
- [x] [T116] [US5] Add usage statistics section to TemplatePreviewModal (times used, average execution time, success rate)
- [x] [T117] [US5] Add "Use Template" and "Clone & Customize" action buttons to TemplatePreviewModal footer

### Template Cloning

- [x] [T118] [US5] Implement "Clone & Customize" handler that calls cloneTemplate API, then redirects to workflow builder with cloned template_id

---

## Phase 8: Polish & Production Readiness (T119-T130)

### Error Handling

- [x] [T119] Add global error handler to execute_workflow_task that catches unhandled exceptions, sets execution status to failed, logs error
- [x] [T120] Add node-level error handling in execute_node_task that creates detailed error messages (e.g., "API rate limit exceeded, retry in 60s")
- [x] [T121] Add frontend error boundaries around WorkflowCanvas and ExecutionMonitor to gracefully handle React errors
- [x] [T122] Add user-friendly error messages to LaunchWorkflowModal for validation failures (missing required params, invalid quantities)

### Loading States & Optimistic UI

- [x] [T123] [P] Add skeleton loaders to template gallery while fetchTemplates is loading
- [x] [T124] [P] Add loading spinner to LaunchWorkflowModal submit button during workflow launch
- [x] [T125] [P] Show optimistic execution in ActiveWorkflowsPanel immediately after launch (before polling confirms)
- [x] [T126] Add loading state to NodeConfigPanel while saving template changes

### Real-time Execution Visualization

- [x] [T127] Color-code workflow nodes in execution monitor based on status (gray=pending, blue=running, green=completed, red=failed, orange=skipped)
- [x] [T128] Add animated pulse effect to currently running node in ExecutionProgress component using Framer Motion
- [x] [T129] Add completion confetti animation when workflow execution completes successfully

### Documentation

- [x] [T130] Write quickstart.md with sections: Local Development Setup, Creating Your First Workflow, Using Pre-built Templates, Monitoring Executions

---

## Summary Statistics

**Total Tasks**: 130
**Completed Tasks**: 130 ✅
**Parallelizable Tasks**: 28 (marked with [P])
**User Story Breakdown**:
- Foundation (blocking): 34 tasks (T001-T034) ✅
- US3 (P1): 10 tasks (T035-T044) ✅
- US1 (P1): 31 tasks (T045-T075, includes 6 templates) ✅
- US4 (P2): 10 tasks (T082-T091) ✅
- US2 (P2): 19 tasks (T092-T110) ✅
- US5 (P3): 8 tasks (T111-T118) ✅
- Polish: 12 tasks (T119-T130) ✅

**Critical Path**: T001→T015→T020→T030→T033→T045→T054→T062→T067→T072 (Core workflow execution)

**MVP Milestone** (US1 + US3): Tasks T001-T075 (75 tasks) ✅

**File Impact**:
- New Backend Files: 10 (routers/workflows.py, routers/workflow_executions.py, services/workflow_engine.py, services/workflow_validator.py, services/node_executor.py, tasks/workflow_tasks.py, celery_app.py, seeds/workflow_templates.py, migration)
- Modified Backend Files: 2 (models.py, schemas.py, requirements.txt)
- New Frontend Files: 23 (pages, components, hooks, API client)
- Modified Frontend Files: 2 (package.json, existing document editor)
- Config Files: 2 (docker-compose.yml, docker-compose.dev.yml)

**Completion Date**: 2025-12-06
