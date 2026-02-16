# Arrow Articles - Architecture Diagram

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                         (React Frontend - Port 3000)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────────┐        ┌──────────────────────┐
        │   CRUD Operations    │        │  Complex Operations  │
        │   (Direct Access)    │        │   (via Backend API)  │
        └──────────────────────┘        └──────────────────────┘
                    │                                 │
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────────┐        ┌──────────────────────┐
        │   Supabase Client    │        │   Axios HTTP Client  │
        │   (anon key)         │        │   (JWT Bearer)       │
        └──────────────────────┘        └──────────────────────┘
                    │                                 │
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────────┐        ┌──────────────────────┐
        │  Supabase Backend    │        │  NestJS Backend      │
        │  PostgreSQL + RLS    │        │  (Port 3001)         │
        └──────────────────────┘        └──────────────────────┘
                    │                                 │
                    │                    ┌────────────┴────────────┐
                    │                    │                         │
                    │                    ▼                         ▼
                    │        ┌──────────────────┐    ┌──────────────────┐
                    │        │  OpenAI API      │    │ WordPress REST   │
                    │        │  (GPT-4)         │    │ API              │
                    │        └──────────────────┘    └──────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────────────┐
        │         Database Tables                   │
        │  ┌────────────────────────────────────┐  │
        │  │  arrow_articles                    │  │
        │  │  - id (uuid, PK)                   │  │
        │  │  - user_id (uuid, FK → auth.users) │  │
        │  │  - project_id (int, FK → projects) │  │
        │  │  - title, content                  │  │
        │  │  - meta_description, excerpt       │  │
        │  │  - primary_keyword                 │  │
        │  │  - secondary_keywords (array)      │  │
        │  │  - cta_config (jsonb)              │  │
        │  │  - template_type                   │  │
        │  │  - status, wpPost_id               │  │
        │  │  - created_at, updated_at          │  │
        │  └────────────────────────────────────┘  │
        │                                           │
        │  ┌────────────────────────────────────┐  │
        │  │  arrow_article_metrics             │  │
        │  │  - id (uuid, PK)                   │  │
        │  │  - arrow_article_id (uuid, FK)     │  │
        │  │  - date                            │  │
        │  │  - views, ctr, conversions         │  │
        │  │  - avg_time_on_page                │  │
        │  └────────────────────────────────────┘  │
        └──────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Create Arrow Article Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ Clicks "New Arrow Article"
     ▼
┌─────────────────────────────┐
│  CreateArrowArticleModal    │
│  - Multi-step form          │
│  - React Hook Form + Zod    │
└────────────┬────────────────┘
             │ Submit form
             ▼
┌──────────────────────────────────────┐
│  useCreateArrowArticle (mutation)    │
│  - Validate input                    │
│  - Get current user                  │
└────────────┬─────────────────────────┘
             │ POST data
             ▼
┌──────────────────────────────────────┐
│  Supabase Client                     │
│  supabase.from('arrow_articles')     │
│         .insert(data)                │
└────────────┬─────────────────────────┘
             │ Check permissions
             ▼
┌──────────────────────────────────────┐
│  Row Level Security (RLS)            │
│  Policy: user_id = auth.uid()        │
└────────────┬─────────────────────────┘
             │ Insert allowed
             ▼
┌──────────────────────────────────────┐
│  PostgreSQL Database                 │
│  INSERT INTO arrow_articles          │
│  RETURNING *                         │
└────────────┬─────────────────────────┘
             │ Return new record
             ▼
┌──────────────────────────────────────┐
│  Frontend                            │
│  - Invalidate queries                │
│  - Close modal                       │
│  - Show success message              │
│  - Refresh list                      │
└──────────────────────────────────────┘
```

### 2. Generate Content Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ Clicks "Generate Content"
     ▼
┌─────────────────────────────┐
│  useGenerateContent         │
│  (mutation)                 │
└────────────┬────────────────┘
             │ POST /api/arrow-articles/:id/generate
             ▼
┌──────────────────────────────────────┐
│  Backend API (NestJS)                │
│  Arrow Articles Controller           │
│  @UseGuards(JwtAuthGuard)            │
└────────────┬─────────────────────────┘
             │ Validate JWT, extract user
             ▼
┌──────────────────────────────────────┐
│  Arrow Articles Service              │
│  - Fetch article from Supabase       │
│  - Verify user owns article          │
└────────────┬─────────────────────────┘
             │ Fetch with service_role key
             ▼
┌──────────────────────────────────────┐
│  Supabase (Service Role)             │
│  SELECT * FROM arrow_articles        │
│  WHERE id = :id                      │
└────────────┬─────────────────────────┘
             │ Return article data
             ▼
┌──────────────────────────────────────┐
│  Content Generator Service           │
│  - Build prompt from article data    │
│  - Include keywords, template, CTA   │
└────────────┬─────────────────────────┘
             │ Call OpenAI API
             ▼
┌──────────────────────────────────────┐
│  OpenAI API                          │
│  - Model: GPT-4 Turbo                │
│  - Generate HTML content             │
│  - Return tokens used                │
└────────────┬─────────────────────────┘
             │ Return generated content
             ▼
┌──────────────────────────────────────┐
│  Arrow Articles Service              │
│  - Update article with content       │
│  - Set status = 'ready'              │
│  - Store token usage                 │
└────────────┬─────────────────────────┘
             │ UPDATE with service_role
             ▼
┌──────────────────────────────────────┐
│  Supabase (Service Role)             │
│  UPDATE arrow_articles SET           │
│    content = :content,               │
│    status = 'ready',                 │
│    input_tokens = :input,            │
│    output_tokens = :output           │
│  WHERE id = :id                      │
└────────────┬─────────────────────────┘
             │ Return updated record
             ▼
┌──────────────────────────────────────┐
│  Frontend                            │
│  - Invalidate queries                │
│  - Refetch article                   │
│  - Show editor with content          │
│  - Deduct credits                    │
└──────────────────────────────────────┘
```

### 3. Publish to WordPress Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ Clicks "Publish to WordPress"
     ▼
┌─────────────────────────────┐
│  PublishModal               │
│  - Configure options        │
│  - Select categories/tags   │
└────────────┬────────────────┘
             │ Confirm publish
             ▼
┌──────────────────────────────────────┐
│  usePublishToWordPress               │
│  (mutation)                          │
└────────────┬─────────────────────────┘
             │ POST /api/arrow-articles/:id/publish
             ▼
┌──────────────────────────────────────┐
│  Backend API (NestJS)                │
│  Arrow Articles Controller           │
└────────────┬─────────────────────────┘
             │ Validate user
             ▼
┌──────────────────────────────────────┐
│  Arrow Articles Service              │
│  - Fetch article from Supabase       │
│  - Fetch project (WordPress creds)   │
└────────────┬─────────────────────────┘
             │ Get WordPress credentials
             ▼
┌──────────────────────────────────────┐
│  WordPress Publisher Service         │
│  - Prepare article for WP            │
│  - Upload featured image (if any)    │
└────────────┬─────────────────────────┘
             │ POST to WP REST API
             ▼
┌──────────────────────────────────────┐
│  WordPress REST API                  │
│  POST /wp-json/wp/v2/posts           │
│  - Authenticate with app password    │
│  - Create/update post                │
└────────────┬─────────────────────────┘
             │ Return post ID and URL
             ▼
┌──────────────────────────────────────┐
│  WordPress Publisher Service         │
│  - Extract post ID                   │
│  - Build response                    │
└────────────┬─────────────────────────┘
             │ Update article record
             ▼
┌──────────────────────────────────────┐
│  Supabase (Service Role)             │
│  UPDATE arrow_articles SET           │
│    wpPost_id = :id,                  │
│    status = 'published',             │
│    published_at = NOW()              │
│  WHERE id = :id                      │
└────────────┬─────────────────────────┘
             │ Return success
             ▼
┌──────────────────────────────────────┐
│  Frontend                            │
│  - Invalidate queries                │
│  - Show success message              │
│  - Display WP post link              │
│  - Update article status             │
└──────────────────────────────────────┘
```

## Component Hierarchy

```
ArrowArticlesPage
├── Header
│   ├── Title
│   └── CreateButton → Opens CreateArrowArticleModal
│
├── Filters
│   ├── ProjectFilter (Select)
│   ├── StatusFilter (Select)
│   ├── SearchInput
│   └── DateRangePicker
│
├── ArrowArticlesTable
│   ├── TableHeader
│   │   ├── TitleColumn (sortable)
│   │   ├── ProjectColumn (sortable)
│   │   ├── StatusColumn (sortable)
│   │   ├── KeywordColumn
│   │   ├── CTAColumn
│   │   └── ActionsColumn
│   │
│   └── TableBody
│       └── ArrowArticleRow (for each article)
│           ├── Title (with link to preview)
│           ├── ProjectName
│           ├── StatusBadge
│           ├── PrimaryKeyword
│           ├── CTAType
│           └── ActionButtons
│               ├── PreviewButton
│               ├── GenerateButton
│               ├── PublishButton
│               └── DeleteButton
│
├── Pagination
│   ├── PreviousButton
│   ├── PageNumbers
│   └── NextButton
│
└── Modals (conditional renders)
    ├── CreateArrowArticleModal
    │   ├── StepIndicator
    │   ├── Step1_ProjectSelection
    │   ├── Step2_ContentSettings
    │   ├── Step3_SEOConfiguration
    │   ├── Step4_CTASetup
    │   ├── Step5_TemplateSelection
    │   └── NavigationButtons
    │
    ├── ArrowArticlePreviewModal
    │   ├── PreviewHeader (meta title, description)
    │   ├── ArticleContent (styled as blog)
    │   ├── CTAHighlights
    │   └── SEOSummary
    │
    └── PublishModal
        ├── WordPressSettings
        │   ├── StatusSelect (draft/publish)
        │   ├── CategoriesMultiselect
        │   ├── TagsMultiselect
        │   └── FeaturedImageUpload
        │
        └── PublishButton
```

## State Management

### TanStack Query Cache Structure

```
Query Cache:
{
  ['arrow-articles']: {
    // List of all articles for current user
    data: ArrowArticle[]
    filters: { project_id?, status?, search? }
  },

  ['arrow-articles', articleId]: {
    // Single article detail
    data: ArrowArticle
  },

  ['arrow-article-metrics', articleId]: {
    // Performance metrics for article
    data: {
      views: number
      ctr: number
      conversions: number
      avg_time_on_page: number
    }
  },

  ['projects']: {
    // User's projects (for dropdown)
    data: Project[]
  }
}

Mutation State:
{
  createArrowArticle: { isPending, error, data },
  updateArrowArticle: { isPending, error, data },
  deleteArrowArticle: { isPending, error, data },
  generateContent: { isPending, error, data },
  publishToWordPress: { isPending, error, data }
}
```

### Component Local State

```typescript
CreateArrowArticleModal:
  - step: number (1-5)
  - secondaryKeywords: string[]
  - formData: CreateArrowArticleInput (managed by React Hook Form)

ArrowArticlesPage:
  - filters: { project_id?, status?, search?, dateRange? }
  - currentPage: number
  - selectedArticle: ArrowArticle | null
  - modalStates: {
      createOpen: boolean
      previewOpen: boolean
      publishOpen: boolean
    }

ArrowArticlePreviewModal:
  - previewMode: 'desktop' | 'mobile'
  - showSEO: boolean
```

## Security Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Public Zone)                    │
│  ✅ Can Access:                                             │
│    - arrow_articles table (via RLS)                         │
│    - projects table (via RLS)                               │
│    - Supabase anon key (rate-limited)                       │
│                                                              │
│  ❌ Cannot Access:                                          │
│    - OpenAI API key                                         │
│    - WordPress credentials                                  │
│    - Supabase service_role key                              │
│    - Other users' data                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS + JWT
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Protected Zone)                    │
│  ✅ Can Access:                                             │
│    - OpenAI API (with secret key)                           │
│    - WordPress API (with encrypted credentials)             │
│    - Supabase service_role (bypass RLS when needed)         │
│    - All database tables                                    │
│                                                              │
│  🔒 Security Measures:                                      │
│    - JWT validation on all endpoints                        │
│    - User ownership verification                            │
│    - WordPress credentials stored encrypted                 │
│    - Rate limiting on expensive operations                  │
│    - Input validation (DTOs + class-validator)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (RLS Zone)                     │
│  RLS Policies:                                              │
│    SELECT: user_id = auth.uid() OR is_admin(auth.uid())     │
│    INSERT: user_id = auth.uid()                             │
│    UPDATE: user_id = auth.uid() OR is_admin(auth.uid())     │
│    DELETE: user_id = auth.uid() OR is_admin(auth.uid())     │
│                                                              │
│  Bypass RLS:                                                │
│    - Backend service_role key                               │
│    - Used for: content generation updates, publishing       │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization

### Database Indexes

```sql
-- Improve query performance
CREATE INDEX idx_arrow_articles_user_id ON arrow_articles(user_id);
CREATE INDEX idx_arrow_articles_project_id ON arrow_articles(project_id);
CREATE INDEX idx_arrow_articles_status ON arrow_articles(status);
CREATE INDEX idx_arrow_articles_created_at ON arrow_articles(created_at DESC);
CREATE INDEX idx_arrow_articles_primary_keyword ON arrow_articles(primary_keyword);

-- Composite index for common filter combinations
CREATE INDEX idx_arrow_articles_user_status_created
  ON arrow_articles(user_id, status, created_at DESC);
```

### Frontend Caching Strategy

```typescript
// List query - cache for 1 minute
queryKey: ['arrow-articles', filters]
staleTime: 60_000 // 1 minute
cacheTime: 5 * 60_000 // 5 minutes

// Detail query - cache for 5 minutes
queryKey: ['arrow-articles', id]
staleTime: 5 * 60_000
cacheTime: 10 * 60_000

// Metrics query - cache for 5 minutes, auto-refresh
queryKey: ['arrow-article-metrics', id]
staleTime: 5 * 60_000
refetchInterval: 5 * 60_000
```

### Code Splitting

```typescript
// Lazy load heavy components
const CreateArrowArticleModal = lazy(() =>
  import('./components/CreateArrowArticleModal')
)

const ArrowArticlePreviewModal = lazy(() =>
  import('./components/ArrowArticlePreviewModal')
)

const TiptapEditor = lazy(() => import('@/shared/components/TiptapEditor'))
```

## Error Handling Strategy

```typescript
// Frontend error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <ArrowArticlesPage />
</ErrorBoundary>

// Query error handling
const { data, error, isError } = useArrowArticles()

if (isError) {
  return <ErrorMessage error={error} retry={refetch} />
}

// Mutation error handling
const createMutation = useCreateArrowArticle({
  onError: (error) => {
    toast.error(getErrorMessage(error))
  },
})

// Backend error handling
try {
  await this.openai.chat.completions.create(...)
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    throw new HttpException('Rate limit exceeded', 429)
  }
  throw new HttpException('Content generation failed', 500)
}
```

This architecture ensures security, performance, and maintainability while following the BaaS-first approach defined in the project guidelines.
