# Feature Specification: Complete Workflow System with Enhanced Node Types and Variable Passing

**Feature Branch**: `003-workflow-enhancement`
**Created**: 2025-11-25
**Status**: Draft
**Input**: User description: "Vamos criar uma nova atualização visando finalizar o sistema de workflows. Então a gente tem que atualizar o sistema de criação de fluxos e edição de fluxos para que funcione com todos os nós. Então tem um nó de criação de texto, um nó de criação de imagem. É importante ver como é que vai ser o formato de saída para que eu possa jogar uma variável de um para o outro, talvez padroneizar um jeito. Não sei, preciso de mais clareza nisso tudo. Então como é que funciona isso, como é que funciona suas conexões, como é que eu pego a variável de um para o outro. Ajustar visualmente tanto a barra lateral onde eu seleciono os nós, como todos os nós, então o nó start, o nó finalizado, o nó de condicional, né, o nó de... e todos os nós que fazem sentido. No selector de modelo, no nó de imagem, deixar apenas os tipos de imagem que estão disponíveis no open router, assim como nos de texto, também apenas os que estão disponíveis, priorizando da mesma forma como é do lado de fora, fora da área de workflow, priorizando aqueles que são marcados como recomendados. Além do mais estruturar toda essa ideia de workflows, eu acho que ele tem que estar dentro de um workspace, mas ele também está relacionado sempre a um projeto. Então, de forma que eu possa depois executar em loop, né, então eu posso botar um loop para executar x vezes. Preciso de nós que vão buscar contexto, então ele tem que executar uma vez, buscar o contexto, fazer uma análise em cima desse contexto e depois criar. Então, eu preciso de um nó intermediário onde eu não vou criar um documento, eu quero fazer alguma coisa com a IA, mas eu não vou salvar isso, essa vai ser usada apenas dentro do fluxo talvez, entende? Então, para eu poder ter um pouquinho mais de flexibilidade."

## Clarifications

### Session 2025-11-25

- Q: Who has permission to execute workflows? → A: Workflows inherit project permissions - execution requires same permission as document creation ("can edit documents" role)
- Q: How should the system handle OpenRouter API rate limiting during multi-node workflow execution? → A: Do not implement special rate limiting handling - assume OpenRouter limits are sufficient for workflow execution needs
- Q: How long should workflow execution history be retained? What is the auto-cleanup policy? → A: Implement auto-cleanup retaining the last 5000 executions per workflow, older executions are automatically deleted
- Q: What output schema should Processing nodes use for intermediate data transformation? → A: Flexible JSONB field with automatic field extraction via OutputParser (structured outputs solution) - allows custom outputs without rigid schema
- Q: What limits on concurrent workflow executions per user/workspace should be enforced? → A: No concurrent execution limits needed initially - do not implement throttling or queue limits

## User Scenarios & Testing

### User Story 1 - Visual Workflow Builder with All Node Types (Priority: P1)

Marketing managers need to visually create multi-step creative workflows using a drag-and-drop interface that includes all necessary node types (start, text generation, image generation, conditional logic, loop control, context retrieval, and finish nodes).

**Why this priority**: This is the core foundation - without a complete visual builder with all node types, users cannot create functional automated workflows at all. This delivers immediate value by enabling basic workflow creation.

**Independent Test**: Can be fully tested by creating a simple workflow (start → text generation → finish), saving it, and verifying the workflow structure persists correctly. Delivers value by allowing users to visually plan automation sequences even before execution is implemented.

**Acceptance Scenarios**:

1. **Given** a user is on the workflow editor, **When** they open the node palette sidebar, **Then** they see all available node types organized by category: Control (Start, Finish, Conditional, Loop), AI Generation (Text, Image), Data (Context Retrieval, Variable Processing), each with descriptive icons and names
2. **Given** a user drags a node from the palette, **When** they drop it onto the canvas, **Then** the node appears with appropriate input/output connection points and a configuration panel opens
3. **Given** a user has placed multiple nodes, **When** they drag a connection from one node's output to another node's input, **Then** a visual connector line appears showing the data flow direction
4. **Given** a user has created a workflow, **When** they save it, **Then** the workflow structure (nodes, connections, configurations) persists and can be reopened for editing later

---

### User Story 2 - Standardized Variable Passing Between Nodes (Priority: P1)

Users need a consistent way to pass outputs from one node as inputs to subsequent nodes, using a standardized variable format (e.g., `{{node_name.output_field}}` syntax) that works across all node types.

**Why this priority**: Variable passing is essential for workflows to function - without it, nodes cannot communicate and workflows cannot be chained together. This is required immediately after P1 to make workflows actually functional.

**Independent Test**: Can be tested by creating a two-node workflow (text generation → another text generation) where the second node references the first node's output using variable syntax, executing it, and verifying the data flows correctly. Delivers value by enabling basic multi-step automation.

**Acceptance Scenarios**:

1. **Given** a text generation node named "headline" produces output, **When** a subsequent node references `{{headline.content}}` in its prompt field, **Then** the second node receives the first node's generated text as input during execution
2. **Given** an image generation node named "logo" produces an image URL, **When** a subsequent node references `{{logo.image_url}}` in its configuration, **Then** the second node can access and use that image URL
3. **Given** a context retrieval node named "brand_docs" fetches documents, **When** a text generation node references `{{brand_docs.documents}}` in its prompt, **Then** the retrieved context is injected into the AI prompt
4. **Given** a user is configuring a node, **When** they type `{{` in any text field, **Then** an autocomplete dropdown appears showing available variables from connected upstream nodes

---

### User Story 3 - AI Model Selection with OpenRouter Integration (Priority: P2)

Users need to select AI models for text and image generation nodes from a filtered list showing only models available through OpenRouter, with recommended models highlighted and sorted to the top.

**Why this priority**: Model selection is important for quality control and cost management, but users can still create functional workflows with default models. This enhances the experience after basic workflow creation works.

**Independent Test**: Can be tested by opening a text generation node's model selector and verifying: (1) only OpenRouter text models appear, (2) recommended models are marked and sorted first, (3) selecting a model persists correctly. Delivers value by giving users control over AI quality and cost trade-offs.

**Acceptance Scenarios**:

1. **Given** a user clicks the model selector in a text generation node, **When** the dropdown opens, **Then** they see only text-capable models available on OpenRouter (e.g., GPT-4, Claude, Mistral), with "Recommended" badges on preferred models sorted to the top
2. **Given** a user clicks the model selector in an image generation node, **When** the dropdown opens, **Then** they see only image generation models available on OpenRouter (e.g., DALL-E, Midjourney, Stable Diffusion), with recommended options prioritized
3. **Given** a user selects a model, **When** they save the node configuration, **Then** the selected model is used during workflow execution and displays in the node's label for quick reference
4. **Given** a recommended model is unavailable or overloaded, **When** execution attempts to use it, **Then** the system provides a clear error message and suggests alternative models

---

### User Story 4 - Context Retrieval and Processing Nodes (Priority: P2)

Users need specialized nodes to fetch project context (documents, brand guidelines, previous creations) and process them with AI analysis without creating new saved documents, allowing intermediate data transformations within workflows.

**Why this priority**: Context-aware workflows significantly improve output quality, but basic workflows can function without context. This adds sophistication after core functionality works.

**Independent Test**: Can be tested by creating a workflow with a context retrieval node that fetches documents from the project, connecting it to a processing node that analyzes them, and verifying the processed data passes to a generation node without creating unwanted saved documents. Delivers value by enabling smarter, context-aware automation.

**Acceptance Scenarios**:

1. **Given** a user adds a "Context Retrieval" node, **When** they configure it to fetch documents from the current project with filters (e.g., "status=approved", "type=brand_guideline"), **Then** execution retrieves matching documents and makes them available as `{{node_name.documents}}` for downstream nodes
2. **Given** a user adds a "Processing" node (intermediate AI node), **When** they configure it with a prompt like "Analyze these brand guidelines and extract key color codes: `{{context.documents}}`", **Then** the AI processes the input and outputs structured data without creating a saved document in the project
3. **Given** a processing node outputs structured data, **When** a downstream generation node references that data (e.g., `{{analyzer.colors}}`), **Then** the generation node receives the processed information and uses it in its prompt
4. **Given** a context retrieval node is executed, **When** no documents match the filters, **Then** the node outputs an empty result and downstream nodes handle it gracefully (e.g., skip optional sections or use defaults)

---

### User Story 5 - Loop Execution for Batch Generation (Priority: P3)

Users need to configure workflows to execute multiple times in a loop, either a fixed number of iterations or until a condition is met, enabling batch content generation with variations.

**Why this priority**: Loops enable powerful batch automation but are not essential for basic workflows. Users can manually run workflows multiple times until this is implemented.

**Independent Test**: Can be tested by creating a simple workflow with a loop node configured for 3 iterations, executing it, and verifying 3 documents are created with different outputs. Delivers value by automating repetitive tasks and enabling batch content generation.

**Acceptance Scenarios**:

1. **Given** a user adds a "Loop" node configured for "3 iterations", **When** the workflow executes, **Then** all nodes within the loop execute 3 times, producing 3 separate outputs (e.g., 3 different ad headlines)
2. **Given** a loop node has access to an iteration counter variable `{{loop.iteration}}`, **When** nodes inside the loop reference this variable, **Then** each iteration can customize its behavior (e.g., "Create version {{loop.iteration}} of the ad")
3. **Given** a user configures a loop with a conditional exit (e.g., "stop when quality score > 8"), **When** an iteration produces output meeting the condition, **Then** the loop terminates early and workflow continues to the next step
4. **Given** a loop produces multiple outputs, **When** the workflow completes, **Then** all generated content is saved as separate documents in the project, each tagged with its iteration number

---

### User Story 6 - Conditional Logic for Branching Workflows (Priority: P3)

Users need conditional nodes that evaluate outputs from previous nodes and route execution down different paths based on conditions (e.g., "if sentiment is negative, run revision flow; else publish").

**Why this priority**: Conditional logic adds sophisticated decision-making but is not required for linear workflows. Users can manually review and decide until this is automated.

**Independent Test**: Can be tested by creating a workflow with a conditional node that checks if generated text contains a keyword, routing to different paths, executing it multiple times with different inputs, and verifying the correct path is taken each time. Delivers value by enabling self-correcting and adaptive workflows.

**Acceptance Scenarios**:

1. **Given** a user adds a "Conditional" node after a text generation node, **When** they configure a condition like "if `{{content.word_count}}` > 100 then Path A else Path B", **Then** execution evaluates the condition and follows the appropriate branch
2. **Given** a conditional node evaluates to true, **When** execution proceeds down the "true" path, **Then** only nodes on that path execute and the "false" path is skipped
3. **Given** a conditional node checks for content quality (e.g., "if `{{content}}` contains profanity"), **When** inappropriate content is detected, **Then** the workflow routes to a revision node to regenerate the content
4. **Given** multiple conditional paths converge at a later node, **When** any path reaches that node, **Then** execution continues normally, merging the different flow branches

---

### User Story 7 - Workflow-Project-Workspace Hierarchy (Priority: P2)

Users need workflows to belong to both a workspace (for organizational access control) and a specific project (for context and output destination), allowing them to create reusable workflow templates at the workspace level that can be instantiated for specific projects.

**Why this priority**: Proper hierarchy is important for organization and reusability, but users can manage workflows within a single project initially. This improves usability as the feature matures.

**Independent Test**: Can be tested by creating a workflow template at the workspace level, then instantiating it for a specific project, executing it, and verifying outputs are saved to the correct project. Delivers value by enabling workflow reuse across multiple projects.

**Acceptance Scenarios**:

1. **Given** a user navigates to the workspace workflows section, **When** they create a new workflow without selecting a project, **Then** it is saved as a workspace-level template available to all projects in that workspace
2. **Given** a user navigates to a specific project, **When** they create a workflow, **Then** it is saved as a project-specific workflow and automatically uses that project's context and saves outputs to that project
3. **Given** a workspace-level workflow template exists, **When** a user instantiates it for a specific project, **Then** a copy is created bound to that project, pre-configured with project-specific context nodes
4. **Given** a workflow is executed, **When** it generates documents, **Then** those documents are saved to the project the workflow is bound to, regardless of where the workflow was originally created

---

### Edge Cases

- What happens when a workflow execution fails mid-way through (e.g., AI API timeout)? The system should save partial progress, mark the workflow as "failed", and allow users to retry from the failed node or restart from the beginning.
- How does the system handle circular dependencies in variable references (e.g., Node A references Node B, Node B references Node A)? The system should detect cycles during workflow validation and prevent saving invalid workflows with clear error messages.
- What happens when a user references a variable from a node that hasn't executed yet or doesn't exist? The workflow validation should catch missing variable references before execution and highlight them in the editor.
- How does the system handle very long-running workflows (e.g., 100 iterations generating images)? The system should provide real-time progress updates, allow users to pause/resume execution, and prevent timeout issues by breaking execution into manageable chunks.
- What happens when a conditional node's condition cannot be evaluated (e.g., comparing text to number)? The system should default to a safe path (e.g., "false" branch) and log a warning that the condition was invalid.
- How does the system handle deleted or moved documents referenced in context retrieval nodes? The node should gracefully skip missing documents and return available results without failing the entire workflow.
- What happens when two nodes produce outputs with the same variable name? The system should enforce unique node names within a workflow, preventing naming conflicts during configuration.

## Requirements

### Functional Requirements

#### Workflow Visual Editor

- **FR-001**: Users MUST be able to create new workflows with a drag-and-drop visual editor where nodes represent actions and connections represent data flow
- **FR-002**: The node palette sidebar MUST display all available node types organized by category: Control (Start, Finish, Conditional, Loop), AI Generation (Text Creation, Image Generation), Data (Context Retrieval, Variable Processing)
- **FR-003**: Each node MUST have clearly visible input and output connection points that visually indicate data flow direction
- **FR-004**: Users MUST be able to connect nodes by dragging from one node's output to another node's input, creating visual data flow arrows
- **FR-005**: The system MUST validate workflow structure before saving, ensuring: (1) all workflows have exactly one Start node, (2) all execution paths lead to a Finish node, (3) all required node configurations are complete, (4) no circular dependencies exist
- **FR-006**: The visual editor MUST provide zoom in/out and pan controls to navigate large workflows comfortably
- **FR-007**: Users MUST be able to select multiple nodes and move them as a group, copy/paste nodes, and delete nodes with confirmation

#### Variable System and Data Passing

- **FR-008**: The system MUST implement a standardized variable syntax `{{node_name.field_name}}` that works consistently across all node types
- **FR-009**: Each node MUST produce outputs in a structured format containing: `content` (primary generated text or data), `metadata` (model used, timestamp, token count), `image_url` (for image nodes), `documents` (for context retrieval nodes)
- **FR-010**: When a user types `{{` in any node configuration field, the system MUST display an autocomplete dropdown showing available variables from all upstream connected nodes
- **FR-011**: The system MUST resolve variable references during execution by fetching actual values from previously executed nodes' outputs and replacing placeholders before processing
- **FR-012**: Processing nodes (intermediate AI operations) MUST accept variable inputs, process them with AI, and output structured data without creating saved documents in the project
- **FR-013**: The system MUST provide a variable inspector panel showing all available variables and their current values during workflow execution or debugging

#### Node Types and Configuration

- **FR-014**: Start nodes MUST allow users to configure initial input variables that can be prompted at execution time (e.g., "Campaign theme", "Target audience")
- **FR-015**: Text generation nodes MUST allow users to: (1) write prompts with embedded variables, (2) select an AI model from available OpenRouter text models, (3) configure output parameters (max length, temperature, etc.)
- **FR-016**: Image generation nodes MUST allow users to: (1) write image prompts with embedded variables, (2) select an AI model from available OpenRouter image models, (3) configure image parameters (size, style, etc.)
- **FR-017**: Context retrieval nodes MUST allow users to query project documents with filters (status, type, tags) and output matching documents as a variable list
- **FR-018**: Processing nodes MUST allow users to configure AI prompts that analyze or transform data without creating saved documents, outputting structured results stored in flexible JSONB format with automatic field extraction via OutputParser (enabling custom output structures without rigid schemas)
- **FR-019**: Conditional nodes MUST allow users to define conditions using comparison operators (equals, contains, greater than, less than) on variables, with visual "true" and "false" output paths
- **FR-020**: Loop nodes MUST allow users to configure: (1) fixed iteration count, (2) conditional exit criteria, and expose a `{{loop.iteration}}` variable accessible within the loop
- **FR-021**: Finish nodes MUST allow users to configure final output actions (save to project, send notification, trigger external webhook)

#### AI Model Selection

- **FR-022**: Text generation node model selectors MUST display only text-capable models available on OpenRouter, filtered from the full model list
- **FR-023**: Image generation node model selectors MUST display only image generation models available on OpenRouter
- **FR-024**: Model selectors MUST mark "recommended" models (same logic used outside workflows) with a visual badge and sort them to the top of the dropdown
- **FR-025**: Each node MUST display the selected model name in its visual representation on the canvas for quick reference
- **FR-026**: If a selected model becomes unavailable during execution, the system MUST provide a clear error message and suggest alternative models from the same category

#### Workflow Hierarchy and Organization

- **FR-027**: Workflows MUST belong to a workspace for organizational grouping and access control
- **FR-028**: Workflows MUST be associated with a specific project OR marked as a workspace-level template
- **FR-029**: Project-specific workflows MUST automatically use the project's context when Context Retrieval nodes execute
- **FR-030**: Workspace-level workflow templates MUST be instantiable for specific projects, creating a bound copy
- **FR-031**: When a workflow generates documents, they MUST be saved to the associated project, visible in that project's document list

#### Execution and Monitoring

- **FR-032**: Users MUST be able to execute workflows manually by clicking a "Run" button, optionally providing values for Start node input variables
- **FR-032a**: Workflow execution permission MUST inherit from project document permissions - users who can create/edit documents in a project can execute workflows in that project
- **FR-033**: During execution, the system MUST provide real-time progress updates showing which node is currently executing
- **FR-034**: Users MUST be able to view execution history for each workflow, including: timestamp, duration, success/failure status, generated documents
- **FR-034a**: The system MUST implement automatic cleanup of execution history, retaining only the last 5000 executions per workflow and deleting older records
- **FR-035**: If execution fails, the system MUST save partial progress, log the error with details, and allow users to retry from the failed node or restart
- **FR-036**: Long-running workflows MUST be pausable and resumable, preventing timeout issues on extended executions
- **FR-037**: Loop nodes executing many iterations MUST provide progress indicators showing current iteration number and estimated time remaining
- **FR-038**: The system does NOT need to implement OpenRouter API rate limiting protection - assume API limits are sufficient for workflow execution needs
- **FR-039**: The system does NOT need to enforce concurrent workflow execution limits per user or workspace initially

### Key Entities

- **Workflow**: Represents an automated creative process with nodes and connections, belonging to a workspace and optionally a project. Contains metadata (name, description, created date, last modified), node definitions, connection mappings, and execution history
- **Node**: Represents a single action or decision point in a workflow. Contains type (Start, Text Generation, Image Generation, Conditional, Loop, Context Retrieval, Processing, Finish), configuration (prompts, model selection, parameters), input/output connection points, and position on canvas
- **Connection**: Represents data flow between nodes. Contains source node ID, source output field, target node ID, target input field
- **Variable**: Represents data passed between nodes during execution. Contains name (follows `node_name.field_name` pattern), value (actual content or reference), data type (text, image_url, document_list, structured_data)
- **Execution**: Represents a single run of a workflow. Contains start time, end time, status (running, completed, failed, paused), node execution logs, generated document IDs, error messages (if failed)
- **Node Output**: Represents the result produced by a node during execution. Contains content (primary data), metadata (model, timestamp, token count), structured fields specific to node type (image_url, documents, etc.)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create a complete workflow with at least 5 connected nodes (Start → Context Retrieval → Text Generation → Conditional → Finish) in under 10 minutes
- **SC-002**: Variable references between nodes work reliably, with 95% of executions successfully passing data without manual intervention
- **SC-003**: Workflow execution completes successfully 90% of the time for workflows with up to 10 nodes, with clear error messages for the remaining 10%
- **SC-004**: Users can execute a looped workflow generating 10 iterations in under 5 minutes, with all outputs saved correctly to the project
- **SC-005**: The visual editor supports workflows with up to 50 nodes without performance degradation, maintaining smooth zoom/pan interactions
- **SC-006**: Model selection shows only available OpenRouter models, with recommended models appearing first, reducing user confusion by 70% (measured by support tickets)
- **SC-007**: Context-aware workflows using Context Retrieval nodes produce outputs that reference project documents correctly 95% of the time
- **SC-008**: Users can create and reuse workspace-level workflow templates across 3+ projects, reducing workflow setup time by 60%
- **SC-009**: Real-time execution progress updates during workflow runs, allowing users to monitor long-running workflows without uncertainty
- **SC-010**: Conditional branching works correctly 98% of the time, routing execution down the appropriate path based on defined conditions

## Assumptions

- OpenRouter API provides a stable list of available models that can be queried programmatically for filtering
- OpenRouter API rate limits are sufficient for workflow execution needs - no special throttling or backoff logic required
- Workflow execution happens asynchronously with progress tracking, not requiring users to keep their browser open for long-running workflows
- Users understand basic flowchart/visual programming concepts (nodes, connections, variables)
- The existing project and workspace structure supports associating workflows with both entities and has document creation permissions that can be reused for workflow execution authorization
- AI model responses are generally fast enough (<30 seconds per node) that execution timeouts are rare for typical workflows
- Users will primarily create workflows with 5-15 nodes, not massive 100+ node workflows (though system should support them)
- Execution history retention of 5000 executions per workflow provides sufficient audit trail without excessive storage costs
- No concurrent execution limits needed initially - system resources can handle simultaneous workflow runs without throttling
- Document context retrieved from projects fits within AI model context windows (handling via chunking or summarization if needed)
- Variable data types can be automatically inferred from node outputs without requiring explicit type declarations
- Processing node outputs using flexible JSONB with OutputParser provides sufficient structure for downstream variable access without rigid schema enforcement

## Out of Scope

- Advanced debugging tools (breakpoints, step-through execution) - may be added in future iterations
- Version control for workflows (tracking changes over time) - initial version only saves latest state
- Workflow sharing/marketplace where users share templates publicly - focus is on workspace-level sharing first
- Parallel execution of independent node branches - workflows execute sequentially for simplicity
- Real-time collaborative editing of workflows (multiple users editing same workflow simultaneously)
- AI-powered workflow suggestions or auto-optimization based on execution history
- Integration with external tools beyond OpenRouter (e.g., direct API calls to social media platforms)
- Workflow scheduling/automation (cron-like triggers) - focus is on manual execution first
- Advanced variable transformations (e.g., complex data mapping, JSON path queries) - basic field access only
- Rollback to previous workflow versions if changes break existing functionality
