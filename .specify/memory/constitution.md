<!--
SYNC IMPACT REPORT
==================
Version Change: 1.0.0 → 1.1.0
Date: 2025-11-24

Changes:
- ✅ Enhanced Principle III (User Experience Excellence) with premium design focus
- ✅ Added progressive complexity requirements for different user skill levels
- ✅ Added comprehensive error handling and user feedback standards
- ✅ Added new "Design & Visual Identity" section under Quality Standards
- ✅ Materially expanded UX guidance with specific premium design requirements

Modified Principles:
- III. User Experience Excellence → Enhanced with premium design language, progressive disclosure, and error recovery patterns

Added Sections:
- Design & Visual Identity (under Quality & Security Standards)
- Progressive Complexity Guidelines (under Quality & Security Standards)
- Error Handling Standards (enhanced existing content)

Templates Status:
- ✅ spec-template.md - Aligned (user stories accommodate different skill levels)
- ✅ plan-template.md - Aligned (Constitution Check includes new UX requirements)
- ✅ tasks-template.md - Aligned (task organization supports iterative polish)
- ⚠️  checklist-template.md - Should include design review checklist items
- ⚠️  agent-file-template.md - Should reference premium design standards

Follow-up TODOs:
- Consider adding design review checklist template
- Consider documenting color palette and typography standards in separate design guide
- Consider creating component library documentation for premium UI patterns
-->

# XTYL Creativity Machine Constitution

## Core Principles

### I. AI-First Development

**The application is built around AI-powered content creation and assistance.**

- All features MUST treat AI capabilities (LLM chat, image generation, RAG) as first-class citizens
- AI interactions MUST support streaming responses for real-time feedback
- Tool approval workflows MUST be implemented for user control over AI actions
- AI services MUST gracefully handle API failures with clear user feedback
- Templates and prompts MUST be designed by industry experts and proven frameworks
- AI-generated content MUST integrate seamlessly with editor workflows

**Rationale**: XTYL is fundamentally an AI creativity platform. AI is not an add-on but the core value proposition. User trust requires transparency and control over AI operations.

### II. API-First Architecture

**Backend APIs define the contract; frontend consumes well-defined endpoints.**

- Backend MUST expose comprehensive REST APIs with OpenAPI documentation (`/docs`)
- All business logic MUST reside in backend services, not frontend
- API contracts MUST be stable and versioned for breaking changes
- Frontend MUST use typed API clients with clear error handling
- Authentication MUST be JWT-based with secure token management
- CORS MUST be properly configured for frontend-backend communication

**Rationale**: Clear API boundaries enable independent frontend/backend development, easier testing, and potential future integrations (mobile apps, third-party tools).

### III. User Experience Excellence

**The application MUST deliver a premium, elegant experience that adapts to user expertise.**

#### Premium Visual Design (NON-NEGOTIABLE)

- UI MUST convey premium quality through refined visual language (not generic SaaS aesthetics)
- Design MUST be unique and memorable while maintaining professional elegance
- Visual hierarchy MUST be clear with purposeful use of whitespace and typography
- Animations MUST be subtle, purposeful, and enhance (not distract from) functionality
- Color palette MUST be sophisticated with intentional contrast and brand consistency
- Component design MUST avoid off-the-shelf appearance (customize Shadcn/UI thoughtfully)

#### Progressive Complexity

- Interface MUST adapt to user skill level without being condescending
- **Novice users**: Clear onboarding, contextual help, safe defaults, guided workflows
- **Intermediate users**: Keyboard shortcuts, bulk actions, customization options
- **Expert users**: Advanced features, API access, automation, power user shortcuts
- Help/documentation MUST be contextual and progressive (show more as users explore)
- Features MUST have "simple mode" and "advanced mode" where complexity varies significantly

#### Interaction & Feedback

- Loading states MUST be clear with elegant skeletons and progress indicators (never blank screens)
- Errors MUST be user-friendly with actionable recovery steps (not stack traces)
- Success feedback MUST be celebratory but not intrusive
- Actions MUST provide immediate feedback (optimistic UI where safe)
- Navigation MUST be intuitive with clear workspace → project → creation hierarchy
- Editor MUST support both markdown and rich text with real-time preview
- Default content MUST be empty or contextually helpful (no confusing placeholder text)

#### Performance as UX

- Initial page load MUST be under 2 seconds on 3G connection
- Interactions MUST feel instant (optimistic updates, prefetching)
- Large operations MUST show progress with time estimates when possible
- Background work MUST never block the UI (always async with feedback)

**Rationale**: Premium positioning requires premium experience. Users span from creative professionals to technical experts - the interface must scale with them. Fast, elegant interfaces with intelligent error handling are non-negotiable for a tool positioned as professional-grade.

### IV. Production-Ready Deployments

**All code MUST be deployable to production with Docker Compose.**

- Services MUST use multi-stage Docker builds for optimized images
- All services MUST implement health check endpoints (`/health`)
- Services MUST use `depends_on` with health conditions for proper startup ordering
- Environment variables MUST follow 12-factor app principles (separate dev/prod configs)
- Build-time variables (`NEXT_PUBLIC_*`) MUST be passed as Docker build args
- Network binding MUST use `0.0.0.0` for container accessibility
- Deployment MUST support platforms like Easypanel (no `container_name`, configurable ports)

**Rationale**: Docker-first approach ensures consistency across dev/staging/prod environments. Proper health checks prevent cascading failures. Easypanel compatibility enables easy deployment.

### V. Data Integrity & Security

**User data MUST be protected with industry-standard security practices.**

- Authentication MUST use bcrypt password hashing (never plain text)
- Email verification MUST be enforced before sensitive operations
- Database credentials MUST be strong (20+ characters) and environment-specific
- API keys MUST never be committed to version control (use `.env` files in `.gitignore`)
- File uploads MUST be validated for type, size, and malicious content
- Storage MUST use MinIO/S3 with proper bucket policies (public read for public assets only)
- HTTPS MUST be enforced in production for all traffic
- SQL injection MUST be prevented using ORMs (SQLAlchemy) and parameterized queries

**Rationale**: Security breaches destroy trust and can be catastrophic. Defense in depth with multiple layers is required.

### VI. Scalability & Performance

**The application MUST handle concurrent users efficiently.**

- Heavy operations (image generation, document processing) MUST be asynchronous
- Caching MUST be used for frequently accessed data (Redis)
- Database queries MUST use indexes on frequently searched columns
- File storage MUST be external (MinIO) not database BLOBs
- Vector embeddings MUST use pgvector extension for efficient RAG queries
- Streaming responses MUST be used for long-running AI operations
- Resource limits MUST be set in Docker Compose for stability

**Rationale**: Performance directly impacts user satisfaction. Async operations prevent blocking. Proper caching and indexing ensure the app scales beyond initial users.

### VII. Testing & Quality Assurance

**Code quality MUST be maintained through testing and type safety.**

- Integration tests MUST cover critical user journeys (auth, document upload, chat)
- API endpoints MUST be tested for success and error cases
- Type safety MUST be enforced (TypeScript for frontend, Python type hints for backend)
- Error handling MUST log errors without exposing sensitive data to users
- Database migrations MUST be versioned and tested (Alembic)
- Race conditions MUST be identified and fixed (e.g., tool approval timing issues)
- Breaking changes MUST be caught before deployment

**Rationale**: Tests prevent regressions. Type safety catches errors at compile time. Proper error handling improves debuggability without compromising security.

## Architecture & Technology

### Technology Stack (NON-NEGOTIABLE)

- **Frontend**: Next.js 14+ (App Router), TypeScript, Shadcn/UI (customized), Tailwind CSS
- **Backend**: FastAPI (Python 3.11+), SQLAlchemy ORM, Pydantic schemas
- **Database**: PostgreSQL 15+ with pgvector extension
- **Caching**: Redis 7+
- **Storage**: MinIO (S3-compatible)
- **AI Services**: OpenRouter (multi-LLM), image generation APIs
- **Deployment**: Docker Compose, Easypanel-compatible

**Rationale**: These technologies are battle-tested, well-documented, and provide the best developer experience for this use case.

### Project Structure (MUST FOLLOW)

```
xtyl-creativity-machine/
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and API clients
│   ├── Dockerfile.prod    # Production Docker build
│   └── package.json
├── backend/               # FastAPI backend
│   ├── routers/           # API route handlers
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   ├── crud.py            # Database operations
│   ├── *_service.py       # Business logic services
│   ├── migrations/        # Alembic database migrations
│   ├── Dockerfile.prod    # Production Docker build
│   └── requirements.txt
├── docker-compose.yml     # Production orchestration
├── docker-compose.dev.yml # Development with hot reload
├── .env.example           # Environment template
└── .specify/              # Project governance
    ├── memory/
    │   └── constitution.md # This file
    └── templates/         # Spec, plan, task templates
```

### External Services

**MUST integrate with**:
- OpenRouter API (LLM chat, multi-provider)
- Image generation APIs (thumbnails, creative assets)
- Brevo API (transactional emails)
- MinIO/S3 (file storage with public URLs)

**MAY integrate with**:
- Tavily (web search)
- Additional LLM providers (OpenAI, Anthropic direct)

## Quality & Security Standards

### Design & Visual Identity

#### Visual Language

- **Typography**: Use type scale with clear hierarchy (h1-h6, body, caption)
- **Spacing**: Consistent spacing system (4px, 8px, 16px, 24px, 32px, 48px, 64px)
- **Colors**: Curated palette with purposeful semantic meaning (not arbitrary)
- **Shadows**: Subtle depth cues (avoid harsh Material Design-style shadows)
- **Borders**: Minimal, refined (1px max, use sparingly)
- **Corners**: Consistent border radius (subtle curves, not overly rounded)

#### Component Standards

- Buttons MUST have clear visual weight (primary, secondary, tertiary hierarchy)
- Input fields MUST have elegant focus states with smooth transitions
- Cards MUST use subtle elevation with refined shadows
- Modals/dialogs MUST have graceful enter/exit animations
- Toast notifications MUST be positioned consistently and dismissible
- Loading indicators MUST be branded (custom spinners, not default CSS loaders)

#### Responsive Design

- Mobile-first approach with breakpoints: 640px, 768px, 1024px, 1280px, 1536px
- Touch targets MUST be 44x44px minimum on mobile
- Typography MUST scale appropriately across devices
- Navigation MUST adapt elegantly (responsive menu, not just hidden)

### Progressive Complexity Guidelines

#### Feature Discovery

- New features MUST be introduced contextually (not in overwhelming dumps)
- Advanced features MUST be discoverable but not obstructive
- Tooltips MUST be informative but concise (< 80 characters)
- Keyboard shortcuts MUST be displayed contextually (command palette, tooltips)

#### Information Architecture

- Navigation MUST use progressive disclosure (show more as users explore)
- Settings MUST be organized by user sophistication (basic → advanced)
- Documentation MUST have quick start (novice) and deep dives (expert)
- Empty states MUST guide next actions without being patronizing

#### User Segmentation

- **Novice indicators**: First login, no projects created, guided tours active
- **Intermediate indicators**: Multiple projects, custom templates used
- **Expert indicators**: API usage, keyboard shortcuts used, automation configured

### Error Handling Standards

#### Error Classification

- **User Errors** (400s): Clear guidance on what went wrong and how to fix it
- **System Errors** (500s): Apologetic tone, report sent notification, fallback actions
- **Network Errors**: Offline indicators, retry mechanisms, optimistic updates preserved
- **Validation Errors**: Inline, real-time, specific to field (not generic)

#### Error Messages (MUST FOLLOW)

```
❌ Bad:  "Error: 500 Internal Server Error"
✅ Good: "Something went wrong on our end. We've been notified and are investigating.
         You can try again or contact support if this persists."

❌ Bad:  "Invalid input"
✅ Good: "Email address must include @ symbol and domain (e.g., user@example.com)"

❌ Bad:  "Request failed"
✅ Good: "Couldn't save your changes. Check your internet connection and try again."
```

#### Error Recovery

- All errors MUST offer a recovery action (retry, go back, contact support)
- Critical errors MUST preserve user work (autosave, local storage)
- Transient errors MUST retry automatically with exponential backoff
- Fatal errors MUST provide export/download of user data before exit

### Environment Variable Management

- `.env.example` MUST document all required variables with placeholder values
- `.env` files MUST be in `.gitignore` (never commit secrets)
- Production `.env` MUST use strong secrets generated with `openssl rand -hex 32`
- Build-time variables MUST be prefixed with `NEXT_PUBLIC_` and passed as Docker args
- Runtime variables MUST be injected via `docker-compose.yml` environment section

### API Design

- All endpoints MUST have clear success/error responses
- Errors MUST use appropriate HTTP status codes (400, 401, 403, 404, 500)
- Streaming endpoints MUST use Server-Sent Events (SSE) protocol
- File uploads MUST be multipart/form-data with size limits
- Rate limiting SHOULD be implemented for AI-intensive endpoints

### Database Practices

- Migrations MUST be atomic and reversible
- Foreign keys MUST enforce referential integrity
- Indexes MUST exist on commonly queried columns (user_id, workspace_id, project_id)
- Timestamps (created_at, updated_at) MUST be tracked on all entities
- Soft deletes MAY be used for user-facing content (deleted_at column)

### Storage Practices

- Public assets (thumbnails, exports) MUST have public read bucket policies
- Private assets (user documents) MUST require authenticated URLs
- File naming MUST use UUIDs to prevent collisions and info leakage
- Image formats MUST be optimized (WebP for thumbnails, JPEG/PNG for originals)
- Storage URLs MUST use public domain (`MINIO_PUBLIC_URL`) not localhost

## Governance

### Amendment Procedure

1. Propose amendment via discussion (GitHub issue or team meeting)
2. Document rationale and impact on existing code/templates
3. Update constitution with version bump following semantic versioning
4. Update dependent templates (spec, plan, tasks, checklists)
5. Create Sync Impact Report at top of constitution
6. Commit with message: `docs: amend constitution to vX.Y.Z (summary)`

### Versioning Policy

- **MAJOR** (X.0.0): Backward-incompatible governance changes, principle removals, or redefinitions that invalidate existing specs
- **MINOR** (0.X.0): New principles added, section materially expanded, new mandatory requirements
- **PATCH** (0.0.X): Clarifications, wording improvements, typo fixes, non-semantic refinements

### Compliance Review

- All feature specs (`/speckit.specify`) MUST align with constitution principles
- All implementation plans (`/speckit.plan`) MUST include "Constitution Check" gate
- Violations MUST be justified in "Complexity Tracking" table in plan.md
- Code reviews MUST verify constitution compliance
- Automation SHOULD enforce rules where possible (linting, CI checks)

### Constitution Supersedes

This constitution takes precedence over:
- Verbal agreements
- Undocumented practices
- Individual preferences
- External frameworks (unless explicitly adopted in this constitution)

When in doubt, refer to this document. If the constitution is unclear, propose an amendment.

**Version**: 1.1.0 | **Ratified**: 2025-11-24 | **Last Amended**: 2025-11-24
