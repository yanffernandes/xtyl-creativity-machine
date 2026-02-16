# Arrow Articles (Artigo Flecha) Feature Specification

## Quick Reference

| Item | Value |
|------|-------|
| **Feature Branch** | `009-artigo-flecha` |
| **Priority** | P2 (Core Content Feature) |
| **Status** | Draft |
| **Complexity** | High |
| **Estimated Effort** | 3-4 weeks |
| **Dependencies** | Projects, OpenAI API, WordPress REST API |

## Documents in This Spec

1. **spec.md** - Complete technical specification
   - User scenarios and acceptance criteria
   - Functional and non-functional requirements
   - Database schema and RLS policies
   - API endpoints and data flows
   - Success criteria and assumptions

2. **prompts-examples.md** - Content generation prompt templates
   - System prompts for AI content generation
   - Template-specific prompts (Listicle, How-To, Review, Comparison, Guide)
   - CTA integration examples
   - Keyword integration strategies
   - Quality check guidelines

3. **testing-guide.md** - Comprehensive testing documentation
   - Test data setup (users, projects, articles)
   - Unit tests (frontend and backend)
   - Integration tests (E2E scenarios)
   - Manual testing checklist
   - Performance benchmarks
   - Accessibility testing

4. **README.md** - This file

## What is Arrow Articles?

Arrow Articles (Artigos Flecha) are conversion-optimized blog articles designed to drive specific user actions. Unlike regular articles, they include:

- **Advanced SEO Configuration**: Primary and secondary keywords with density targets
- **Built-in CTAs**: Configurable call-to-action elements (buttons, forms, links, banners)
- **Conversion Templates**: Pre-designed structures (Listicle, How-To, Review, Comparison, Ultimate Guide)
- **AI-Powered Generation**: Content creation optimized for conversions using GPT-4
- **WordPress Publishing**: One-click publish to WordPress sites
- **Performance Metrics**: Track views, CTR, conversions, and time on page

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Arrow Articles Page                                  │  │
│  │  - List view with filters                            │  │
│  │  - Create modal (multi-step form)                    │  │
│  │  - Preview modal                                     │  │
│  │  - Publish modal                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Data Flows:                                                │
│  ┌─────────────────┐      ┌───────────────────┐           │
│  │ CRUD Operations │─────▶│ Supabase Direct   │           │
│  └─────────────────┘      └───────────────────┘           │
│                                                              │
│  ┌─────────────────┐      ┌───────────────────┐           │
│  │ Generate Content│─────▶│ Backend API       │           │
│  │ Publish to WP   │      │ (OpenAI, WordPress)│           │
│  └─────────────────┘      └───────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────┐          ┌──────────────────────┐
        │ Supabase          │          │ Backend (NestJS)     │
        │ - arrow_articles  │          │ - Content Generator  │
        │ - RLS policies    │          │ - WP Publisher       │
        │ - metrics         │          │ - Metrics Collector  │
        └───────────────────┘          └──────────────────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │                             │
                                    ▼                             ▼
                        ┌──────────────────┐        ┌──────────────────┐
                        │ OpenAI API       │        │ WordPress REST   │
                        │ (GPT-4)          │        │ API              │
                        └──────────────────┘        └──────────────────┘
```

## Key Components

### Frontend (`/frontend/src/features/arrow-articles/`)

**API Layer** (`api/`):
- `queries.ts` - TanStack Query hooks for fetching data from Supabase
- `mutations.ts` - TanStack Query mutations for CRUD operations
- `backend.ts` - HTTP calls to backend API (generate, publish, metrics)

**Components** (`components/`):
- `ArrowArticlesList.tsx` - Main list view
- `ArrowArticleTable.tsx` - Table with sorting/filtering
- `CreateArrowArticleModal.tsx` - Multi-step creation form
- `ArrowArticlePreview.tsx` - Blog-styled preview
- `PublishModal.tsx` - WordPress publish configuration
- `MetricsCard.tsx` - Performance metrics display
- `CTAConfigForm.tsx` - CTA setup form
- `SEOConfigForm.tsx` - SEO settings form
- `TemplateSelector.tsx` - Template picker

**Pages** (`pages/`):
- `ArrowArticlesPage.tsx` - Main route component

**Types** (`types/`):
- TypeScript interfaces for Arrow Articles

### Backend (`/backend/src/modules/arrow-articles/`)

**Module Structure**:
- `arrow-articles.controller.ts` - API endpoints
- `arrow-articles.service.ts` - Business logic
- `arrow-articles.module.ts` - NestJS module

**Services** (`services/`):
- `content-generator.service.ts` - OpenAI integration
- `wordpress-publisher.service.ts` - WordPress API client
- `metrics-collector.service.ts` - Google Analytics (optional)

**DTOs** (`dto/`):
- `create-arrow-article.dto.ts` - Validation
- `generate-content.dto.ts` - Generation request
- `publish-wordpress.dto.ts` - Publish configuration

### Database

**Tables**:
- `arrow_articles` - Main article records
- `arrow_article_metrics` - Performance data

**RLS Policies**:
- Users can only access their own articles
- Admins can access all articles

## Implementation Phases

### Phase 1: Database & Backend Foundation (Week 1)
- [ ] Create database tables and RLS policies
- [ ] Set up NestJS module structure
- [ ] Implement Content Generator Service
- [ ] Implement WordPress Publisher Service
- [ ] Create API endpoints with authentication
- [ ] Test with Postman/Insomnia

### Phase 2: Frontend CRUD (Week 2)
- [ ] Set up feature folder structure
- [ ] Implement Supabase queries and mutations
- [ ] Build Arrow Articles list view
- [ ] Build filters and sorting
- [ ] Build pagination
- [ ] Add routing and navigation

### Phase 3: Creation Flow (Week 2-3)
- [ ] Build multi-step creation modal
- [ ] Implement form validation (React Hook Form + Zod)
- [ ] Add CTA configuration component
- [ ] Add SEO configuration component
- [ ] Add template selector
- [ ] Connect to Supabase insert mutation
- [ ] Test complete creation flow

### Phase 4: Content Generation & Publishing (Week 3)
- [ ] Connect to backend generate endpoint
- [ ] Add loading states and progress indicators
- [ ] Integrate Tiptap editor for content display
- [ ] Build preview modal
- [ ] Build publish modal
- [ ] Connect to backend publish endpoint
- [ ] Handle success and error states

### Phase 5: Metrics & Polish (Week 4)
- [ ] Implement metrics collection (optional)
- [ ] Build metrics display components
- [ ] Add empty states
- [ ] Add error boundaries
- [ ] Refine UX (animations, micro-interactions)
- [ ] Accessibility improvements
- [ ] Performance optimization

### Phase 6: Testing & Deployment (Week 4)
- [ ] Write unit tests (frontend and backend)
- [ ] Write integration tests (E2E)
- [ ] Manual testing checklist
- [ ] Performance testing
- [ ] Security review (RLS, credentials)
- [ ] Beta testing with users
- [ ] Production deployment

## Data Flow Examples

### Create Arrow Article
```
User → CreateModal → Fill Form → Submit
  ↓
Frontend: Validate with Zod schema
  ↓
Frontend: supabase.from('arrow_articles').insert(data)
  ↓
Supabase: Check RLS policy (user_id = auth.uid())
  ↓
Supabase: Insert record
  ↓
Frontend: Invalidate queries, close modal, show success
```

### Generate Content
```
User → Click "Generate Content"
  ↓
Frontend: POST /api/arrow-articles/:id/generate
  ↓
Backend: Validate user owns article (Supabase)
  ↓
Backend: Build OpenAI prompt (template + keywords + CTA)
  ↓
OpenAI: Generate content (GPT-4)
  ↓
Backend: Update article (content, tokens, status)
  ↓
Frontend: Refetch article, show editor
```

### Publish to WordPress
```
User → PublishModal → Configure → Confirm
  ↓
Frontend: POST /api/arrow-articles/:id/publish
  ↓
Backend: Fetch WordPress credentials (service_role)
  ↓
Backend: Upload featured image (if present)
  ↓
WordPress: Upload media, return media ID
  ↓
Backend: Create/update WordPress post
  ↓
WordPress: Return post ID and URL
  ↓
Backend: Update article (wpPost_id, published_at, status)
  ↓
Frontend: Show success, refetch article
```

## Security Considerations

### What Goes in Frontend ✅
- CRUD operations via Supabase (protected by RLS)
- Form validation and UI logic
- Supabase anon key (public, rate-limited)
- Display of article data

### What Goes in Backend 🔒
- OpenAI API calls (API key must stay secret)
- WordPress API calls (credentials must stay secret)
- Service role operations (bypassing RLS)
- External API integrations

### RLS Policies 🛡️
```sql
-- Users can only view own articles
CREATE POLICY "Users can view own arrow articles"
  ON arrow_articles FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Users can only insert for themselves
CREATE POLICY "Users can insert own arrow articles"
  ON arrow_articles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Similar for UPDATE and DELETE
```

## Success Metrics

### Feature Adoption
- [ ] 50% of active users create at least one arrow article within first month
- [ ] Average 5 arrow articles per active user per month
- [ ] 80% of created arrow articles are published to WordPress

### Content Quality
- [ ] Average keyword density within 1-2%
- [ ] 90% of generated content requires minimal editing
- [ ] Average word count within 10% of target

### Performance
- [ ] List loads in under 2 seconds (100+ articles)
- [ ] Content generation completes in under 60 seconds
- [ ] WordPress publish completes in under 10 seconds
- [ ] Zero RLS policy violations

### User Satisfaction
- [ ] NPS score > 8 for arrow articles feature
- [ ] Feature used weekly by 70% of active users
- [ ] Less than 5% error rate on content generation
- [ ] Less than 10% error rate on WordPress publishing

## Common Pitfalls to Avoid

1. **Exposing Secrets in Frontend**
   - ❌ Never put OpenAI API key in frontend
   - ❌ Never put WordPress credentials in frontend
   - ✅ Always route through backend for external APIs

2. **Weak RLS Policies**
   - ❌ Don't allow users to access all articles
   - ❌ Don't forget to check user_id in policies
   - ✅ Test RLS with multiple users

3. **Poor Error Handling**
   - ❌ Don't show generic "Something went wrong"
   - ❌ Don't let errors corrupt article state
   - ✅ Show specific, actionable error messages
   - ✅ Maintain data integrity on failures

4. **Content Generation Issues**
   - ❌ Don't ignore OpenAI rate limits
   - ❌ Don't let generation run indefinitely
   - ✅ Implement timeout and retry logic
   - ✅ Save partial results if possible

5. **WordPress Integration Problems**
   - ❌ Don't assume credentials are always valid
   - ❌ Don't create duplicate posts on retry
   - ✅ Validate credentials before publish
   - ✅ Make publish idempotent (update if exists)

## Related Features

- **Projects** - Arrow articles belong to projects
- **Regular Articles** - Separate table, different workflow
- **WordPress Integration** - Shared credentials from projects
- **User Credits** - Deducted on content generation
- **Dashboard** - Shows recent arrow articles activity

## Questions & Answers

**Q: Why separate table for arrow articles?**
A: Arrow articles have different fields (CTA config, template type, keyword density) and different workflow (generation + publishing) than regular articles. Separate table keeps schema clean.

**Q: Why not generate content in frontend?**
A: OpenAI API key must stay secret. Exposing it in frontend allows abuse and unauthorized usage.

**Q: Can users edit generated content?**
A: Yes, generated content is loaded into Tiptap editor where users can make changes before publishing.

**Q: What happens if WordPress publish fails?**
A: Article status remains "ready", error message is stored, user can retry after fixing credentials/connectivity.

**Q: How are metrics collected?**
A: Optionally via Google Analytics API. If not configured, metrics gracefully degrade to "not available".

**Q: Can arrow articles be scheduled?**
A: Not in v1. Scheduled publishing is a future enhancement.

**Q: What about bulk operations?**
A: Not in v1. Focus is on individual high-quality articles. Bulk creation is future enhancement.

## Next Steps

1. Review this specification with team
2. Clarify any questions or ambiguities
3. Get approval from product/stakeholders
4. Create feature branch `009-artigo-flecha`
5. Start Phase 1 implementation
6. Follow testing guide throughout development
7. Deploy to staging for beta testing
8. Gather feedback and iterate
9. Production deployment

## Support & Feedback

For questions about this specification:
- Create issue in GitHub repo with label `spec:arrow-articles`
- Discuss in team Slack channel #arrow-articles-dev
- Email product owner for clarifications

For implementation questions:
- Refer to CLAUDE.md for architecture guidelines
- Check prompts-examples.md for content generation
- Check testing-guide.md for test scenarios
