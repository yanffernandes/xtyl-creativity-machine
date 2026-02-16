# Feature Specification: Artigo Flecha ✅ FINALIZADO

**Feature Branch**: `009-artigo-flecha`
**Created**: 2025-12-11
**Status**: ✅ **Implementado**
**Priority**: P2 (Core Content Feature)

## Overview

"Artigo Flecha" (Arrow Article) is a conversion-optimized content creation feature that enables users to create high-converting blog articles with advanced SEO settings, targeted keywords, customizable CTAs, and conversion templates. Unlike regular articles, Arrow Articles are specifically designed to drive user actions and conversions.

### Key Differentiators

- **Conversion Focus**: Built-in CTA configuration and conversion templates
- **Advanced SEO**: Primary and secondary keywords with detailed optimization
- **Performance Tracking**: Dedicated metrics for conversion performance
- **WordPress Integration**: Direct publishing to WordPress sites
- **AI-Powered Generation**: Content creation with conversion optimization prompts

### Business Value

- Increases content ROI by focusing on conversion-optimized articles
- Provides structured approach to keyword targeting and SEO
- Streamlines workflow from creation to publication
- Enables data-driven content strategy through performance metrics

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Arrow Articles List (Priority: P1)

**Scenario**: As a content creator, I want to view all my arrow articles in one place so I can manage my conversion-focused content portfolio.

**Why this priority**: Users need to see their existing arrow articles before creating new ones. This is the entry point to the feature.

**Independent Test**: Can be tested by navigating to the arrow articles page and verifying the list displays correctly with filters and sorting.

**Acceptance Scenarios**:

1. **Given** a user has arrow articles, **When** they navigate to `/artigos-flecha`, **Then** they see a table with columns: Title, Project, Status, Primary Keyword, CTA Type, Created Date, Actions
2. **Given** a user views the list, **When** they apply filters (project, status, date range), **Then** the list updates to show only matching articles
3. **Given** a user clicks on an article row, **When** the click event triggers, **Then** they see the article preview/details
4. **Given** a user has no arrow articles, **When** they view the page, **Then** they see an empty state with "Create Arrow Article" button

---

### User Story 2 - Create Arrow Article Modal (Priority: P1)

**Scenario**: As a content creator, I want to create a new arrow article with all conversion settings in one modal so I can efficiently set up optimized content.

**Why this priority**: Creation is the core functionality. Without it, users cannot use the feature.

**Independent Test**: Can be tested by clicking "New Arrow Article", filling all fields, and verifying the article is created in the database.

**Acceptance Scenarios**:

1. **Given** a user clicks "New Arrow Article", **When** the modal opens, **Then** they see a multi-step form with: Project Selection, Content Settings, SEO Configuration, CTA Setup, Template Selection
2. **Given** a user in the modal, **When** they fill required fields (project, title, primary keyword), **Then** the "Next" button becomes enabled
3. **Given** a user completes all steps, **When** they click "Create", **Then** the arrow article is saved to database and modal closes
4. **Given** a user fills the form, **When** they click "Cancel", **Then** they see a confirmation dialog before discarding changes

**Form Fields**:

**Step 1 - Project Selection**:
- Project dropdown (required) - select from user's active projects
- Show project domain preview

**Step 2 - Content Settings**:
- Title (required, max 100 chars)
- Meta Description (required, 150-160 chars)
- Excerpt (optional, max 300 chars)
- Target Word Count (optional, default 1500)

**Step 3 - SEO Configuration**:
- Primary Keyword (required)
- Secondary Keywords (optional, up to 5, tags input)
- Keyword Density Target (optional, default 1.5%)
- Focus Keyphrase Position (optional: beginning, middle, throughout)

**Step 4 - CTA Setup**:
- CTA Type (dropdown: Button, Form, Link, Banner)
- CTA Text (required if type selected)
- CTA URL/Action (required if type selected)
- CTA Position (dropdown: Top, Middle, Bottom, Multiple)

**Step 5 - Template Selection**:
- Conversion Template (dropdown: Listicle, How-To, Review, Comparison, Ultimate Guide)
- Template preview (show structure example)
- Advanced Options (expandable): Tone, Perspective, Include Sections

---

### User Story 3 - Generate Arrow Article Content (Priority: P2)

**Scenario**: As a content creator, I want to generate conversion-optimized content based on my arrow article settings so I can have a high-quality starting point.

**Why this priority**: After configuration, users need the actual content generation. This is where the value is realized.

**Independent Test**: Can be tested by creating an arrow article and clicking "Generate Content", then verifying content is created with proper structure.

**Acceptance Scenarios**:

1. **Given** a user has created an arrow article, **When** they click "Generate Content", **Then** they see a loading state and progress indicator
2. **Given** content is being generated, **When** the backend AI service completes, **Then** the rich text editor populates with structured content
3. **Given** generated content, **When** user reviews it, **Then** they can see primary keyword highlighted and secondary keywords indicated
4. **Given** a generation error, **When** the backend fails, **Then** user sees error message with retry option

**Backend Requirements**:
- POST `/api/arrow-articles/:id/generate` endpoint
- Uses OpenAI API with conversion-optimized prompts
- Incorporates keywords, template structure, and CTA placement
- Returns HTML content compatible with Tiptap editor
- Tracks token usage and credits

---

### User Story 4 - Preview Arrow Article (Priority: P2)

**Scenario**: As a content creator, I want to preview how my arrow article will look on the blog so I can ensure it meets quality standards before publishing.

**Why this priority**: Preview reduces publishing errors and ensures content quality.

**Independent Test**: Can be tested by clicking preview on any arrow article and verifying it renders correctly.

**Acceptance Scenarios**:

1. **Given** a user views an arrow article, **When** they click "Preview", **Then** they see a modal with blog-styled preview
2. **Given** the preview modal, **When** user scrolls, **Then** they see CTA placements highlighted with visual indicators
3. **Given** the preview, **When** user checks SEO, **Then** they see meta title, description, and keyword usage summary
4. **Given** preview is open, **When** user clicks "Edit", **Then** preview closes and editor opens

---

### User Story 5 - Publish to WordPress (Priority: P2)

**Scenario**: As a content creator, I want to publish my arrow article directly to WordPress so I can go live without manual copy-paste.

**Why this priority**: Publishing automation is a key value proposition of the platform.

**Independent Test**: Can be tested by publishing an arrow article and verifying it appears on WordPress with correct formatting.

**Acceptance Scenarios**:

1. **Given** a user has a completed arrow article, **When** they click "Publish to WordPress", **Then** they see a confirmation modal with publish options
2. **Given** the publish modal, **When** user configures options (publish date, categories, tags, featured image), **Then** options are validated
3. **Given** user confirms publish, **When** backend processes the request, **Then** article is posted to WordPress and status updates to "published"
4. **Given** a publish error, **When** WordPress API fails, **Then** user sees specific error message (authentication, connection, validation) with troubleshooting steps

**Backend Requirements**:
- POST `/api/arrow-articles/:id/publish` endpoint
- Validates WordPress credentials from project settings
- Uses WordPress REST API to create post
- Handles featured image upload if provided
- Maps categories and tags
- Updates article record with `wpPost_id` and `published_at`

---

### User Story 6 - View Performance Metrics (Priority: P3)

**Scenario**: As a content creator, I want to see how my arrow articles perform so I can optimize my content strategy.

**Why this priority**: Metrics enable data-driven decisions and demonstrate ROI.

**Independent Test**: Can be tested by viewing metrics for published arrow articles.

**Acceptance Scenarios**:

1. **Given** a published arrow article, **When** user views article details, **Then** they see metrics card with: Views, CTR, Conversions, Time on Page
2. **Given** metrics are displayed, **When** user selects date range, **Then** metrics update to show filtered data
3. **Given** multiple arrow articles, **When** user views list, **Then** they can sort by performance metrics
4. **Given** insufficient data, **When** metrics are not available, **Then** user sees "Insufficient data" message with date of next update

**Backend Requirements**:
- GET `/api/arrow-articles/:id/metrics` endpoint
- Integrates with Google Analytics API (if configured)
- Tracks WordPress post views (if available)
- Stores metrics snapshots in database for historical tracking

---

### Edge Cases

- What happens when a user tries to create an arrow article without an active project? → Show "Create Project First" message with link to projects page
- What happens if content generation takes too long? → Show progress updates, timeout after 2 minutes with partial content save
- What happens when WordPress credentials are invalid during publish? → Show clear error with link to project settings for credential update
- What happens when a user deletes a project with arrow articles? → Soft delete arrow articles, keep records with project marked as deleted
- What happens when keyword density is too high/low in generated content? → Show warning indicator, allow user to regenerate with adjusted parameters
- What happens when CTA placement fails in template? → Fallback to bottom placement, notify user
- What happens when network fails during creation? → Auto-save draft to local storage, offer recovery on page reload

## Requirements *(mandatory)*

### Functional Requirements

**Data Management**:
- **FR-001**: System MUST store arrow articles in `arrow_articles` table with fields: id, user_id, project_id, title, content, meta_description, excerpt, primary_keyword, secondary_keywords, cta_config, template_type, status, wpPost_id, created_at, updated_at
- **FR-002**: System MUST validate all required fields before saving (project_id, title, meta_description, primary_keyword)
- **FR-003**: System MUST associate each arrow article with exactly one project
- **FR-004**: System MUST enforce Row Level Security policies allowing users to access only their own arrow articles

**CRUD Operations**:
- **FR-005**: System MUST support creating arrow articles via modal form (Frontend → Supabase)
- **FR-006**: System MUST support reading arrow articles list with filters and pagination (Frontend → Supabase)
- **FR-007**: System MUST support updating arrow article content and settings (Frontend → Supabase)
- **FR-008**: System MUST support soft-deleting arrow articles (Frontend → Supabase, set deleted_at)

**Content Generation**:
- **FR-009**: System MUST generate conversion-optimized content via backend endpoint (Frontend → Backend → OpenAI)
- **FR-010**: System MUST incorporate primary keyword, secondary keywords, and selected template in generation prompts
- **FR-011**: System MUST insert CTA elements at specified positions in generated content
- **FR-012**: System MUST track token usage and deduct from user credits
- **FR-013**: System MUST handle generation failures gracefully with retry mechanism

**WordPress Publishing**:
- **FR-014**: System MUST publish arrow articles to WordPress via backend endpoint (Frontend → Backend → WordPress API)
- **FR-015**: System MUST validate WordPress credentials before attempting publish
- **FR-016**: System MUST upload featured images to WordPress media library
- **FR-017**: System MUST map categories and tags from AlvoBot to WordPress
- **FR-018**: System MUST store WordPress post ID in arrow article record after successful publish
- **FR-019**: System MUST update article status to "published" with timestamp

**Preview & Validation**:
- **FR-020**: System MUST display article preview with blog styling
- **FR-021**: System MUST highlight CTA placements in preview mode
- **FR-022**: System MUST show SEO validation (meta title length, description length, keyword usage)
- **FR-023**: System MUST display character counts for title and meta description during editing

**Performance Metrics**:
- **FR-024**: System SHOULD fetch performance metrics from Google Analytics (if configured)
- **FR-025**: System SHOULD store metrics snapshots for historical tracking
- **FR-026**: System SHOULD display metrics in article details and list views

### Non-Functional Requirements

**Performance**:
- **NFR-001**: System MUST load arrow articles list in under 2 seconds
- **NFR-002**: System MUST open creation modal in under 500ms
- **NFR-003**: System MUST generate content in under 60 seconds for 1500-word articles
- **NFR-004**: System MUST publish to WordPress in under 10 seconds

**Usability**:
- **NFR-005**: System MUST display loading states for all async operations
- **NFR-006**: System MUST show validation errors inline on form fields
- **NFR-007**: System MUST provide tooltips for complex fields (keyword density, template selection)
- **NFR-008**: System MUST confirm destructive actions (delete, discard changes)

**Security**:
- **NFR-009**: System MUST enforce RLS policies on arrow_articles table
- **NFR-010**: System MUST validate user owns project before creating arrow article
- **NFR-011**: System MUST store WordPress credentials encrypted in backend
- **NFR-012**: System MUST use JWT authentication for all backend API calls

**Reliability**:
- **NFR-013**: System MUST auto-save article drafts every 30 seconds
- **NFR-014**: System MUST recover unsaved changes after browser crash
- **NFR-015**: System MUST retry failed WordPress publish attempts up to 3 times
- **NFR-016**: System MUST log all errors to monitoring service

### Key Entities

**ArrowArticle**:
```typescript
interface ArrowArticle {
  id: string
  user_id: string
  project_id: number
  title: string
  content: string | null
  meta_description: string
  excerpt: string | null
  primary_keyword: string
  secondary_keywords: string[] | null
  keyword_density_target: number | null
  cta_config: CTAConfig
  template_type: TemplateType
  target_word_count: number
  status: ArticleStatus
  wpPost_id: number | null
  wpFeaturedMedia_id: number | null
  wpCategories_id: number[] | null
  published_at: Date | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

interface CTAConfig {
  type: 'button' | 'form' | 'link' | 'banner'
  text: string
  url: string
  position: 'top' | 'middle' | 'bottom' | 'multiple'
}

type TemplateType = 'listicle' | 'howto' | 'review' | 'comparison' | 'ultimate_guide'
type ArticleStatus = 'draft' | 'generating' | 'ready' | 'published' | 'failed'
```

**Project** (existing):
- Referenced by arrow_articles.project_id
- Contains WordPress credentials (domain, login, pass)

**ArrowArticleMetrics**:
```typescript
interface ArrowArticleMetrics {
  id: string
  arrow_article_id: string
  date: Date
  views: number
  ctr: number
  conversions: number
  avg_time_on_page: number
  created_at: Date
}
```

## Database Schema

### New Table: arrow_articles

```sql
CREATE TABLE public.arrow_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  meta_description TEXT NOT NULL,
  excerpt TEXT,
  primary_keyword TEXT NOT NULL,
  secondary_keywords TEXT[],
  keyword_density_target NUMERIC(3,1) DEFAULT 1.5,
  cta_config JSONB NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('listicle', 'howto', 'review', 'comparison', 'ultimate_guide')),
  target_word_count INT DEFAULT 1500,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'ready', 'published', 'failed')),
  wpPost_id BIGINT,
  wpFeaturedMedia_id BIGINT,
  wpCategories_id BIGINT[],
  published_at TIMESTAMPTZ,
  error TEXT,
  input_tokens BIGINT,
  output_tokens BIGINT,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_arrow_articles_user_id ON public.arrow_articles(user_id);
CREATE INDEX idx_arrow_articles_project_id ON public.arrow_articles(project_id);
CREATE INDEX idx_arrow_articles_status ON public.arrow_articles(status);
CREATE INDEX idx_arrow_articles_primary_keyword ON public.arrow_articles(primary_keyword);
CREATE INDEX idx_arrow_articles_created_at ON public.arrow_articles(created_at DESC);

-- RLS Policies
ALTER TABLE public.arrow_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own arrow articles"
  ON public.arrow_articles FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can insert own arrow articles"
  ON public.arrow_articles FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can update own arrow articles"
  ON public.arrow_articles FOR UPDATE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can delete own arrow articles"
  ON public.arrow_articles FOR DELETE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_arrow_articles_updated_at
  BEFORE UPDATE ON public.arrow_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### New Table: arrow_article_metrics

```sql
CREATE TABLE public.arrow_article_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arrow_article_id UUID NOT NULL REFERENCES public.arrow_articles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INT DEFAULT 0,
  ctr NUMERIC(5,2) DEFAULT 0,
  conversions INT DEFAULT 0,
  avg_time_on_page INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(arrow_article_id, date)
);

-- Indexes
CREATE INDEX idx_arrow_article_metrics_article_id ON public.arrow_article_metrics(arrow_article_id);
CREATE INDEX idx_arrow_article_metrics_date ON public.arrow_article_metrics(date DESC);

-- RLS Policies
ALTER TABLE public.arrow_article_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics for own articles"
  ON public.arrow_article_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.arrow_articles
      WHERE id = arrow_article_metrics.arrow_article_id
      AND user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );
```

## Technical Architecture

### Frontend Structure

```
frontend/src/features/arrow-articles/
├── api/
│   ├── queries.ts              # TanStack Query hooks (list, get)
│   ├── mutations.ts            # TanStack Query mutations (create, update, delete)
│   └── backend.ts              # Backend API calls (generate, publish, metrics)
├── components/
│   ├── ArrowArticlesList.tsx   # Main list view with filters
│   ├── ArrowArticleTable.tsx   # Table component
│   ├── CreateArrowArticleModal.tsx  # Multi-step creation modal
│   ├── ArrowArticlePreview.tsx # Preview modal
│   ├── PublishModal.tsx        # WordPress publish configuration
│   ├── MetricsCard.tsx         # Performance metrics display
│   ├── CTAConfigForm.tsx       # CTA configuration form
│   ├── SEOConfigForm.tsx       # SEO settings form
│   └── TemplateSelector.tsx    # Template selection component
├── pages/
│   └── ArrowArticlesPage.tsx   # Main page
└── types/
    └── index.ts                # TypeScript interfaces
```

### Backend Structure

```
backend/src/modules/arrow-articles/
├── arrow-articles.controller.ts
├── arrow-articles.service.ts
├── arrow-articles.module.ts
├── dto/
│   ├── create-arrow-article.dto.ts
│   ├── update-arrow-article.dto.ts
│   ├── generate-content.dto.ts
│   └── publish-wordpress.dto.ts
└── services/
    ├── content-generator.service.ts   # OpenAI integration
    ├── wordpress-publisher.service.ts # WordPress API integration
    └── metrics-collector.service.ts   # Google Analytics integration
```

### API Endpoints

**Frontend → Supabase (Direct)**:
- `GET /arrow_articles` - List with filters
- `GET /arrow_articles/:id` - Get single article
- `POST /arrow_articles` - Create article
- `PUT /arrow_articles/:id` - Update article
- `DELETE /arrow_articles/:id` - Soft delete article

**Frontend → Backend → External APIs**:
- `POST /api/arrow-articles/:id/generate` - Generate content (OpenAI)
- `POST /api/arrow-articles/:id/publish` - Publish to WordPress
- `GET /api/arrow-articles/:id/metrics` - Fetch metrics (Google Analytics)

### Data Flow Examples

#### Create Arrow Article Flow
```
User → CreateModal → Form Submission
  → Frontend (validation)
  → Supabase.insert('arrow_articles')
  → RLS Policy Check (user_id = auth.uid())
  → Database Insert
  → Frontend (invalidate queries, close modal)
```

#### Generate Content Flow
```
User → Click "Generate Content"
  → Frontend → POST /api/arrow-articles/:id/generate
  → Backend (JwtAuthGuard validates user)
  → Backend (fetch article from Supabase with service_role)
  → Backend (build OpenAI prompt with keywords, template, CTA)
  → OpenAI API (generate content)
  → Backend (update article.content, status, tokens)
  → Frontend (refetch article, show editor)
```

#### Publish to WordPress Flow
```
User → PublishModal → Configure Options → Confirm
  → Frontend → POST /api/arrow-articles/:id/publish
  → Backend (validate user owns article)
  → Backend (fetch WordPress credentials from project)
  → Backend (WordPress REST API authentication)
  → Backend (upload featured image if present)
  → Backend (create WordPress post)
  → Backend (update article: wpPost_id, published_at, status)
  → Frontend (show success, refetch article)
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Feature Completeness**:
- **SC-001**: Users can create arrow articles with all fields (project, title, meta description, keywords, CTA, template)
- **SC-002**: Users can view arrow articles list with filters (project, status, date range) and pagination
- **SC-003**: Users can generate conversion-optimized content via backend AI service
- **SC-004**: Users can preview arrow articles with blog styling and CTA highlights
- **SC-005**: Users can publish arrow articles to WordPress with proper formatting and metadata
- **SC-006**: Users can view performance metrics for published arrow articles (views, CTR, conversions)

**Performance**:
- **SC-007**: Arrow articles list loads in under 2 seconds with 100+ articles
- **SC-008**: Creation modal opens in under 500ms
- **SC-009**: Content generation completes in under 60 seconds for 1500-word articles
- **SC-010**: WordPress publish completes in under 10 seconds

**Data Integrity**:
- **SC-011**: All arrow articles are protected by RLS policies (users can only access their own)
- **SC-012**: Deleting a project soft-deletes associated arrow articles
- **SC-013**: Failed generations do not corrupt article data (status = 'failed', error message stored)
- **SC-014**: All WordPress publishes are idempotent (re-publishing updates existing post)

**User Experience**:
- **SC-015**: All form fields have inline validation with helpful error messages
- **SC-016**: All async operations show loading states with progress indicators
- **SC-017**: All destructive actions require confirmation
- **SC-018**: Unsaved changes trigger warning before navigation

**Integration**:
- **SC-019**: Generated content includes primary keyword with target density
- **SC-020**: Generated content includes all secondary keywords naturally
- **SC-021**: CTA elements are positioned correctly in generated content
- **SC-022**: Published WordPress posts maintain formatting (headings, lists, images)

## Assumptions

- Users have active projects with valid WordPress credentials before creating arrow articles
- OpenAI API key is configured in backend environment
- WordPress sites support REST API (WordPress 4.7+)
- WordPress sites have authentication configured (Application Passwords or JWT)
- Google Analytics integration is optional (metrics gracefully degrade if not configured)
- Users understand SEO concepts (keywords, meta descriptions, CTA)
- Content generation uses GPT-4 or equivalent model with sufficient context window
- WordPress credentials are stored encrypted in backend (not in frontend)

## Out of Scope

**Version 1.0 Exclusions**:
- Bulk creation of arrow articles
- A/B testing different CTAs or templates
- Scheduled publishing to WordPress
- Multi-language arrow article creation
- Direct editing of WordPress content after publish (must edit in AlvoBot and re-publish)
- Automatic keyword research integration
- AI-powered CTA optimization recommendations
- Integration with email marketing platforms
- Social media auto-posting
- SEO competitor analysis within arrow articles
- Conversion funnel tracking beyond basic metrics
- Revenue attribution to specific arrow articles

**Future Considerations**:
- Template customization (users create their own conversion templates)
- Content scoring before publish (readability, SEO score)
- Keyword cannibalization warnings (multiple articles targeting same keyword)
- Internal linking suggestions
- Image generation for featured media and in-content visuals
- Voice/tone consistency checks across arrow articles
- Export to other platforms (Medium, LinkedIn Articles)

## Dependencies

**External Services**:
- OpenAI API (GPT-4 for content generation)
- WordPress REST API (for publishing)
- Google Analytics API (for metrics, optional)

**Internal Systems**:
- Supabase PostgreSQL (data storage)
- Supabase Auth (user authentication)
- Projects module (for WordPress credentials)
- User credits system (for tracking generation usage)

**Libraries**:
- TanStack Query v5 (frontend data fetching)
- React Hook Form v7 (form management)
- Zod v3 (validation)
- Tiptap Editor v2 (rich text editing)
- Axios (backend HTTP client)
- NestJS Passport JWT (backend auth)

## Migration & Rollout

**Phase 1 - Database Setup**:
1. Create `arrow_articles` and `arrow_article_metrics` tables
2. Apply RLS policies
3. Create indexes for performance
4. Verify with test inserts

**Phase 2 - Backend Implementation**:
1. Create NestJS module structure
2. Implement content generation service (OpenAI integration)
3. Implement WordPress publisher service
4. Implement metrics collector service (optional)
5. Add API endpoints with authentication
6. Test with Postman/Insomnia

**Phase 3 - Frontend Implementation**:
1. Create feature folder structure
2. Implement Supabase queries and mutations
3. Build creation modal (multi-step form)
4. Build list view with filters
5. Build preview modal
6. Build publish modal
7. Build metrics display
8. Add route and navigation link

**Phase 4 - Integration Testing**:
1. Test complete create → generate → preview → publish flow
2. Test error scenarios (failed generation, invalid WordPress credentials)
3. Test RLS policies (users cannot see other users' articles)
4. Test performance with large datasets

**Phase 5 - User Acceptance**:
1. Beta test with select users
2. Gather feedback on UX and generation quality
3. Refine prompts and templates
4. Fix reported bugs

**Phase 6 - Production Deployment**:
1. Deploy backend changes
2. Run database migrations
3. Deploy frontend changes
4. Monitor error logs and user feedback
5. Iterate based on real-world usage

## Risks & Mitigations

**Risk**: OpenAI API rate limits or downtime
**Mitigation**: Implement exponential backoff retry, queue system for high-volume, fallback to draft state

**Risk**: WordPress API authentication failures
**Mitigation**: Validate credentials before publish attempt, provide clear error messages with troubleshooting links

**Risk**: Generated content quality issues
**Mitigation**: Allow users to regenerate with different templates, provide editing before publish, gather feedback for prompt refinement

**Risk**: Users exceed credit limits during generation
**Mitigation**: Check credits before generation, show clear message if insufficient, offer credit purchase

**Risk**: Database performance with large article content
**Mitigation**: Index key fields, paginate list views, lazy-load content in editor

**Risk**: Security - exposing WordPress credentials
**Mitigation**: Store credentials encrypted in backend, never send to frontend, use service_role for backend access

## Notes

- Arrow articles are distinct from regular articles (different table, different workflow)
- Content generation is a backend operation due to OpenAI API key security
- WordPress publishing is a backend operation due to credential security
- Metrics collection may be limited without Google Analytics configuration
- Initial version focuses on individual article creation; bulk operations are out of scope
- Template system is predefined in v1; custom templates are future enhancement
- CTA configuration is stored as JSONB for flexibility in future CTA types
