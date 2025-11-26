# Feature Specification: Autonomous Workflow System for Content Creation

**Feature Branch**: `002-autonomous-workflow-system`
**Created**: 2025-11-25
**Status**: Draft
**Input**: User description: "Sistema de agentes autônomos para criação automatizada de copies e criativos com editor visual de fluxo (ReactFlow), templates pré-prontos, e sistema de anexos de imagens aos documentos"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Batch Creation with Pre-built Templates (Priority: P1)

A marketing team needs to quickly generate multiple ad variations for a campaign launch. They select a pre-built "Facebook Ads Campaign" workflow template, upload their brand guidelines as context, set parameters (10 copies, 5 images), and launch the autonomous workflow. The system generates all content pieces in draft status for review.

**Why this priority**: Delivers immediate value with minimal setup. Users can start automating content creation within minutes using templates, which is the core promise of the feature.

**Independent Test**: Can be fully tested by selecting a template, configuring basic parameters (quantity, theme), and verifying that the system generates the expected number of draft documents. Delivers value even without custom workflow building.

**Acceptance Scenarios**:

1. **Given** user is in a project, **When** they open "Workflows" and select a pre-built template (e.g., "Instagram Carousel Campaign"), **Then** they see a visual flow diagram with pre-configured nodes
2. **Given** user has selected a template, **When** they configure parameters (topic: "Summer Sale", copies: 10, images: 5, context: brand-guidelines.pdf), **Then** the system validates inputs and shows "Ready to Launch"
3. **Given** user clicks "Launch Workflow", **When** execution begins, **Then** system shows real-time progress for each agent node (e.g., "Generating copy 3/10", "Creating image 2/5")
4. **Given** workflow completes, **When** user returns to project dashboard, **Then** they see 10 new draft copy documents and 5 new draft images, all tagged with the workflow execution ID
5. **Given** workflow is running, **When** user navigates away or closes browser, **Then** workflow continues executing in background and user can check status later

---

### User Story 2 - Visual Workflow Builder for Custom Automation (Priority: P2)

A content strategist wants to create a custom workflow for their unique process: generate blog outline → write 3 variations → create featured image → create 5 social media snippets. They use the visual workflow builder to drag nodes, connect them, configure each node's prompts and parameters, save it as a reusable template, and execute it.

**Why this priority**: Enables advanced users to customize automation to their specific needs. Builds on P1's template system by allowing template creation.

**Independent Test**: Can be tested by creating a custom workflow from scratch, connecting nodes in sequence, saving it, and executing it. Verifies the visual builder works independently from templates.

**Acceptance Scenarios**:

1. **Given** user opens "Create Custom Workflow", **When** they see the ReactFlow canvas, **Then** they can drag nodes from a sidebar (types: Generate Copy, Generate Image, Review, Conditional, Parallel)
2. **Given** user drags a "Generate Copy" node onto canvas, **When** they click it to configure, **Then** they see fields for: prompt template, quantity, temperature, context documents selection, output status (draft/review/published)
3. **Given** user has configured multiple nodes, **When** they connect them with edges, **Then** system validates connections (e.g., image generation can't connect before copy generation if image depends on copy)
4. **Given** user has built a valid workflow, **When** they click "Save as Template", **Then** they provide name, description, category, and it appears in their custom templates library
5. **Given** user clicks "Test Run", **When** workflow executes, **Then** they see live execution state for each node (pending/running/completed/failed) with progress indicators

---

### User Story 3 - Document-Image Attachment System (Priority: P1)

A designer creates an ad copy document and wants to attach 3 different creative variations as images. They click "Attach Images" within the document, select existing images from the project or upload new ones, and the images appear as visual cards within the document. Later, they mark one image as "primary" for export.

**Why this priority**: Core data model change that enables copy-creative pairing. Required for workflows to link generated images to their corresponding copies.

**Independent Test**: Can be tested by creating a text document, attaching images to it, viewing them inline, and verifying the relationship persists. Works independently of workflows.

**Acceptance Scenarios**:

1. **Given** user is editing a copy document, **When** they click "Attach Images" button, **Then** they see a modal with two options: "Select from Project" and "Upload New"
2. **Given** user selects "Select from Project", **When** modal shows existing images as thumbnails, **Then** they can multi-select images and click "Attach"
3. **Given** user has attached images to document, **When** they view the document, **Then** images appear as visual cards below the text content, showing thumbnail, filename, and size
4. **Given** multiple images are attached, **When** user clicks "Set as Primary" on one image, **Then** that image is marked with a star/badge and used as default for exports/shares
5. **Given** document has attached images, **When** document is used as context in chat or workflow, **Then** AI can analyze both text and images together

---

### User Story 4 - Workflow Execution Monitoring & Control (Priority: P2)

A user launches a large workflow that will create 50 pieces of content. They want to monitor progress, pause it if needed, review intermediate results, and adjust parameters mid-execution. They access the "Active Workflows" panel, see real-time progress, pause the workflow, review drafts created so far, tweak a node parameter, and resume.

**Why this priority**: Provides control and visibility for long-running automations. Critical for user trust but can be basic in v1.

**Independent Test**: Can be tested by launching any workflow and using controls to pause/resume/stop while monitoring progress. Verifies execution engine works.

**Acceptance Scenarios**:

1. **Given** user has active workflows running, **When** they click "Active Workflows" icon in header, **Then** they see a sidebar panel listing all running workflows with progress bars
2. **Given** workflow is running, **When** user clicks into workflow detail, **Then** they see the visual flow diagram with real-time node states color-coded (gray=pending, blue=running, green=completed, red=failed)
3. **Given** workflow is running, **When** user clicks "Pause", **Then** current executing node finishes but next nodes don't start, and state is saved
4. **Given** workflow is paused, **When** user edits a future node's parameters, **Then** changes are saved and will apply when workflow resumes
5. **Given** workflow encounters an error, **When** node fails, **Then** user sees error message, can choose "Retry Node", "Skip Node", or "Stop Workflow"

---

### User Story 5 - Workflow Templates Library (Priority: P3)

A user explores pre-built workflow templates to understand what's possible. They browse categories (Social Media, Paid Ads, Blog Content, Email Campaigns), preview workflow diagrams, see example outputs, and clone templates to customize them.

**Why this priority**: Accelerates adoption and educates users on best practices. Less critical than core workflow engine but important for UX.

**Independent Test**: Can be tested by browsing template gallery, previewing templates, and cloning one. Verifies template management system.

**Acceptance Scenarios**:

1. **Given** user opens "Workflow Templates", **When** they see categorized grid of templates, **Then** each template shows name, description, node count, estimated execution time, and preview thumbnail
2. **Given** user clicks a template preview, **When** modal opens, **Then** they see full workflow diagram, example inputs/outputs, and success metrics (e.g., "Used 234 times, avg rating 4.8/5")
3. **Given** user likes a template, **When** they click "Use Template", **Then** they can choose "Use as-is" or "Clone & Customize"
4. **Given** user selects "Clone & Customize", **When** workflow builder opens, **Then** they see the template's nodes and can modify them before first execution
5. **Given** user creates a great custom workflow, **When** they click "Share as Template", **Then** they can publish it to workspace template library

---

### Edge Cases

- What happens when a workflow node fails mid-execution (e.g., API rate limit, model unavailable)?
- How does system handle workflows that produce duplicate content (same copy generated twice)?
- What if user deletes a context document while workflow is running and depends on it?
- How are very long workflows (100+ nodes) visualized without overwhelming the UI?
- What if user runs out of API credits mid-workflow execution?
- How does system prevent infinite loops in workflow connections (node A → B → A)?
- What happens when user tries to attach a 50MB image to a document?
- How are workflows shared between workspace members? Can multiple users edit the same workflow simultaneously?
- What if workflow generates content that violates content policies or brand guidelines?
- How does system handle partial workflow completion (50% of copies created before failure)?

## Requirements *(mandatory)*

### Functional Requirements

#### Workflow Engine

- **FR-001**: System MUST allow users to create visual workflows using a drag-and-drop node-based editor
- **FR-002**: System MUST support at minimum these node types: Generate Copy, Generate Image, Attach to Document, Review/Edit, Conditional Branch, Parallel Execution, Merge Results
- **FR-003**: System MUST validate workflow connections to prevent cycles and invalid node dependencies
- **FR-004**: System MUST execute workflows asynchronously in background, allowing users to continue working
- **FR-005**: System MUST persist workflow state at each node completion to enable pause/resume
- **FR-006**: System MUST track workflow execution history including start time, end time, nodes executed, success/failure status

#### Workflow Parameters & Configuration

- **FR-007**: Each workflow MUST accept configuration parameters including: quantity of outputs, theme/topic, context documents (selection), output status (draft/review/published)
- **FR-008**: System MUST allow users to select specific project documents or "all documents" as context for workflow execution
- **FR-009**: Users MUST be able to specify custom prompts for each node in the workflow
- **FR-010**: System MUST support prompt templates with variable substitution (e.g., `{{topic}}`, `{{brand_voice}}`, `{{target_audience}}`)
- **FR-011**: Users MUST be able to upload reference files (images, PDFs, text) specifically for a workflow execution

#### Pre-built Templates

- **FR-012**: System MUST provide at minimum 5 pre-built workflow templates covering common use cases (Facebook Ads, Instagram Posts, Blog Articles, Email Campaigns, Landing Page Copy)
- **FR-013**: Users MUST be able to browse templates by category (Social Media, Paid Ads, Organic Content, Email, SEO)
- **FR-014**: Users MUST be able to clone and customize any template
- **FR-015**: System MUST track template usage statistics (times used, success rate, average execution time)

#### Document-Image Attachments

- **FR-016**: Documents MUST support attaching multiple images as visual assets
- **FR-017**: Users MUST be able to attach images by selecting existing project images or uploading new ones
- **FR-018**: System MUST display attached images as visual cards within the document view, distinct from inline content
- **FR-019**: Users MUST be able to designate one attached image as "primary" for the document
- **FR-020**: Attached images MUST be included when document is used as context in chat or workflows
- **FR-021**: System MUST maintain the relationship between copy document and attached images for versioning and exports
- **FR-022**: Users MUST be able to detach images from documents without deleting the image from the project
- **FR-023**: System MUST preserve standalone images as independent documents (not attached to any copy)

#### Agent Autonomy & Multi-Agent Coordination

- **FR-024**: System MUST support parallel execution of multiple agent nodes simultaneously (e.g., generate 5 copies in parallel)
- **FR-025**: System MUST coordinate between agents, passing outputs from one node as inputs to dependent nodes
- **FR-026**: Review nodes MUST allow human-in-the-loop approval before proceeding to next nodes
- **FR-027**: System MUST prevent workflow execution if required context documents are missing or inaccessible
- **FR-028**: System MUST support conditional nodes that route execution based on simple rules (e.g., "if copy length > 500 words, create long-form image, else create square image")

#### Workflow Monitoring & Control

- **FR-029**: Users MUST be able to view all active, paused, and completed workflows in a dedicated panel
- **FR-030**: System MUST show real-time progress for running workflows including current node, completion percentage, and estimated time remaining
- **FR-031**: Users MUST be able to pause, resume, or stop workflows at any point
- **FR-032**: System MUST preserve workflow state when paused, allowing parameter adjustments before resume
- **FR-033**: System MUST generate node-level execution logs showing which nodes ran, number of items generated, total tokens used, and any errors (not individual AI call logs)
- **FR-034**: Users MUST be able to retry failed nodes without restarting entire workflow
- **FR-035**: System MUST track total cost of workflow execution and display it in execution history

#### Node Types

- **FR-036**: "Attach to Document" node MUST allow connecting generated images to specific copy documents, with configuration for which copy (by position, by ID reference, or by content matching)
- **FR-037**: "Attach to Document" node MUST support attaching single image to single copy, single image to multiple copies, or multiple images to single copy based on node configuration

### Key Entities

- **Workflow Template**: Represents a reusable workflow configuration with nodes, connections, default parameters, category, and usage metadata. Can be system-provided or user-created.
- **Workflow Execution**: A specific instance of a workflow template being run, with concrete parameters, selected context documents, execution state, progress tracking, and result documents.
- **Workflow Node**: An individual step in a workflow (Generate Copy, Generate Image, etc.) with configuration (prompt, model, quantity, conditionals) and execution state.
- **Document Attachment**: A relationship linking a copy document to one or more image assets, with metadata indicating primary image, attachment order, and creation source (manual upload vs. workflow-generated).
- **Agent Job**: An asynchronous task representing a single agent's work (generating one copy, creating one image) within a workflow node, trackable independently for monitoring and error handling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create and launch a basic workflow (copy generation) in under 3 minutes using pre-built templates
- **SC-002**: System successfully executes workflows generating up to 50 content pieces (copies + images) without manual intervention
- **SC-003**: 90% of workflow executions complete successfully without errors requiring user intervention
- **SC-004**: Users can attach images to copy documents and view them inline in under 30 seconds
- **SC-005**: Workflow execution time for generating 10 copies + 10 images completes in under 5 minutes (excluding AI API latency)
- **SC-006**: Users can pause and resume long-running workflows without losing progress or corrupting state
- **SC-007**: 80% of users successfully use a pre-built template on their first workflow attempt without documentation
- **SC-008**: System handles workflows with up to 20 parallel agent executions without performance degradation

## Assumptions

- Users are familiar with basic flowchart/diagram concepts (nodes and connections)
- Projects already contain some context documents (brand guidelines, references) before workflows are created
- Image generation capabilities are already available in the system (extending existing image generation feature)
- Workflow execution happens server-side with client polling for updates (not real-time WebSocket initially, polling interval ~2 seconds)
- Review nodes in v1 will be human-in-the-loop (user must manually approve/reject before workflow continues)
- Maximum workflow execution time: 30 minutes before automatic timeout with partial results saved
- Attached images are stored as document relationships in database, not embedded in content markdown
- Context document selection defaults to "all project documents" unless user explicitly filters
- Workflow templates are workspace-scoped (users in same workspace can share templates)
- Maximum image attachment per document: 20 images
- Maximum file size per attached image: 10MB
- Cost tracking happens post-execution using existing AI usage system, no pre-execution estimates or spending caps in v1
- Execution logs are node-level summaries (not individual AI calls) showing items generated, tokens used, success/failure per node
- Image-to-copy attachment is explicit via "Attach to Document" workflow node, not automatic. Workflows without this node generate standalone items

## Out of Scope

- Real-time collaboration on workflow editing (multiple users editing same workflow simultaneously)
- Workflow versioning and rollback (v1 only keeps latest version of each template)
- A/B testing framework for comparing workflow outputs statistically
- Scheduled/recurring workflow execution (cron-style automation - future feature)
- Integration with external tools (Zapier, Make, n8n, etc.)
- Workflow marketplace with paid templates from third-party creators
- Advanced conditional logic with complex expressions (v1 supports only simple if-then rules)
- Workflow analytics dashboard showing performance trends across all executions over time
- AI-powered workflow optimization suggestions
- Export workflows as code or configuration files
- Workflow execution on mobile devices (mobile view is read-only for monitoring)

## Dependencies

- Existing document management system (create, read, update, delete documents)
- Existing image generation system (AI-powered image creation)
- Existing chat/AI integration (for agent execution and LLM calls)
- Existing project context system (documents as context for AI)
- Existing workspace and project structure

## Open Questions

None - All clarifications resolved.
