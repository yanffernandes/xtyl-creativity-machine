# Celery + Redis Async Workflow Documentation Index

**Complete Research & Implementation Guide for XTYL Creativity Machine**

Generated: 2025-11-25

---

## Document Overview

This research package contains three comprehensive documents covering production-ready patterns for async workflow execution using Celery + Redis with FastAPI.

### 1. [CELERY_REDIS_RESEARCH.md](CELERY_REDIS_RESEARCH.md) (63 KB, 2010 lines)

**Core research document** - Comprehensive analysis of best practices and patterns.

**Contents:**
- **Celery Setup** (§1): Integration with FastAPI, task patterns, worker startup
- **State Management** (§2): Hybrid Redis + PostgreSQL caching strategy
- **Resumable Execution** (§3): Node-level checkpointing and pause/resume patterns
- **Real-time Updates** (§4): SSE streaming with polling fallback
- **Topological Sort** (§5): Kahn's algorithm for DAG node ordering
- **Error Handling** (§6): Classification, retry logic, exponential backoff
- **Production Deployment** (§7): Scaling, monitoring, Kubernetes setup

**Use this document when:**
- Learning production patterns for async workflows
- Designing error handling strategy
- Implementing real-time progress updates
- Understanding state management trade-offs
- Setting up worker infrastructure

**Key sections:**
- Decision matrices with rationale for each technology choice
- Implementation patterns with code examples
- Gotchas and solutions (common pitfalls)
- Architecture diagrams and flow charts
- Performance tuning recommendations
- Monitoring and observability setup

---

### 2. [CELERY_IMPLEMENTATION_GUIDE.md](CELERY_IMPLEMENTATION_GUIDE.md) (24 KB)

**Practical implementation roadmap** - Step-by-step guide with code snippets.

**Contents:**
- **Current State Inventory**: What's already built vs. what needs implementation
- **Implementation Roadmap**: 4-week phased approach
  - **Phase 1** (Week 1): TopologicalSorter + Error Classification
  - **Phase 2** (Week 2): State Management + SSE Streaming
  - **Phase 3** (Week 3): Resumable Execution
  - **Phase 4** (Week 4): Monitoring & Production
- **Testing Checklist**: Unit, integration, manual testing procedures
- **Code Locations**: Quick reference to all relevant files
- **Production Deployment Checklist**: Pre-launch verification
- **Performance Targets**: Benchmarks and scalability goals

**Use this document when:**
- Starting implementation work
- Looking for specific code examples
- Planning development phases
- Creating test plans
- Preparing for production launch

**Each task includes:**
- File location (exact path)
- Code snippet (ready to adapt)
- Integration instructions
- Test examples
- Acceptance criteria

---

### 3. [CELERY_DATABASE_SCHEMA.md](CELERY_DATABASE_SCHEMA.md) (17 KB)

**Database design** - Schema, indexes, and data retention strategy.

**Contents:**
- **Current Schema Analysis**: Existing tables and relationships
- **Recommended Additions**:
  - Workflow Execution Events (audit log)
  - Workflow Checkpoints (resumable state)
  - Workflow Execution Metrics (analytics)
  - Celery Task Tracking (optional)
- **Schema Design Patterns**:
  - JSONB for flexible node data
  - Partitioning for scale
  - Materialized views for analytics
- **Index Strategy**: Critical vs. optional indexes
- **Common Queries**: Ready-to-use SQL for operations
- **Data Retention**: TTL strategy and automated cleanup
- **Migration Path**: No breaking changes

**Use this document when:**
- Designing database migrations
- Creating indexes for performance
- Building analytics/reporting features
- Setting up data retention policies
- Optimizing query performance
- Scaling to millions of executions

**Key benefits:**
- JSONB support for flexible workflow data
- Audit trail for debugging
- Analytics-ready schema
- Backward compatible (no breaking changes)
- Proven index patterns

---

## Quick Navigation

### By Use Case

**I want to understand the overall architecture**
→ Start with [CELERY_REDIS_RESEARCH.md](CELERY_REDIS_RESEARCH.md) §1-3

**I need to start implementing**
→ Start with [CELERY_IMPLEMENTATION_GUIDE.md](CELERY_IMPLEMENTATION_GUIDE.md) Phase 1

**I need to handle errors properly**
→ [CELERY_REDIS_RESEARCH.md](CELERY_REDIS_RESEARCH.md) §6 + [CELERY_IMPLEMENTATION_GUIDE.md](CELERY_IMPLEMENTATION_GUIDE.md) Task 1.2

**I need real-time progress updates**
→ [CELERY_REDIS_RESEARCH.md](CELERY_REDIS_RESEARCH.md) §4 + [CELERY_IMPLEMENTATION_GUIDE.md](CELERY_IMPLEMENTATION_GUIDE.md) Task 2.2

**I need to pause/resume workflows**
→ [CELERY_REDIS_RESEARCH.md](CELERY_REDIS_RESEARCH.md) §3 + [CELERY_IMPLEMENTATION_GUIDE.md](CELERY_IMPLEMENTATION_GUIDE.md) Task 3.1

**I need to optimize node execution order**
→ [CELERY_REDIS_RESEARCH.md](CELERY_REDIS_RESEARCH.md) §5 + [CELERY_IMPLEMENTATION_GUIDE.md](CELERY_IMPLEMENTATION_GUIDE.md) Task 1.1

**I need database design guidance**
→ [CELERY_DATABASE_SCHEMA.md](CELERY_DATABASE_SCHEMA.md)

**I need to set up monitoring**
→ [CELERY_REDIS_RESEARCH.md](CELERY_REDIS_RESEARCH.md) §7 + [CELERY_IMPLEMENTATION_GUIDE.md](CELERY_IMPLEMENTATION_GUIDE.md) Task 4.1

---

## Technology Stack

### Core Technologies
- **Python 3.11+**: Async/await support
- **FastAPI 0.109+**: REST API + SSE streaming
- **Celery 5.3.4**: Distributed task queue
- **Redis 7**: Message broker + result backend + cache
- **PostgreSQL 16 with pgvector**: Permanent storage + vector embeddings
- **Docker Compose**: Production-ready orchestration

### Database
- **workflow_templates**: Reusable workflow definitions (ReactFlow format)
- **workflow_executions**: Running instances of workflows
- **agent_jobs**: Individual node execution log
- **workflow_execution_events** *(recommended)*: Audit trail
- **workflow_checkpoints** *(recommended)*: Resumable state snapshots
- **workflow_execution_metrics** *(recommended)*: Analytics data

### Key Services (Currently Implemented)
- `backend/celery_app.py`: Celery configuration
- `backend/tasks/workflow_tasks.py`: Task definitions
- `backend/services/workflow_engine.py`: Execution orchestration
- `backend/services/workflow_validator.py`: Cycle detection
- `backend/services/node_executor.py`: Node handlers
- `docker-compose.yml`: Container orchestration

### Key Services (To Be Implemented)
- `backend/services/topological_sort.py`: Node ordering
- `backend/services/state_manager.py`: Redis + PostgreSQL caching
- `backend/services/error_handler.py`: Retry logic
- `backend/services/resumable_workflow.py`: Pause/resume
- `backend/routers/executions.py`: Execution endpoints (SSE)

---

## Core Concepts

### 1. State Management: Redis + PostgreSQL Hybrid

```
Fast Path (Read):           Slow Path (Durability):
Client → Redis Cache        → Sync to PostgreSQL every 30s
         (24h TTL)             (permanent record)
```

**Why both?**
- Redis: Sub-50ms reads for progress updates
- PostgreSQL: Guaranteed durability, audit trail, analytics

**Sync strategy:** Write-through cache with periodic batch sync

---

### 2. Resumable Execution: Node Checkpointing

```
Original node order:     Paused after node 3:    Resume from node 4:
1. Generate Copy         ✓ Node 1 - Done         4. Generate Image (skip 1-3)
2. Generate Image    →   ✓ Node 2 - Done      →  5. Attach (run)
3. Review               ✓ Node 3 - Done         6. Complete
4. Attach               ⏸ Paused here
5. Complete
```

**Key pattern:** Query completed nodes from AgentJob table, skip on resume

---

### 3. Error Classification: Transient vs Permanent

```
Transient (Retry):        Permanent (Fail):      Partial (Pause):
- Timeout (30s+)          - Validation error     - Human review needed
- Rate limited 429        - 404 Not Found        - Content moderation flag
- 503 Unavailable         - 403 Unauthorized     - Policy violation
→ Exponential backoff      → Fail immediately     → Pause for review
```

---

### 4. Real-time Updates: SSE Streaming

```
Browser                 FastAPI              Redis Cache
  │                       │                      │
  ├─ EventSource ─────────┤                      │
  │  /stream              ├─ Poll every 500ms ──┤
  │                       │                      │
  │ ← data: {...} ─────────────────────────────┬─ State update
  │ ← data: {...} ─────────────────────────────┤ from Celery
  │ ← event: done ───────────────────────────────┤
  └─ close ──────────────────────────────────────┘
```

**Fallback:** Poll `/api/workflows/{id}/status` if SSE fails

---

### 5. Topological Sort: Dependency Ordering

```
Execution Plan:
Level 0 (no deps):     Generate Copy
                              ↓
Level 1 (1 dep):       Gen Image, Review (parallel)
                         ↓         ↓
Level 2 (2 deps):       Attach
                              ↓
Level 3:               Complete

Algorithm: Kahn's (BFS) - O(V+E) time
Guarantee: Acyclic (validated during template creation)
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Implement TopologicalSorter (Kahn's algorithm)
- [ ] Create ErrorHandler with classification
- [ ] Integrate into workflow_engine.py
- **Output:** Correct node ordering, proper error handling

### Phase 2: State & Streaming (Week 2)
- [ ] Implement WorkflowStateManager
- [ ] Create SSE streaming endpoint
- [ ] Add polling fallback
- **Output:** Real-time progress updates to frontend

### Phase 3: Resumable Execution (Week 3)
- [ ] Implement ResumableWorkflowEngine
- [ ] Add pause/resume API endpoints
- [ ] Test checkpoint recovery
- **Output:** Pause/resume functionality with full resumability

### Phase 4: Production (Week 4)
- [ ] Add Flower monitoring
- [ ] Implement structured logging
- [ ] Database migrations
- [ ] Load testing
- **Output:** Production-ready system

---

## Decision Summary

| Decision | Technology | Rationale |
|----------|-----------|-----------|
| Async Queue | Celery 5.3.4 | Python standard, native FastAPI integration |
| Broker | Redis | Fast, native lists, ~10K msgs/sec |
| Result Backend | Redis (DB 1) | Low latency for temporary results |
| State Cache | Redis (DB 0) | Sub-50ms read for progress updates |
| State Durability | PostgreSQL | Audit trail, analytics, guaranteed persistence |
| Node Ordering | Kahn's Algorithm | O(V+E), deterministic, cycle-free guarantee |
| Real-time Updates | SSE | Browser native, low overhead, polling fallback |
| Error Retry | Exponential Backoff + Jitter | Prevents thundering herd, safe timeout recovery |
| Resume Strategy | Node-level Checkpoints | No partial re-execution, idempotent |
| Monitoring | Flower + Prometheus | Real-time task monitoring + metrics |

---

## File Locations Reference

### Existing Implementation
```
backend/
  celery_app.py                    # Celery configuration
  tasks/
    workflow_tasks.py              # Task definitions
  services/
    workflow_engine.py             # Execution orchestration
    workflow_validator.py          # Validation
    node_executor.py               # Node handlers
  models.py                        # Database models
  routers/
    workflows.py                   # Template management
docker-compose.yml                 # Container setup
```

### To Be Created
```
backend/
  services/
    topological_sort.py            # Kahn's algorithm
    state_manager.py               # State management
    error_handler.py               # Error classification
    resumable_workflow.py          # Pause/resume engine
  routers/
    executions.py                  # Execution endpoints
  logging_config.py                # Structured logging
  migrations/
    009_add_workflow_events.sql     # Audit log table
    010_add_checkpoints.sql         # Checkpoint table
    011_add_metrics.sql             # Metrics table
```

---

## Testing Strategy

### Unit Tests
```python
# Test topological sort
test_kahn_sort_order()
test_cycle_detection()
test_execution_levels()

# Test error classification
test_transient_error_retry()
test_permanent_error_no_retry()
test_exponential_backoff()

# Test state manager
test_redis_cache_hit()
test_db_fallback()
test_node_output_persistence()
```

### Integration Tests
```python
# Test full workflow execution
test_complete_workflow()
test_pause_resume_workflow()
test_error_recovery()
test_node_variable_interpolation()
test_parallel_node_execution()
test_sse_streaming()
```

### Load Tests
```bash
# Benchmark
ab -n 1000 -c 100 http://localhost:8000/api/workflows/executions/status
ab -n 100 -c 10 http://localhost:8000/api/workflows/executions/{id}/stream

# Monitor
redis-cli --stat
pg_stat_statements
Flower dashboard (http://localhost:5555)
```

---

## Production Readiness Checklist

### Before Launch
- [ ] All tests passing (unit + integration + load)
- [ ] Celery worker health checks working
- [ ] Redis memory tuned (TTL prevents exhaustion)
- [ ] PostgreSQL indexes created and analyzed
- [ ] Monitoring (Flower) accessible
- [ ] Structured logging configured
- [ ] Error alerts configured
- [ ] Database backups automated
- [ ] Rate limiting tuned
- [ ] Worker concurrency optimized
- [ ] Load test completed
- [ ] Rollback plan documented
- [ ] On-call runbook prepared

### Monitoring Metrics
- Task execution time (p50, p95, p99)
- Task failure rate
- Worker queue depth
- Redis memory usage
- PostgreSQL connection pool
- SSE connection count
- Workflow completion time

---

## Performance Targets

### Execution Performance
- Node execution: <100ms average
- Progress update: <50ms (Redis + SSE)
- Pause/resume: <500ms
- 1000-node workflow: <5 minutes total

### Scalability
- 100 concurrent workflows
- 10 workers × 4 concurrency = 40 parallel tasks
- <50ms p99 SSE latency
- <1GB Redis memory (24h TTL)

### Cost Targets
- Worker CPU: 80-90% utilization
- Redis memory: <80% capacity
- PostgreSQL: <50% connections

---

## References

### Documentation Links
- [Celery Documentation](https://docs.celeryproject.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Redis Commands](https://redis.io/commands/)
- [PostgreSQL JSON](https://www.postgresql.org/docs/current/datatype-json.html)

### Key Papers/Articles
- Kahn, A. B. (1962). "Topological sorting of large networks"
- Server-Sent Events (SSE): https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- Exponential Backoff with Jitter: AWS Architecture Blog

### Related Patterns
- Circuit Breaker (error handling)
- Saga Pattern (distributed transactions)
- CQRS (command query responsibility segregation)
- Event Sourcing (audit trail)

---

## Document Versions

| Document | Version | Date | Size |
|----------|---------|------|------|
| CELERY_REDIS_RESEARCH.md | 1.0 | 2025-11-25 | 63 KB |
| CELERY_IMPLEMENTATION_GUIDE.md | 1.0 | 2025-11-25 | 24 KB |
| CELERY_DATABASE_SCHEMA.md | 1.0 | 2025-11-25 | 17 KB |
| CELERY_DOCS_INDEX.md | 1.0 | 2025-11-25 | This file |

---

## How to Use These Documents

### For Architecture Review
1. Read **CELERY_REDIS_RESEARCH.md** §1-3 for overall design
2. Review decision matrices and rationale
3. Check deployment architecture (§7)

### For Implementation
1. Start with **CELERY_IMPLEMENTATION_GUIDE.md** current state
2. Follow phased roadmap (4 weeks)
3. Copy code snippets and adapt
4. Reference **CELERY_REDIS_RESEARCH.md** for detailed patterns

### For Database Work
1. Review **CELERY_DATABASE_SCHEMA.md** current schema
2. Plan migration using recommended additions
3. Run schema creation scripts
4. Create indexes per strategy

### For Production Deployment
1. Complete all implementation phases
2. Run full test suite
3. Verify monitoring setup
4. Check production checklist
5. Deploy with rollback plan

---

## Questions & Support

### Common Questions

**Q: Why both Redis and PostgreSQL?**
A: Redis for speed (progress updates), PostgreSQL for durability (audit trail, analytics). Write-through cache pattern ensures consistency.

**Q: Can a node execute multiple times?**
A: No. The engine checks AgentJob table before executing. Completed nodes are skipped on resume (idempotent).

**Q: What if a worker crashes during task execution?**
A: Celery re-queues the task (task_acks_late=True). On resume, skip completed nodes and restart from first pending node.

**Q: How do I scale to 1000 concurrent workflows?**
A: Horizontal scaling: add more workers (each with 4 concurrency). Use task routing to separate high-priority from regular workflows.

**Q: What's the difference between pause and stop?**
A: **Pause** = can be resumed. **Stop** = execution ends, no resumption.

---

## Glossary

| Term | Definition |
|------|-----------|
| **DAG** | Directed Acyclic Graph - workflow nodes with dependencies |
| **Topological Sort** | Ordering nodes so dependencies come first |
| **Idempotent** | Safe to execute multiple times with same result |
| **SSE** | Server-Sent Events - one-way server to client streaming |
| **Transient Error** | Temporary failure, safe to retry (timeout, rate limit) |
| **Permanent Error** | Won't be fixed by retry (validation, 404, auth) |
| **Checkpoint** | State snapshot for resumable execution |
| **Node** | Single step in workflow (generate copy, image, etc.) |
| **Execution** | Running instance of a workflow template |
| **Celery Worker** | Process executing async tasks from queue |

---

**Last Updated:** 2025-11-25
**Status:** Production-Ready Research Complete
**Next Steps:** Begin Phase 1 Implementation (Week 1)

