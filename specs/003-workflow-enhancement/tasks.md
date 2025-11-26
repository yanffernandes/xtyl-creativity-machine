# Tasks: Complete Workflow System with Enhanced Node Types and Variable Passing

**Feature Branch**: `003-workflow-enhancement`
**Input**: Design documents from `/specs/003-workflow-enhancement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure required for all user stories

- [x] T001 Install ReactFlow 11.11.4 in frontend via `npm install reactflow@11.11.4` in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/`
- [x] T002 [P] Install Zustand state management via `npm install zustand` in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/`
- [x] T003 [P] Install Redis Python client via `pip install redis hiredis` for backend dependencies in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/requirements.txt`
- [x] T004 [P] Create migration file `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/migrations/009_enhance_workflow_tables.sql` with enhanced schema from data-model.md
- [ ] T005 Apply migration 009 to add workflow_templates enhancements, workflow_executions context fields, and node_outputs table

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

### Backend Foundation

- [x] T006 Create workflow schema models in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/schemas.py`: WorkflowTemplateCreate, WorkflowTemplateUpdate, WorkflowTemplateDetail, WorkflowNode, WorkflowEdge (Pydantic schemas matching contracts)
- [x] T007 Create execution schema models in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/schemas.py`: ExecutionStartRequest, ExecutionStatus, ExecutionSummary, NodeExecutionLog, ExecutionControlResponse
- [x] T008 [P] Enhance Workflow model in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/models.py` with is_recommended, version fields per data-model.md
- [x] T009 [P] Enhance WorkflowExecution model in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/models.py` with execution_context, celery_task_id, total_tokens_used, generated_document_ids fields
- [x] T010 [P] Create NodeOutput model in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/models.py` with id, execution_id, node_id, node_name, node_type, outputs (JSONB), execution_order, iteration_number
- [x] T011 Create variable resolver service `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/variable_resolver.py` with parse_variables(), resolve_variables(), detect_circular_dependencies() functions
- [x] T012 Create workflow validator service `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_validator.py` with validate_workflow_structure(), check_start_node(), check_finish_nodes(), validate_variable_references()
- [x] T013 Create Redis state manager in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/execution_state_manager.py` with save_state(), load_state(), snapshot_to_db() functions
- [x] T013a [P] Create output parser service `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/output_parser.py` with parse_json(), parse_markdown(), parse_text() for structured output field extraction

### Frontend Foundation

- [x] T014 Create workflow types in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/lib/workflow-schema.ts` matching WorkflowNode, WorkflowEdge, WorkflowDetail TypeScript interfaces from contracts
- [x] T015 Create workflow API client in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/lib/api/workflows.ts` with createWorkflow(), getWorkflow(), updateWorkflow(), deleteWorkflow(), duplicateWorkflow(), validateWorkflow()
- [x] T016 Create execution API client in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/lib/api/executions.ts` with executeWorkflow(), getExecutionStatus(), pauseExecution(), resumeExecution(), stopExecution(), retryExecution()
- [x] T017 Create Zustand workflow store in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/lib/stores/workflowStore.ts` with nodes, edges, selectedNode, addNode, removeNode, updateNodeData, addEdge, removeEdge state

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Visual Workflow Builder with All Node Types (Priority: P1) 🎯 MVP

**Goal**: Enable users to visually create workflows with drag-and-drop interface including all 8 node types

**Independent Test**: Create a simple workflow (Start → Text Gen → Finish), save it, reload the page, and verify it persists correctly

### Backend Implementation for US1

- [ ] T018 [P] [US1] Create workflows router `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py` with POST /workflows endpoint (create workflow)
- [ ] T019 [P] [US1] Add GET /workflows endpoint with workspace_id, project_id, category filters in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [ ] T020 [P] [US1] Add GET /workflows/{workflow_id} endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [ ] T021 [P] [US1] Add PUT /workflows/{workflow_id} endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [ ] T022 [P] [US1] Add DELETE /workflows/{workflow_id} endpoint with active execution check in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [ ] T023 [P] [US1] Add POST /workflows/{workflow_id}/duplicate endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [ ] T024 [US1] Add POST /workflows/{workflow_id}/validate endpoint calling workflow_validator service in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [ ] T025 [US1] Register workflows router in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/main.py` with app.include_router(workflows.router, prefix="/workflows", tags=["workflows"])

### Frontend UI Components for US1

- [ ] T026 [P] [US1] Create page `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/page.tsx` listing workflows with create button
- [ ] T027 [P] [US1] Create page `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/[workflowId]/page.tsx` for visual workflow editor
- [ ] T028 [US1] Create WorkflowCanvas component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx` wrapping ReactFlow with custom controls
- [ ] T029 [US1] Create NodePalette sidebar `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/NodePalette.tsx` with draggable node types organized by category (Control, AI Generation, Data)

### Node Components for US1

- [ ] T030 [P] [US1] Create StartNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/StartNode.tsx` with input variables configuration panel
- [ ] T031 [P] [US1] Create FinishNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/FinishNode.tsx` with save options (saveToProject, documentTitle, notifyUser)
- [ ] T032 [P] [US1] Create TextGenerationNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/TextGenerationNode.tsx` with prompt, model selector, temperature, maxTokens, outputFormat (Text/JSON/Markdown) fields
- [ ] T033 [P] [US1] Create ImageGenerationNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ImageGenerationNode.tsx` with prompt, model selector, size, style fields
- [ ] T034 [P] [US1] Create ConditionalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ConditionalNode.tsx` with condition field and true/false output handles
- [ ] T035 [P] [US1] Create LoopNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/LoopNode.tsx` with iterations, condition, maxIterations fields
- [ ] T036 [P] [US1] Create ContextRetrievalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ContextRetrievalNode.tsx` with filters (status, asset_type, tags), maxResults
- [ ] T037 [P] [US1] Create ProcessingNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ProcessingNode.tsx` with prompt, model selector, outputFormat (Text/JSON/Markdown) fields
- [ ] T038 [US1] Register all custom node types in ReactFlow configuration in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx` nodeTypes object

### Workflow Controls for US1

- [ ] T039 [US1] Add workflow save button with validation in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/[workflowId]/page.tsx` calling workflows API
- [ ] T040 [US1] Create WorkflowValidator component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowValidator.tsx` showing inline errors with fix suggestions
- [ ] T041 [US1] Add ReactFlow zoom/pan controls, minimap in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [ ] T042 [US1] Implement node drag-and-drop from palette with ghost preview in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/NodePalette.tsx`
- [ ] T043 [US1] Add connection validation (prevent invalid connections like Loop output to Start input) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx` onConnect handler

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create, edit, and save workflows with all node types

---

## Phase 4: User Story 2 - Standardized Variable Passing Between Nodes (Priority: P1) 🎯 MVP

**Goal**: Implement {{variable}} syntax with autocomplete for seamless data passing between nodes

**Independent Test**: Create workflow (Text Gen "headline" → Text Gen "body" with {{headline.content}}), execute it, verify second node receives first node's output

### Backend Implementation for US2

- [ ] T044 [US2] Implement parse_variables() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/variable_resolver.py` using regex `\{\{([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\}\}` to extract dependencies
- [ ] T045 [US2] Implement resolve_variables() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/variable_resolver.py` to replace {{variable}} with actual values from execution_context
- [ ] T046 [US2] Implement detect_circular_dependencies() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/variable_resolver.py` using topological sort to detect cycles
- [ ] T047 [US2] Add variable validation to workflow_validator in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_validator.py` checking all {{references}} point to existing nodes
- [ ] T048 [US2] Create workflow executor service `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py` with execute_node(), build_execution_order() using topological sort

### Frontend Variable Autocomplete for US2

- [ ] T049 [US2] Create VariableAutocomplete component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/VariableAutocomplete.tsx` detecting `{{` input and showing dropdown
- [ ] T050 [US2] Create useVariableAutocomplete hook `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/hooks/useVariableAutocomplete.ts` scanning upstream nodes for available variables including parsed fields from structured outputs (JSON/Markdown)
- [ ] T051 [US2] Integrate VariableAutocomplete into TextGenerationNode prompt field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/TextGenerationNode.tsx`
- [ ] T052 [P] [US2] Integrate VariableAutocomplete into ImageGenerationNode prompt field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ImageGenerationNode.tsx`
- [ ] T053 [P] [US2] Integrate VariableAutocomplete into ProcessingNode prompt field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ProcessingNode.tsx`
- [ ] T054 [P] [US2] Integrate VariableAutocomplete into ConditionalNode condition field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ConditionalNode.tsx`
- [ ] T055 [P] [US2] Integrate VariableAutocomplete into FinishNode documentTitle field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/FinishNode.tsx`

### Variable Inspector for US2

- [ ] T056 [US2] Create VariableInspector panel `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/VariableInspector.tsx` showing all available variables and their current values during execution
- [ ] T057 [US2] Add variable highlighting in node configuration panels showing resolved values in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - workflows can pass data between nodes using {{variable}} syntax

---

## Phase 5: User Story 3 - AI Model Selection with OpenRouter Integration (Priority: P2)

**Goal**: Filter AI models by capability (text/image) with recommended models sorted first

**Independent Test**: Open Text Gen node model selector, verify only text models appear with recommended badges, select model, verify it persists

### Backend Model Discovery for US3

- [ ] T058 [US3] Create GET /workflows/models endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py` with type parameter (text/image)
- [ ] T059 [US3] Implement get_available_models() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/model_service.py` querying OpenRouter /models endpoint
- [ ] T060 [US3] Add model filtering by supported_modalities field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/model_service.py` (text: "chat", image: "image")
- [ ] T061 [US3] Implement Redis caching for model list (1 hour TTL) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/model_service.py`
- [ ] T062 [US3] Add recommended models list to database (admin-curated) with is_recommended flag in migration or seed script

### Frontend Model Selector for US3

- [ ] T063 [US3] Create ModelSelector component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ModelSelector.tsx` with recommended badge and search
- [ ] T064 [P] [US3] Integrate ModelSelector into TextGenerationNode in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/TextGenerationNode.tsx` with type="text"
- [ ] T065 [P] [US3] Integrate ModelSelector into ImageGenerationNode in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ImageGenerationNode.tsx` with type="image"
- [ ] T066 [P] [US3] Integrate ModelSelector into ProcessingNode in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ProcessingNode.tsx` with type="text"
- [ ] T067 [US3] Display selected model name in node visual representation (node label) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [ ] T068 [US3] Add model error handling in execution with fallback suggestions in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`

**Checkpoint**: Model selection works correctly - only appropriate models shown, recommended models prioritized

---

## Phase 6: User Story 7 - Workflow-Project-Workspace Hierarchy (Priority: P2)

**Goal**: Support workspace-level templates and project-specific workflows with proper hierarchy

**Independent Test**: Create workspace template, instantiate it for specific project, execute it, verify outputs saved to correct project

### Backend Hierarchy Support for US7

- [ ] T069 [US7] Add GET /workflows/templates endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py` with workspace_id, category, is_recommended filters
- [ ] T070 [US7] Add template instantiation logic in duplicate endpoint to create project-bound copy in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [ ] T071 [US7] Update workflow create endpoint to support is_template flag and null project_id for workspace templates in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [ ] T072 [US7] Add project context injection in ContextRetrievalNode executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [ ] T073 [US7] Add document saving to correct project in FinishNode executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`

### Frontend Template Library for US7

- [ ] T074 [US7] Create template library page `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/templates/page.tsx` showing system and workspace templates
- [ ] T075 [US7] Add template instantiation flow with project selection modal in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/templates/page.tsx`
- [ ] T076 [US7] Add workspace/project toggle in workflow list in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/page.tsx`
- [ ] T077 [US7] Add project context indicator in workflow editor header in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/[workflowId]/page.tsx`

**Checkpoint**: Workflow hierarchy works - templates reusable across projects, project workflows use correct context

---

## Phase 7: User Story 4 - Context Retrieval and Processing Nodes (Priority: P2)

**Goal**: Enable context-aware workflows with document retrieval and intermediate AI processing

**Independent Test**: Create workflow with ContextRetrievalNode fetching brand docs → ProcessingNode extracting colors → TextGenNode using colors, verify no unwanted documents created

### Backend Context & Processing for US4

- [ ] T078 [US4] Create execute_context_retrieval_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` querying documents with filters
- [ ] T079 [US4] Add filter support (status, asset_type, tags, maxResults) in context retrieval executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [ ] T080 [US4] Format retrieved documents as variable output (id, title, content, metadata) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [ ] T081 [US4] Create execute_processing_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` calling AI API without saving document
- [ ] T082 [US4] Integrate OutputParser service for structured output parsing (JSON/Markdown formats) in processing node executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [ ] T083 [US4] Store processing results in NodeOutput with result field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`

### Frontend Context Configuration for US4

- [ ] T084 [US4] Add filter configuration UI in ContextRetrievalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ContextRetrievalNode.tsx`
- [ ] T085 [US4] Add output format selector (JSON, text) in ProcessingNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ProcessingNode.tsx`
- [ ] T086 [US4] Show retrieved document count in ContextRetrievalNode during execution in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ContextRetrievalNode.tsx`

**Checkpoint**: Context-aware workflows functional - documents retrieved correctly, processing nodes don't create unwanted saves

---

## Phase 8: User Story 5 - Loop Execution for Batch Generation (Priority: P3)

**Goal**: Support fixed and conditional loop iterations for batch content generation

**Independent Test**: Create workflow with LoopNode (3 iterations) → TextGenNode with {{loop.iteration}}, execute, verify 3 documents created with different iteration numbers

### Backend Loop Implementation for US5

- [ ] T087 [US5] Implement loop context stack management in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py` (push/pop loop state)
- [ ] T088 [US5] Add iteration counter {{loop.iteration}} variable in execution context in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/variable_resolver.py`
- [ ] T089 [US5] Implement fixed iteration loops (iterations field) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`
- [ ] T090 [US5] Implement conditional exit loops (condition field) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`
- [ ] T091 [US5] Add maxIterations safety limit (default 100) in loop executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`
- [ ] T092 [US5] Tag generated documents with iteration_number in metadata in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` FinishNode
- [ ] T093 [US5] Store NodeOutputs with iteration_number field for loop nodes in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`

### Frontend Loop Controls for US5

- [ ] T094 [US5] Add iteration count display during loop execution in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`
- [ ] T095 [US5] Show progress bar for loop iterations in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`
- [ ] T096 [US5] Add loop configuration panel in LoopNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/LoopNode.tsx` (iterations vs condition toggle)

**Checkpoint**: Loops work correctly - batch generation produces multiple outputs, iteration counter accessible

---

## Phase 9: User Story 6 - Conditional Logic for Branching Workflows (Priority: P3)

**Goal**: Enable conditional branching based on node outputs with true/false paths

**Independent Test**: Create workflow with ConditionalNode checking word_count > 10, two paths (true → Finish, false → retry), execute with both scenarios, verify correct path taken

### Backend Conditional Implementation for US6

- [ ] T097 [US6] Implement evaluate_condition() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/conditional_evaluator.py` using Python eval() in sandboxed context
- [ ] T098 [US6] Add safe globals restriction (len, str, int, float only) in conditional evaluator in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/conditional_evaluator.py`
- [ ] T099 [US6] Implement path selection logic in workflow executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py` (follow true/false sourceHandle)
- [ ] T100 [US6] Add condition validation during workflow validation in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_validator.py`
- [ ] T101 [US6] Store conditional path taken in execution_context in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`
- [ ] T102 [US6] Default to false path on evaluation error in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/conditional_evaluator.py`

### Frontend Conditional UI for US6

- [ ] T103 [US6] Add true/false output handles with labels in ConditionalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ConditionalNode.tsx`
- [ ] T104 [US6] Add condition syntax helper with examples in ConditionalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ConditionalNode.tsx`
- [ ] T105 [US6] Highlight active path during execution in ExecutionMonitor `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`

**Checkpoint**: Conditional branching works - workflows route correctly based on conditions, unused paths skipped

---

## Phase 10: Execution System (Enables Workflow Running)

**Goal**: Implement asynchronous workflow execution with real-time progress monitoring

**Dependencies**: Requires US1 (workflow structure), US2 (variable resolution) to function

### Backend Execution Engine

- [ ] T106 Create executions router `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py` with POST /workflows/{workflow_id}/execute endpoint
- [ ] T107 [P] Add GET /workflows/executions/{execution_id} endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [ ] T108 [P] Add GET /workflows/executions endpoint with filters (workspace_id, project_id, workflow_id, status) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [ ] T109 [P] Add POST /workflows/executions/{execution_id}/pause endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [ ] T110 [P] Add POST /workflows/executions/{execution_id}/resume endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [ ] T111 [P] Add POST /workflows/executions/{execution_id}/stop endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [ ] T112 [P] Add POST /workflows/executions/{execution_id}/retry endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [ ] T113 [P] Add GET /workflows/executions/{execution_id}/logs endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [ ] T114 Add GET /workflows/executions/{execution_id}/stream SSE endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [ ] T115 Register executions router in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/main.py`

### Node Executors

- [ ] T116 [P] Create execute_start_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` returning input variables as outputs
- [ ] T117 [P] Create execute_text_generation_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` calling OpenRouter API with resolved prompt, integrate OutputParser for structured field extraction based on outputFormat
- [ ] T118 [P] Create execute_image_generation_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` calling OpenRouter image API and uploading to MinIO
- [ ] T119 [P] Create execute_finish_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` creating Documents and DocumentAttachments
- [ ] T120 Create Celery task in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/tasks/workflow_tasks.py` wrapping workflow_executor.execute_workflow()
- [ ] T121 Implement execution state snapshots to PostgreSQL after each node in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/execution_state_manager.py`
- [ ] T122 Add progress_percent calculation (nodes_completed / total_nodes * 100) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`

### Frontend Execution Monitoring

- [ ] T123 Create ExecutionMonitor component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx` with real-time progress display
- [ ] T124 Create useWorkflowExecution hook `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/hooks/useWorkflowExecution.ts` connecting to SSE stream with EventSource
- [ ] T125 Add execution controls (Run, Pause, Resume, Stop) in workflow editor `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/[workflowId]/page.tsx`
- [ ] T126 Add node execution status indicators (pending, running, completed, failed) in WorkflowCanvas `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [ ] T127 Add animated pulsing border on currently executing node in WorkflowCanvas `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [ ] T128 Add execution history panel showing past runs in workflows list page `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/page.tsx`

**Checkpoint**: Workflows can execute end-to-end with real-time monitoring and control

---

## Phase 11: Polish & Integration

**Purpose**: Final improvements that affect multiple user stories

- [ ] T129 [P] Apply Ethereal Blue design system to all workflow components (glassmorphism, blue accents, soft corners) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/`
- [ ] T130 [P] Add Framer Motion animations to node palette, modals, and execution transitions in workflow components
- [ ] T131 [P] Add error handling with user-friendly messages for all API calls in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/lib/api/workflows.ts` and executions.ts
- [ ] T132 [P] Add loading states and skeletons for workflow editor and execution monitor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/`
- [ ] T133 Add confetti animation on workflow execution success in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`
- [ ] T134 Add workflow canvas lazy loading for large workflows (50+ nodes) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [ ] T135 Add accessibility (WCAG AA) improvements: keyboard navigation, ARIA labels, focus management in all workflow components
- [ ] T136 Add cost tracking display showing total_cost and total_tokens_used in ExecutionMonitor `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`
- [ ] T137 [P] Add execution retry logic with exponential backoff for AI API timeouts in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [ ] T138 [P] Add database indexes for performance (workflow_templates.workspace_id, workflow_executions.status, node_outputs.execution_order) per data-model.md
- [ ] T139 Validate quickstart.md instructions by following the developer guide step-by-step
- [ ] T140 Add workflow examples/seed data (3 system templates: "Blog Post Generator", "Social Media Campaign", "Brand Analysis") in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/seed_workflow_templates.py`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 (Visual Builder) - No dependencies on other stories
  - US2 (Variable Passing) - Can start in parallel with US1, integrates after US1 completes
  - US3 (Model Selection) - Depends on US1 (node components exist)
  - US7 (Hierarchy) - Depends on US1 (workflow CRUD exists)
  - US4 (Context/Processing) - Depends on US1, US2 (execution system needs variables)
  - US5 (Loops) - Depends on US1, US2 (execution system needs variables)
  - US6 (Conditionals) - Depends on US1, US2 (execution system needs variables)
- **Execution System (Phase 10)**: Depends on US1 + US2 minimum (workflow structure + variables)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Integrates with US1 components
- **User Story 3 (P2)**: Depends on US1 completion (node components must exist)
- **User Story 7 (P2)**: Depends on US1 completion (workflow CRUD must exist)
- **User Story 4 (P2)**: Depends on US1 + US2 (needs execution system with variables)
- **User Story 5 (P3)**: Depends on US1 + US2 (needs execution system with variables)
- **User Story 6 (P3)**: Depends on US1 + US2 (needs execution system with variables)

### Parallel Opportunities

**Within Phase 1 (Setup)**:
- T002, T003, T004 can run in parallel (different dependencies)

**Within Phase 2 (Foundational)**:
- Backend: T008, T009, T010 (models) can run in parallel
- Frontend: T014, T015, T016 (API clients and types) can run in parallel after backend schemas

**Within Phase 3 (US1)**:
- Backend endpoints: T018-T024 can run in parallel (different endpoints in same router)
- Frontend pages: T026, T027 can run in parallel
- Node components: T030-T037 can all run in parallel (independent components)

**Within Phase 4 (US2)**:
- Frontend integrations: T051-T055 can run in parallel (different node components)

**Within Phase 5 (US3)**:
- Frontend integrations: T064-T066 can run in parallel (different node components)

**Within Phase 10 (Execution)**:
- Backend endpoints: T107-T113 can run in parallel (different endpoints)
- Node executors: T116-T119 can run in parallel (independent executors)

**Within Phase 11 (Polish)**:
- T129, T130, T131, T132, T137, T138 can all run in parallel (different concerns)

---

## Parallel Example: User Story 1 Node Components

```bash
# All node components can be developed simultaneously by different developers:
Task T030: "Create StartNode component"
Task T031: "Create FinishNode component"
Task T032: "Create TextGenerationNode component"
Task T033: "Create ImageGenerationNode component"
Task T034: "Create ConditionalNode component"
Task T035: "Create LoopNode component"
Task T036: "Create ContextRetrievalNode component"
Task T037: "Create ProcessingNode component"

# These 8 tasks are completely independent - no shared files
```

---

## Implementation Strategy

### MVP First (Minimum Viable Workflow System)

**US1 + US2 + Execution = Core Workflow System**

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T017) - CRITICAL BLOCKER
3. Complete Phase 3: US1 - Visual Builder (T018-T043)
4. Complete Phase 4: US2 - Variable Passing (T044-T057)
5. Complete Phase 10: Execution System (T106-T128)
6. **STOP and VALIDATE**: Test complete workflow creation, variable passing, and execution
7. Deploy MVP with core 3 node types (Start, Text Gen, Finish)

This gives a functional workflow system that can create, edit, and execute basic multi-step AI workflows.

### Incremental Delivery

1. **MVP** (US1 + US2 + Execution): Basic workflow creation and execution
2. **+US3** (Model Selection): Enhanced model control and quality
3. **+US7** (Hierarchy): Template reuse and organization
4. **+US4** (Context/Processing): Context-aware intelligent workflows
5. **+US5** (Loops): Batch generation capabilities
6. **+US6** (Conditionals): Adaptive decision-making workflows

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 3+ developers after Foundational phase completes:

- **Developer A**: US1 (Visual Builder) - T018-T043
- **Developer B**: US2 (Variable Passing) - T044-T057 (integrates with US1 after T038)
- **Developer C**: Phase 10 (Execution System) - T106-T128 (starts after US1 + US2 basics ready)

Then proceed to P2 and P3 features in parallel.

---

## Notes

- [P] tasks = different files, no dependencies within the same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- NO TEST TASKS included (not explicitly requested in spec.md)
- Exact file paths included for every implementation task
- Design system (Ethereal Blue + Liquid Glass) applied in Phase 11 polish
