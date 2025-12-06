# Tasks: Complete Workflow System with Enhanced Node Types and Variable Passing

**Feature Branch**: `003-workflow-enhancement`
**Input**: Design documents from `/specs/003-workflow-enhancement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Status**: ✅ COMPLETED

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
- [x] T005 Apply migration 009 to add workflow_templates enhancements, workflow_executions context fields, and node_outputs table

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

- [x] T018 [P] [US1] Create workflows router `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py` with POST /workflows endpoint (create workflow)
- [x] T019 [P] [US1] Add GET /workflows endpoint with workspace_id, project_id, category filters in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [x] T020 [P] [US1] Add GET /workflows/{workflow_id} endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [x] T021 [P] [US1] Add PUT /workflows/{workflow_id} endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [x] T022 [P] [US1] Add DELETE /workflows/{workflow_id} endpoint with active execution check in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [x] T023 [P] [US1] Add POST /workflows/{workflow_id}/duplicate endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [x] T024 [US1] Add POST /workflows/{workflow_id}/validate endpoint calling workflow_validator service in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [x] T025 [US1] Register workflows router in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/main.py` with app.include_router(workflows.router, prefix="/workflows", tags=["workflows"])

### Frontend UI Components for US1

- [x] T026 [P] [US1] Create page `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/page.tsx` listing workflows with create button
- [x] T027 [P] [US1] Create page `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/[workflowId]/page.tsx` for visual workflow editor
- [x] T028 [US1] Create WorkflowCanvas component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx` wrapping ReactFlow with custom controls
- [x] T029 [US1] Create NodePalette sidebar `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/NodePalette.tsx` with draggable node types organized by category (Control, AI Generation, Data)

### Node Components for US1

- [x] T030 [P] [US1] Create StartNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/StartNode.tsx` with input variables configuration panel
- [x] T031 [P] [US1] Create FinishNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/FinishNode.tsx` with save options (saveToProject, documentTitle, notifyUser)
- [x] T032 [P] [US1] Create TextGenerationNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/TextGenerationNode.tsx` with prompt, model selector, temperature, maxTokens, outputFormat (Text/JSON/Markdown) fields
- [x] T033 [P] [US1] Create ImageGenerationNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ImageGenerationNode.tsx` with prompt, model selector, size, style fields
- [x] T034 [P] [US1] Create ConditionalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ConditionalNode.tsx` with condition field and true/false output handles
- [x] T035 [P] [US1] Create LoopNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/LoopNode.tsx` with iterations, condition, maxIterations fields
- [x] T036 [P] [US1] Create ContextRetrievalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ContextRetrievalNode.tsx` with filters (status, asset_type, tags), maxResults
- [x] T037 [P] [US1] Create ProcessingNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ProcessingNode.tsx` with prompt, model selector, outputFormat (Text/JSON/Markdown) fields
- [x] T038 [US1] Register all custom node types in ReactFlow configuration in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx` nodeTypes object

### Workflow Controls for US1

- [x] T039 [US1] Add workflow save button with validation in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/[workflowId]/page.tsx` calling workflows API
- [x] T040 [US1] Create WorkflowValidator component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowValidator.tsx` showing inline errors with fix suggestions
- [x] T041 [US1] Add ReactFlow zoom/pan controls, minimap in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [x] T042 [US1] Implement node drag-and-drop from palette with ghost preview in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/NodePalette.tsx`
- [x] T043 [US1] Add connection validation (prevent invalid connections like Loop output to Start input) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx` onConnect handler

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create, edit, and save workflows with all node types

---

## Phase 4: User Story 2 - Standardized Variable Passing Between Nodes (Priority: P1) 🎯 MVP

**Goal**: Implement {{variable}} syntax with autocomplete for seamless data passing between nodes

**Independent Test**: Create workflow (Text Gen "headline" → Text Gen "body" with {{headline.content}}), execute it, verify second node receives first node's output

### Backend Implementation for US2

- [x] T044 [US2] Implement parse_variables() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/variable_resolver.py` using regex `\{\{([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\}\}` to extract dependencies
- [x] T045 [US2] Implement resolve_variables() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/variable_resolver.py` to replace {{variable}} with actual values from execution_context
- [x] T046 [US2] Implement detect_circular_dependencies() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/variable_resolver.py` using topological sort to detect cycles
- [x] T047 [US2] Add variable validation to workflow_validator in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_validator.py` checking all {{references}} point to existing nodes
- [x] T048 [US2] Create workflow executor service `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py` with execute_node(), build_execution_order() using topological sort

### Frontend Variable Autocomplete for US2

- [x] T049 [US2] Create VariableAutocomplete component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/VariableAutocomplete.tsx` detecting `{{` input and showing dropdown
- [x] T050 [US2] Create useVariableAutocomplete hook `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/hooks/useVariableAutocomplete.ts` scanning upstream nodes for available variables including parsed fields from structured outputs (JSON/Markdown)
- [x] T051 [US2] Integrate VariableAutocomplete into TextGenerationNode prompt field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/TextGenerationNode.tsx`
- [x] T052 [P] [US2] Integrate VariableAutocomplete into ImageGenerationNode prompt field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ImageGenerationNode.tsx`
- [x] T053 [P] [US2] Integrate VariableAutocomplete into ProcessingNode prompt field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ProcessingNode.tsx`
- [x] T054 [P] [US2] Integrate VariableAutocomplete into ConditionalNode condition field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ConditionalNode.tsx`
- [x] T055 [P] [US2] Integrate VariableAutocomplete into FinishNode documentTitle field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/FinishNode.tsx`

### Variable Inspector for US2

- [x] T056 [US2] Create VariableInspector panel `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/VariableInspector.tsx` showing all available variables and their current values during execution
- [x] T057 [US2] Add variable highlighting in node configuration panels showing resolved values in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - workflows can pass data between nodes using {{variable}} syntax

---

## Phase 5: User Story 3 - AI Model Selection with OpenRouter Integration (Priority: P2)

**Goal**: Filter AI models by capability (text/image) with recommended models sorted first

**Independent Test**: Open Text Gen node model selector, verify only text models appear with recommended badges, select model, verify it persists

### Backend Model Discovery for US3

- [x] T058 [US3] Create GET /workflows/models endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py` with type parameter (text/image)
- [x] T059 [US3] Implement get_available_models() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/model_service.py` querying OpenRouter /models endpoint
- [x] T060 [US3] Add model filtering by supported_modalities field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/model_service.py` (text: "chat", image: "image")
- [x] T061 [US3] Implement Redis caching for model list (1 hour TTL) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/model_service.py`
- [x] T062 [US3] Add recommended models list to database (admin-curated) with is_recommended flag in migration or seed script

### Frontend Model Selector for US3

- [x] T063 [US3] Create ModelSelector component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ModelSelector.tsx` with recommended badge and search
- [x] T064 [P] [US3] Integrate ModelSelector into TextGenerationNode in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/TextGenerationNode.tsx` with type="text"
- [x] T065 [P] [US3] Integrate ModelSelector into ImageGenerationNode in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ImageGenerationNode.tsx` with type="image"
- [x] T066 [P] [US3] Integrate ModelSelector into ProcessingNode in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ProcessingNode.tsx` with type="text"
- [x] T067 [US3] Display selected model name in node visual representation (node label) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [x] T068 [US3] Add model error handling in execution with fallback suggestions in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`

**Checkpoint**: Model selection works correctly - only appropriate models shown, recommended models prioritized

---

## Phase 6: User Story 7 - Workflow-Project-Workspace Hierarchy (Priority: P2)

**Goal**: Support workspace-level templates and project-specific workflows with proper hierarchy

**Independent Test**: Create workspace template, instantiate it for specific project, execute it, verify outputs saved to correct project

### Backend Hierarchy Support for US7

- [x] T069 [US7] Add GET /workflows/templates endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py` with workspace_id, category, is_recommended filters
- [x] T070 [US7] Add template instantiation logic in duplicate endpoint to create project-bound copy in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [x] T071 [US7] Update workflow create endpoint to support is_template flag and null project_id for workspace templates in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/workflows.py`
- [x] T072 [US7] Add project context injection in ContextRetrievalNode executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [x] T073 [US7] Add document saving to correct project in FinishNode executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`

### Frontend Template Library for US7

- [x] T074 [US7] Create template library page `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/templates/page.tsx` showing system and workspace templates
- [x] T075 [US7] Add template instantiation flow with project selection modal in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/templates/page.tsx`
- [x] T076 [US7] Add workspace/project toggle in workflow list in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/page.tsx`
- [x] T077 [US7] Add project context indicator in workflow editor header in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/[workflowId]/page.tsx`

**Checkpoint**: Workflow hierarchy works - templates reusable across projects, project workflows use correct context

---

## Phase 7: User Story 4 - Context Retrieval and Processing Nodes (Priority: P2)

**Goal**: Enable context-aware workflows with document retrieval and intermediate AI processing

**Independent Test**: Create workflow with ContextRetrievalNode fetching brand docs → ProcessingNode extracting colors → TextGenNode using colors, verify no unwanted documents created

### Backend Context & Processing for US4

- [x] T078 [US4] Create execute_context_retrieval_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` querying documents with filters
- [x] T079 [US4] Add filter support (status, asset_type, tags, maxResults) in context retrieval executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [x] T080 [US4] Format retrieved documents as variable output (id, title, content, metadata) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [x] T081 [US4] Create execute_processing_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` calling AI API without saving document
- [x] T082 [US4] Integrate OutputParser service for structured output parsing (JSON/Markdown formats) in processing node executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [x] T083 [US4] Store processing results in NodeOutput with result field in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`

### Frontend Context Configuration for US4

- [x] T084 [US4] Add filter configuration UI in ContextRetrievalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ContextRetrievalNode.tsx`
- [x] T085 [US4] Add output format selector (JSON, text) in ProcessingNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ProcessingNode.tsx`
- [x] T086 [US4] Show retrieved document count in ContextRetrievalNode during execution in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ContextRetrievalNode.tsx`

**Checkpoint**: Context-aware workflows functional - documents retrieved correctly, processing nodes don't create unwanted saves

---

## Phase 8: User Story 5 - Loop Execution for Batch Generation (Priority: P3)

**Goal**: Support fixed and conditional loop iterations for batch content generation

**Independent Test**: Create workflow with LoopNode (3 iterations) → TextGenNode with {{loop.iteration}}, execute, verify 3 documents created with different iteration numbers

### Backend Loop Implementation for US5

- [x] T087 [US5] Implement loop context stack management in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py` (push/pop loop state)
- [x] T088 [US5] Add iteration counter {{loop.iteration}} variable in execution context in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/variable_resolver.py`
- [x] T089 [US5] Implement fixed iteration loops (iterations field) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`
- [x] T090 [US5] Implement conditional exit loops (condition field) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`
- [x] T091 [US5] Add maxIterations safety limit (default 100) in loop executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`
- [x] T092 [US5] Tag generated documents with iteration_number in metadata in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` FinishNode
- [x] T093 [US5] Store NodeOutputs with iteration_number field for loop nodes in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`

### Frontend Loop Controls for US5

- [x] T094 [US5] Add iteration count display during loop execution in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`
- [x] T095 [US5] Show progress bar for loop iterations in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`
- [x] T096 [US5] Add loop configuration panel in LoopNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/LoopNode.tsx` (iterations vs condition toggle)

**Checkpoint**: Loops work correctly - batch generation produces multiple outputs, iteration counter accessible

---

## Phase 9: User Story 6 - Conditional Logic for Branching Workflows (Priority: P3)

**Goal**: Enable conditional branching based on node outputs with true/false paths

**Independent Test**: Create workflow with ConditionalNode checking word_count > 10, two paths (true → Finish, false → retry), execute with both scenarios, verify correct path taken

### Backend Conditional Implementation for US6

- [x] T097 [US6] Implement evaluate_condition() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/conditional_evaluator.py` using Python eval() in sandboxed context
- [x] T098 [US6] Add safe globals restriction (len, str, int, float only) in conditional evaluator in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/conditional_evaluator.py`
- [x] T099 [US6] Implement path selection logic in workflow executor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py` (follow true/false sourceHandle)
- [x] T100 [US6] Add condition validation during workflow validation in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_validator.py`
- [x] T101 [US6] Store conditional path taken in execution_context in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`
- [x] T102 [US6] Default to false path on evaluation error in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/conditional_evaluator.py`

### Frontend Conditional UI for US6

- [x] T103 [US6] Add true/false output handles with labels in ConditionalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ConditionalNode.tsx`
- [x] T104 [US6] Add condition syntax helper with examples in ConditionalNode component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/nodes/ConditionalNode.tsx`
- [x] T105 [US6] Highlight active path during execution in ExecutionMonitor `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`

**Checkpoint**: Conditional branching works - workflows route correctly based on conditions, unused paths skipped

---

## Phase 10: Execution System (Enables Workflow Running)

**Goal**: Implement asynchronous workflow execution with real-time progress monitoring

**Dependencies**: Requires US1 (workflow structure), US2 (variable resolution) to function

### Backend Execution Engine

- [x] T106 Create executions router `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py` with POST /workflows/{workflow_id}/execute endpoint
- [x] T107 [P] Add GET /workflows/executions/{execution_id} endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [x] T108 [P] Add GET /workflows/executions endpoint with filters (workspace_id, project_id, workflow_id, status) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [x] T109 [P] Add POST /workflows/executions/{execution_id}/pause endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [x] T110 [P] Add POST /workflows/executions/{execution_id}/resume endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [x] T111 [P] Add POST /workflows/executions/{execution_id}/stop endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [x] T112 [P] Add POST /workflows/executions/{execution_id}/retry endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [x] T113 [P] Add GET /workflows/executions/{execution_id}/logs endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [x] T114 Add GET /workflows/executions/{execution_id}/stream SSE endpoint in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/routers/executions.py`
- [x] T115 Register executions router in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/main.py`

### Node Executors

- [x] T116 [P] Create execute_start_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` returning input variables as outputs
- [x] T117 [P] Create execute_text_generation_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` calling OpenRouter API with resolved prompt, integrate OutputParser for structured field extraction based on outputFormat
- [x] T118 [P] Create execute_image_generation_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` calling OpenRouter image API and uploading to MinIO
- [x] T119 [P] Create execute_finish_node() in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py` creating Documents and DocumentAttachments
- [x] T120 Create Celery task in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/tasks/workflow_tasks.py` wrapping workflow_executor.execute_workflow()
- [x] T121 Implement execution state snapshots to PostgreSQL after each node in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/execution_state_manager.py`
- [x] T122 Add progress_percent calculation (nodes_completed / total_nodes * 100) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/workflow_executor.py`

### Frontend Execution Monitoring

- [x] T123 Create ExecutionMonitor component `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx` with real-time progress display
- [x] T124 Create useWorkflowExecution hook `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/hooks/useWorkflowExecution.ts` connecting to SSE stream with EventSource
- [x] T125 Add execution controls (Run, Pause, Resume, Stop) in workflow editor `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/[workflowId]/page.tsx`
- [x] T126 Add node execution status indicators (pending, running, completed, failed) in WorkflowCanvas `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [x] T127 Add animated pulsing border on currently executing node in WorkflowCanvas `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [x] T128 Add execution history panel showing past runs in workflows list page `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/page.tsx`

**Checkpoint**: Workflows can execute end-to-end with real-time monitoring and control

---

## Phase 11: Polish & Integration

**Purpose**: Final improvements that affect multiple user stories

- [x] T129 [P] Apply Ethereal Blue design system to all workflow components (glassmorphism, blue accents, soft corners) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/`
- [x] T130 [P] Add Framer Motion animations to node palette, modals, and execution transitions in workflow components
- [x] T131 [P] Add error handling with user-friendly messages for all API calls in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/lib/api/workflows.ts` and executions.ts
- [x] T132 [P] Add loading states and skeletons for workflow editor and execution monitor in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/app/workspace/[id]/workflows/`
- [x] T133 Add confetti animation on workflow execution success in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`
- [x] T134 Add workflow canvas lazy loading for large workflows (50+ nodes) in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/WorkflowCanvas.tsx`
- [x] T135 Add accessibility (WCAG AA) improvements: keyboard navigation, ARIA labels, focus management in all workflow components
- [x] T136 Add cost tracking display showing total_cost and total_tokens_used in ExecutionMonitor `/Users/yanfernandes/GitHub/xtyl-creativity-machine/frontend/src/components/workflow/ExecutionMonitor.tsx`
- [x] T137 [P] Add execution retry logic with exponential backoff for AI API timeouts in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/services/node_executor.py`
- [x] T138 [P] Add database indexes for performance (workflow_templates.workspace_id, workflow_executions.status, node_outputs.execution_order) per data-model.md
- [x] T139 Validate quickstart.md instructions by following the developer guide step-by-step
- [x] T140 Add workflow examples/seed data (3 system templates: "Blog Post Generator", "Social Media Campaign", "Brand Analysis") in `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/seed_workflow_templates.py`

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

---

## Summary

**Total Tasks**: 140
**Completed Tasks**: 140 ✅

| Phase | Tasks | Status |
|-------|-------|--------|
| Setup | 5 | ✅ Complete |
| Foundational | 13 | ✅ Complete |
| US1 - Visual Builder | 26 | ✅ Complete |
| US2 - Variable Passing | 14 | ✅ Complete |
| US3 - Model Selection | 11 | ✅ Complete |
| US7 - Hierarchy | 9 | ✅ Complete |
| US4 - Context/Processing | 9 | ✅ Complete |
| US5 - Loops | 10 | ✅ Complete |
| US6 - Conditionals | 9 | ✅ Complete |
| Execution System | 22 | ✅ Complete |
| Polish | 12 | ✅ Complete |

**Completion Date**: 2025-12-06

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
