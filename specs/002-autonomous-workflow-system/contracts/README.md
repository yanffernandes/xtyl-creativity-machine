# Workflow System API Contracts

This directory contains OpenAPI 3.0 specifications for the Autonomous Workflow System API.

## Files

### 1. workflows.yaml
**Endpoints**: Workflow template CRUD operations
- `GET /api/workflows/templates` - List workflow templates with filtering
- `GET /api/workflows/templates/{id}` - Get template details
- `POST /api/workflows/templates` - Create custom template
- `PUT /api/workflows/templates/{id}` - Update template
- `DELETE /api/workflows/templates/{id}` - Delete template
- `POST /api/workflows/templates/{id}/clone` - Clone and customize template

**Key Schemas**:
- `WorkflowTemplateSummary` - Template overview with usage statistics
- `WorkflowTemplateDetail` - Complete template with nodes and edges
- `WorkflowNode` - Node definition with type-specific configuration
- `WorkflowEdge` - Connection between nodes

### 2. executions.yaml
**Endpoints**: Workflow execution lifecycle management
- `POST /api/workflows/executions/launch` - Launch new workflow execution
- `GET /api/workflows/executions/{id}` - Get execution status and progress
- `GET /api/workflows/executions` - List executions with filtering
- `POST /api/workflows/executions/{id}/pause` - Pause running workflow
- `POST /api/workflows/executions/{id}/resume` - Resume paused workflow
- `POST /api/workflows/executions/{id}/stop` - Stop workflow permanently
- `POST /api/workflows/executions/{id}/retry-node` - Retry failed node

**Key Schemas**:
- `LaunchWorkflowRequest` - Execution parameters, context, and references
- `WorkflowExecutionDetail` - Complete execution state with node status
- `NodeExecutionStatus` - Individual node progress and results
- `ExecutionError` / `NodeError` - Error details with retry information

### 3. nodes.yaml
**Endpoints**: Node validation and document attachments
- `POST /api/workflows/nodes/validate` - Validate single node configuration
- `POST /api/workflows/nodes/validate-connections` - Validate workflow connections
- `POST /api/documents/{docId}/attachments` - Attach images to document
- `GET /api/documents/{docId}/attachments` - Get document attachments
- `DELETE /api/documents/{docId}/attachments/{imageId}` - Detach image
- `PUT /api/documents/{docId}/attachments/{imageId}/primary` - Set primary image

**Key Schemas**:
- **Node Configuration Schemas** (detailed schemas for each node type):
  - `GenerateCopyNodeConfig` - AI copy generation parameters
  - `GenerateImageNodeConfig` - AI image generation parameters
  - `AttachToDocumentNodeConfig` - Image attachment strategies
  - `ReviewNodeConfig` - Human-in-the-loop review settings
  - `ConditionalNodeConfig` - Branching logic rules
  - `ParallelNodeConfig` - Parallel execution settings
- `DocumentAttachmentDetail` - Image attachment with metadata
- `NodeValidationError` - Configuration validation errors
- `ConnectionValidationError` - Workflow structure validation errors

## Node Types Reference

### Generate Copy Node
Creates AI-generated text content.
- **Config**: `prompt_template`, `quantity`, `temperature`, `output_status`
- **Example**: Generate 10 ad headlines with 0.9 creativity

### Generate Image Node
Creates AI-generated images.
- **Config**: `prompt_template`, `quantity`, `style`, `dimensions`
- **Example**: Generate 5 professional marketing images at 1080x1080

### Attach to Document Node
Links generated images to copy documents.
- **Config**: `attachment_strategy`, `match_by`, `set_as_primary`
- **Strategies**: one-to-one, many-to-one, one-to-many

### Review Node
Human-in-the-loop approval step.
- **Config**: `review_type`, `instructions`, `auto_approve_after_minutes`
- **Types**: approval, selection, edit

### Conditional Node
Branching logic based on content properties.
- **Config**: `condition_type`, `rule`, `true_label`, `false_label`
- **Conditions**: content_length, quality_score, custom_rule

### Parallel Node
Execute multiple branches concurrently.
- **Config**: `max_concurrent`, `wait_for_all`
- **Example**: Generate 20 copies in parallel (5 at a time)

## Validation Rules

### Node Configuration
- Temperature: 0-2 (default 0.7)
- Quantity: 1-100 for copies, 1-50 for images
- Max tokens: 50-4000
- Prompt templates must reference valid variables

### Workflow Connections
- No cycles allowed (DAG structure required)
- Attach to Document requires both copy and image inputs
- Conditional nodes must have exactly 2 outgoing edges
- Maximum 100 nodes per workflow

### Document Attachments
- Maximum 20 images per document
- Only copy/text documents support attachments
- Image files must exist in project
- Maximum file size: 10MB per image

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer <jwt-token>
```

## Error Handling

### Standard Error Response
```json
{
  "error": "error_code",
  "message": "Human-readable message",
  "details": {
    "additional": "context"
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Resource created
- `202` - Accepted (async operation queued)
- `204` - Success with no content
- `400` - Bad request (invalid input)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `409` - Conflict (e.g., template in use)
- `422` - Validation error (invalid configuration)
- `500` - Internal server error

## Workflow Execution States

```
pending → running → completed
              ↓
            paused → running
              ↓
           failed/stopped
```

### State Transitions
- **pending**: Queued, waiting to start
- **running**: Actively executing nodes
- **paused**: Temporarily stopped, can resume
- **completed**: All nodes finished successfully
- **failed**: Node execution error, can retry
- **stopped**: User-terminated, cannot resume

## Usage Examples

### 1. Launch Workflow
```bash
POST /api/workflows/executions/launch
{
  "template_id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_id": "770e8400-e29b-41d4-a716-446655440002",
  "project_id": "880e8400-e29b-41d4-a716-446655440003",
  "parameters": {
    "topic": "Summer Sale 2025",
    "quantity": 10
  },
  "context_documents": {
    "mode": "all"
  }
}
```

### 2. Monitor Progress
```bash
GET /api/workflows/executions/{id}
```

Response includes:
- Overall completion percentage
- Current node being executed
- Items generated vs. total
- Cost tracking (tokens, estimated USD)
- Node-by-node status

### 3. Handle Failures
```bash
POST /api/workflows/executions/{id}/retry-node
{
  "node_id": "node-3",
  "retry_config": {
    "max_retries": 3,
    "backoff_seconds": 30
  }
}
```

### 4. Attach Images to Copy
```bash
POST /api/documents/doc-123/attachments
{
  "image_ids": ["img-001", "img-002", "img-003"],
  "set_first_as_primary": true
}
```

## Implementation Notes

### Backend (FastAPI)
- Use Pydantic schemas for request/response validation
- Auto-generate OpenAPI docs from these specs
- Implement async endpoint handlers
- Celery for background workflow execution

### Frontend (React/TypeScript)
- Generate TypeScript types from OpenAPI specs (e.g., using openapi-typescript)
- Use typed API client (e.g., axios + generated types)
- Poll execution endpoint every 2 seconds for progress updates
- Display real-time node status with color coding

### Database
- PostgreSQL for workflow definitions and execution state
- Redis for Celery broker and execution caching
- MinIO for image storage (URLs in responses)

## Testing

### Contract Validation
Use OpenAPI validators to ensure compliance:
- `openapi-generator-cli validate` (Java-based)
- `swagger-cli validate` (Node.js-based)
- Prism mock server for contract testing

### Integration Tests
Test full workflow execution paths:
1. Create template → Validate → Launch → Monitor → Complete
2. Test pause/resume workflow state persistence
3. Test node failure and retry mechanisms
4. Test document attachment workflows

## Version History

- **1.0.0** (2025-11-25) - Initial API contract specification
  - Workflow template CRUD
  - Execution control (launch, pause, resume, stop, retry)
  - Node validation
  - Document-image attachments

## References

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [Feature Specification](../spec.md)
- [Implementation Plan](../plan.md)
- [Data Model Documentation](../data-model.md)
