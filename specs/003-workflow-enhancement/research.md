# Research & Design Decisions: Workflow Enhancement

**Feature**: Complete Workflow System with Enhanced Node Types
**Date**: 2025-11-25
**Status**: Phase 0 Complete

## Visual Workflow Editor Library

### Decision: ReactFlow 11.11.4

**Rationale**:
- Battle-tested library with 20k+ GitHub stars, actively maintained
- Built-in node dragging, connection handling, minimap, zoom/pan controls
- Highly customizable (custom node components, edge styles)
- TypeScript support with excellent type definitions
- Performance optimized for 50-100 nodes without virtualization
- Supports programmatic layout via dagre for auto-arrangement

**Alternatives Considered**:
- **Custom SVG canvas**: Rejected - would require 3-4 weeks to build equivalent features (drag, zoom, snap-to-grid, connection validation)
- **JointJS**: Rejected - more focused on diagramming, less suited for interactive editing, smaller community
- **Rete.js**: Rejected - less TypeScript support, smaller ecosystem

**Integration Plan**:
- Wrap ReactFlow in `WorkflowCanvas.tsx` component
- Create custom node components for each type (Start, Text Gen, Image Gen, etc.)
- Use Zustand for workflow state management (nodes, edges, selected node)
- Handle ReactFlow events: `onNodesChange`, `onEdgesChange`, `onConnect` for updates

## Workflow Definition Format

### Decision: JSON with Nodes + Edges Arrays

**Format Structure**:
```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "start-1",
      "type": "start",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "Start",
        "inputVariables": [
          {"name": "campaign_theme", "type": "text", "required": true}
        ]
      }
    },
    {
      "id": "textgen-2",
      "type": "text_generation",
      "position": {"x": 300, "y": 100},
      "data": {
        "label": "Generate Headline",
        "prompt": "Create a headline for {{start.campaign_theme}}",
        "model": "openai/gpt-4-turbo",
        "maxTokens": 100
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "start-1",
      "target": "textgen-2",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
}
```

**Rationale**:
- Industry standard (n8n, Zapier, Prefect all use similar format)
- Native ReactFlow compatibility (minimal transformation needed)
- Easy to version (add `version` field for schema evolution)
- PostgreSQL JSONB supports efficient queries and indexing

**Alternatives Considered**:
- **Graph database (Neo4j)**: Rejected - overkill for simple DAGs, adds infrastructure complexity
- **XML-based format**: Rejected - verbose, harder to parse/edit, poor TypeScript support
- **Python pickle**: Rejected - not language-agnostic, security risks

## Variable Resolution Strategy

### Decision: Regex Parsing + Topological Sort

**Implementation**:
1. Parse all node prompts/configs with regex: `\{\{([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\}\}`
2. Extract dependencies: `{{textgen-2.content}}` → depends on node `textgen-2`
3. Build dependency graph and topological sort for execution order
4. Detect cycles (e.g., Node A depends on Node B, Node B depends on Node A) → validation error
5. During execution, replace `{{variable}}` with actual values from previous node outputs

**Example**:
```python
# Variable resolver pseudocode
def resolve_variables(prompt: str, execution_context: dict) -> str:
    pattern = r'\{\{([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\}\}'

    def replacer(match):
        node_id, field = match.groups()
        if node_id not in execution_context:
            raise ValueError(f"Node {node_id} not executed yet")
        return str(execution_context[node_id][field])

    return re.sub(pattern, replacer, prompt)
```

**Rationale**:
- Simple, predictable, debuggable
- Regex is fast enough for typical prompt sizes (<10KB)
- Topological sort ensures correct execution order automatically
- Clear error messages when variables are missing or circular

**Alternatives Considered**:
- **Template engine (Jinja2)**: Rejected - too powerful (loops, conditionals in prompts), security risk (arbitrary code execution)
- **AST parsing**: Rejected - overkill for simple variable substitution
- **Manual dependency declaration**: Rejected - error-prone, duplicates information already in variable references

## Execution State Management

### Decision: Redis for Active State + PostgreSQL Snapshots

**Architecture**:
- **Redis**: Stores current execution state (current node, variable values, loop iteration) for fast access
- **PostgreSQL**: Snapshots execution state after each node completes (for resume after restart)
- **Celery**: Task queue manages async execution, stores task IDs in Redis for pause/resume control

**State Schema (Redis)**:
```json
{
  "execution_id": "exec-123",
  "workflow_id": "wf-456",
  "status": "running",
  "current_node_id": "textgen-2",
  "execution_context": {
    "start-1": {"campaign_theme": "Summer Sale"},
    "textgen-2": {"content": "Sizzling Summer Deals!", "word_count": 4}
  },
  "loop_stack": [{"node_id": "loop-5", "iteration": 2, "max": 5}]
}
```

**Resume Logic**:
1. Server restart detected → Load execution state from PostgreSQL snapshot
2. Restore Redis state from snapshot
3. Check Celery task status → If interrupted, retry from `current_node_id`
4. Continue execution with restored `execution_context`

**Rationale**:
- Redis provides millisecond latency for state updates during execution
- PostgreSQL snapshots ensure durability (survive Redis restart)
- Celery task IDs allow pause/resume via `revoke()` and manual task dispatch

**Alternatives Considered**:
- **PostgreSQL only**: Rejected - too slow for real-time state updates (10-50ms per write vs 1ms Redis)
- **Redis only**: Rejected - volatile, would lose state on restart
- **Celery result backend only**: Rejected - not designed for mutable state (results are immutable)

## Real-time Progress Updates

### Decision: Server-Sent Events (SSE)

**Implementation**:
- Endpoint: `GET /workflows/executions/{execution_id}/stream`
- Backend sends SSE messages on node start, node complete, execution complete, error
- Frontend `EventSource` automatically reconnects on disconnect
- Message format: `event: progress\ndata: {"node_id": "textgen-2", "status": "running"}\n\n`

**Example**:
```python
# FastAPI SSE endpoint
@router.get("/executions/{execution_id}/stream")
async def stream_execution_progress(execution_id: str):
    async def event_generator():
        while True:
            state = redis.get(f"execution:{execution_id}")
            if state:
                yield f"data: {state}\n\n"
            if state["status"] in ["completed", "failed"]:
                break
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

**Rationale**:
- Simpler than WebSocket (one-way communication sufficient)
- Auto-reconnect built into `EventSource` API
- HTTP-based (works through proxies, no special server config)
- Lower latency than polling (messages sent immediately)

**Alternatives Considered**:
- **WebSocket**: Rejected - bidirectional overkill, requires sticky sessions for load balancing
- **Long polling**: Rejected - higher latency (1-2s polling interval), more server load
- **GraphQL subscriptions**: Rejected - adds GraphQL dependency, more complex setup

## Loop Implementation

### Decision: Execution Context Stack with Iteration Counter

**Loop Node Configuration**:
```json
{
  "type": "loop",
  "data": {
    "iterations": 5,  // Fixed count
    "or": {
      "condition": "{{quality_score}} > 8",  // Early exit
      "maxIterations": 10  // Safety limit
    }
  }
}
```

**Execution Logic**:
1. Loop node pushes iteration context to stack: `{"node_id": "loop-5", "iteration": 1, "max": 5}`
2. Nodes inside loop execute with `{{loop.iteration}}` variable available
3. After each iteration, check exit condition or increment counter
4. Pop loop context from stack when complete or condition met

**Scope Isolation**:
- Each iteration gets fresh variable scope (previous iteration outputs not visible by default)
- Exception: Loop counter `{{loop.iteration}}` always visible inside loop
- Generated documents tagged with iteration number for traceability

**Rationale**:
- Stack-based approach handles nested loops naturally
- Clear separation of iteration scope prevents variable conflicts
- Early exit via conditions enables quality-based stopping

**Alternatives Considered**:
- **Recursive execution**: Rejected - complex state management, stack overflow risk for high iterations
- **Explicit loop body subgraph**: Rejected - requires complex UI for subgraph editing
- **Iteration visibility**: Considered making previous iterations visible, rejected - causes confusion about which iteration's output to use

## Conditional Branching

### Decision: Python eval() in Sandboxed Context

**Condition Syntax**:
```python
# Simple comparisons
"{{content.word_count}} > 100"
"{{sentiment}} == 'positive'"
"'discount' in {{content}}"

# Boolean logic
"{{score}} > 8 and {{length}} < 200"
```

**Evaluation**:
```python
def evaluate_condition(condition: str, context: dict) -> bool:
    # Resolve variables first
    resolved = resolve_variables(condition, context)

    # Safe eval with restricted globals
    safe_globals = {
        "__builtins__": {"len": len, "str": str, "int": int, "float": float}
    }

    try:
        return bool(eval(resolved, safe_globals, {}))
    except Exception:
        return False  # Default to false path on error
```

**Path Selection**:
- Conditional node has two output handles: `true` and `false`
- Only connected path executes
- If both paths reconnect to same node downstream, execution continues from that node

**Rationale**:
- Python eval allows familiar comparison syntax
- Sandboxed globals prevent dangerous operations (file access, imports)
- Default to false prevents execution errors from breaking workflows

**Alternatives Considered**:
- **Custom expression parser**: Rejected - reinventing wheel, hard to maintain
- **JavaScript eval**: Rejected - backend is Python, cross-language complexity
- **Visual condition builder**: Considered for future, but text-based is MVP

## Model Filtering (OpenRouter)

### Decision: Query `/models` Endpoint with Capability Filter

**API Integration**:
```python
# Fetch models from OpenRouter
async def get_available_models(model_type: str) -> List[dict]:
    response = await httpx.get("https://openrouter.ai/api/v1/models")
    models = response.json()["data"]

    if model_type == "text":
        return [m for m in models if "chat" in m["supported_modalities"]]
    elif model_type == "image":
        return [m for m in models if "image" in m["supported_modalities"]]

    return models
```

**Caching**:
- Cache model list in Redis for 1 hour (models don't change frequently)
- Invalidate cache on 404 errors (model removed)
- Recommended models stored in database (admin-curated list)

**Rationale**:
- OpenRouter API provides `supported_modalities` field for filtering
- Caching reduces API calls and improves UI responsiveness
- Database-backed recommendations allow customization without code changes

**Alternatives Considered**:
- **Hardcoded model list**: Rejected - requires code deploy to add new models
- **No filtering**: Rejected - confusing to show image models in text node dropdown
- **Client-side filtering**: Rejected - requires fetching full list, slower initial load

## Summary of Technical Decisions

| Decision Area | Choice | Key Benefit |
|---------------|--------|-------------|
| Visual Editor | ReactFlow 11.11.4 | Mature, performant, customizable |
| Workflow Format | JSON (nodes + edges) | Industry standard, ReactFlow native |
| Variable Resolution | Regex + topological sort | Simple, predictable, fast |
| Execution State | Redis + PostgreSQL | Fast updates + durable resume |
| Real-time Updates | SSE (Server-Sent Events) | Simple, auto-reconnect, HTTP-based |
| Loop Implementation | Context stack + counter | Handles nesting, clear scope |
| Conditional Logic | Python eval (sandboxed) | Familiar syntax, safe execution |
| Model Filtering | OpenRouter API + cache | Dynamic, no hardcoding |

All decisions prioritize **simplicity, reliability, and maintainability** over premature optimization. Complex features (nested loops, parallel execution) are explicitly deferred to avoid overengineering the MVP.
