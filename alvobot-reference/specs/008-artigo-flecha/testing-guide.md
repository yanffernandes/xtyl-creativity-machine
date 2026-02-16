# Arrow Articles Testing Guide

## Test Data Setup

### Required Test Users

```sql
-- Test User 1: Basic user with projects
INSERT INTO auth.users (id, email, encrypted_password)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'test.user@alvobot.com',
  crypt('TestPassword123!', gen_salt('bf'))
);

-- Test User 2: User without projects (edge case)
INSERT INTO auth.users (id, email, encrypted_password)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'noproject.user@alvobot.com',
  crypt('TestPassword123!', gen_salt('bf'))
);
```

### Test Projects

```sql
-- Test Project 1: Valid WordPress configuration
INSERT INTO public.projects (id, user_id, name, domain, login, pass, status)
VALUES (
  1001,
  '11111111-1111-1111-1111-111111111111',
  'Marketing Blog',
  'https://marketing-blog-test.com',
  'admin',
  'encrypted_app_password_here',
  true
);

-- Test Project 2: Invalid WordPress credentials (error testing)
INSERT INTO public.projects (id, user_id, name, domain, login, pass, status)
VALUES (
  1002,
  '11111111-1111-1111-1111-111111111111',
  'Tech Blog',
  'https://tech-blog-test.com',
  'wrong_user',
  'wrong_password',
  false
);
```

### Test Arrow Articles

```sql
-- Test Article 1: Draft state
INSERT INTO public.arrow_articles (
  id,
  user_id,
  project_id,
  title,
  meta_description,
  primary_keyword,
  secondary_keywords,
  cta_config,
  template_type,
  status
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  1001,
  '10 Email Marketing Strategies That Actually Work',
  'Discover proven email marketing strategies to boost your ROI by 300%. Includes templates, examples, and step-by-step guidance.',
  'email marketing strategies',
  ARRAY['email conversion', 'email automation', 'marketing ROI'],
  '{"type": "button", "text": "Start Free Trial", "url": "https://example.com/signup", "position": "middle"}',
  'listicle',
  'draft'
);

-- Test Article 2: Ready state with content
INSERT INTO public.arrow_articles (
  id,
  user_id,
  project_id,
  title,
  content,
  meta_description,
  primary_keyword,
  cta_config,
  template_type,
  status
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  1001,
  'Complete Guide to SEO in 2025',
  '<h1>Complete Guide to SEO in 2025</h1><p>SEO has evolved...</p>',
  'Learn everything about SEO in 2025. This comprehensive guide covers on-page, off-page, and technical SEO best practices.',
  'SEO guide 2025',
  '{"type": "form", "text": "Get SEO Checklist", "url": "#newsletter", "position": "bottom"}',
  'ultimate_guide',
  'ready'
);

-- Test Article 3: Published state
INSERT INTO public.arrow_articles (
  id,
  user_id,
  project_id,
  title,
  content,
  meta_description,
  primary_keyword,
  cta_config,
  template_type,
  status,
  wpPost_id,
  published_at
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  1001,
  'Best CRM Software: 2025 Comparison',
  '<h1>Best CRM Software: 2025 Comparison</h1><p>Choosing the right CRM...</p>',
  'Compare the top CRM software of 2025. Detailed analysis of features, pricing, and use cases for businesses of all sizes.',
  'best CRM software',
  '{"type": "button", "text": "View CRM Comparison", "url": "https://example.com/crm", "position": "top"}',
  'comparison',
  'published',
  12345,
  now() - interval '7 days'
);
```

## Unit Tests

### Frontend - Arrow Articles API Queries

```typescript
// frontend/src/features/arrow-articles/api/queries.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useArrowArticles } from './queries'
import { supabase } from '@/shared/utils/supabase'

vi.mock('@/shared/utils/supabase')

describe('useArrowArticles', () => {
  it('fetches arrow articles for current user', async () => {
    const mockArticles = [
      {
        id: '33333333-3333-3333-3333-333333333333',
        title: '10 Email Marketing Strategies',
        status: 'draft',
      },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: mockArticles,
          error: null,
        }),
      }),
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useArrowArticles(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockArticles)
    expect(supabase.from).toHaveBeenCalledWith('arrow_articles')
  })

  it('filters articles by status', async () => {
    const mockArticles = [
      { id: '1', status: 'published' },
      { id: '2', status: 'published' },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockArticles,
            error: null,
          }),
        }),
      }),
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(
      () => useArrowArticles({ status: 'published' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.every((a) => a.status === 'published')).toBe(true)
  })
})
```

### Frontend - Create Arrow Article Mutation

```typescript
// frontend/src/features/arrow-articles/api/mutations.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCreateArrowArticle } from './mutations'
import { supabase } from '@/shared/utils/supabase'

vi.mock('@/shared/utils/supabase')

describe('useCreateArrowArticle', () => {
  it('creates arrow article with valid data', async () => {
    const mockArticle = {
      id: 'new-id',
      title: 'New Article',
      status: 'draft',
    }

    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockArticle,
            error: null,
          }),
        }),
      }),
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useCreateArrowArticle(), { wrapper })

    const input = {
      project_id: 1001,
      title: 'New Article',
      meta_description: 'Test description',
      primary_keyword: 'test keyword',
      cta_config: {
        type: 'button' as const,
        text: 'Click here',
        url: 'https://example.com',
        position: 'bottom' as const,
      },
      template_type: 'listicle' as const,
    }

    result.current.mutate(input)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockArticle)
  })

  it('handles validation errors', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: {
              message: 'title cannot be null',
              code: '23502',
            },
          }),
        }),
      }),
    } as any)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useCreateArrowArticle(), { wrapper })

    const invalidInput = {
      project_id: 1001,
      // Missing required fields
    } as any

    result.current.mutate(invalidInput)

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

### Backend - Content Generator Service

```typescript
// backend/src/modules/arrow-articles/services/content-generator.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { ContentGeneratorService } from './content-generator.service'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'

describe('ContentGeneratorService', () => {
  let service: ContentGeneratorService
  let openAiMock: jest.Mocked<OpenAI>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentGeneratorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OPENAI_API_KEY') return 'test-api-key'
              return null
            }),
          },
        },
      ],
    }).compile()

    service = module.get<ContentGeneratorService>(ContentGeneratorService)
    openAiMock = (service as any).openai as jest.Mocked<OpenAI>
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('generateContent', () => {
    it('should generate listicle content', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '<h1>Test Article</h1><p>Generated content...</p>',
            },
          },
        ],
        usage: {
          prompt_tokens: 500,
          completion_tokens: 1500,
        },
      }

      openAiMock.chat.completions.create = jest
        .fn()
        .mockResolvedValue(mockResponse)

      const input = {
        template_type: 'listicle',
        title: 'Test Article',
        meta_description: 'Test description',
        primary_keyword: 'test keyword',
        secondary_keywords: ['related keyword'],
        cta_config: {
          type: 'button',
          text: 'Click here',
          url: 'https://example.com',
          position: 'middle',
        },
        target_word_count: 1500,
      }

      const result = await service.generateContent(input)

      expect(result.content).toContain('<h1>Test Article</h1>')
      expect(result.input_tokens).toBe(500)
      expect(result.output_tokens).toBe(1500)
    })

    it('should include CTA at specified position', async () => {
      const mockContent = `
        <h1>Test</h1>
        <p>Intro</p>
        <div class="cta-box">
          <a href="https://example.com">Click here</a>
        </div>
        <p>More content</p>
      `

      openAiMock.chat.completions.create = jest.fn().mockResolvedValue({
        choices: [{ message: { content: mockContent } }],
        usage: { prompt_tokens: 100, completion_tokens: 200 },
      })

      const input = {
        template_type: 'listicle',
        title: 'Test',
        meta_description: 'Test',
        primary_keyword: 'test',
        cta_config: {
          type: 'button',
          text: 'Click here',
          url: 'https://example.com',
          position: 'middle',
        },
        target_word_count: 1000,
      }

      const result = await service.generateContent(input)

      expect(result.content).toContain('cta-box')
      expect(result.content).toContain('Click here')
    })

    it('should handle OpenAI API errors', async () => {
      openAiMock.chat.completions.create = jest
        .fn()
        .mockRejectedValue(new Error('API rate limit exceeded'))

      const input = {
        template_type: 'listicle',
        title: 'Test',
        meta_description: 'Test',
        primary_keyword: 'test',
        cta_config: {
          type: 'button',
          text: 'Click',
          url: 'https://example.com',
          position: 'bottom',
        },
        target_word_count: 1000,
      }

      await expect(service.generateContent(input)).rejects.toThrow(
        'API rate limit exceeded'
      )
    })
  })
})
```

### Backend - WordPress Publisher Service

```typescript
// backend/src/modules/arrow-articles/services/wordpress-publisher.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { WordPressPublisherService } from './wordpress-publisher.service'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('WordPressPublisherService', () => {
  let service: WordPressPublisherService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WordPressPublisherService],
    }).compile()

    service = module.get<WordPressPublisherService>(WordPressPublisherService)
  })

  describe('publishArticle', () => {
    it('should publish article to WordPress', async () => {
      const mockWpResponse = {
        data: {
          id: 12345,
          link: 'https://blog.com/test-article',
          status: 'publish',
        },
      }

      mockedAxios.post.mockResolvedValue(mockWpResponse)

      const input = {
        domain: 'https://blog.com',
        username: 'admin',
        app_password: 'test_password',
        title: 'Test Article',
        content: '<p>Test content</p>',
        status: 'publish',
      }

      const result = await service.publishArticle(input)

      expect(result.wpPost_id).toBe(12345)
      expect(result.wpPost_url).toBe('https://blog.com/test-article')
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://blog.com/wp-json/wp/v2/posts',
        expect.objectContaining({
          title: 'Test Article',
          content: '<p>Test content</p>',
          status: 'publish',
        }),
        expect.objectContaining({
          auth: {
            username: 'admin',
            password: 'test_password',
          },
        })
      )
    })

    it('should handle authentication errors', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: {
            code: 'rest_forbidden',
            message: 'Invalid credentials',
          },
        },
      })

      const input = {
        domain: 'https://blog.com',
        username: 'wrong',
        app_password: 'wrong',
        title: 'Test',
        content: '<p>Test</p>',
        status: 'publish',
      }

      await expect(service.publishArticle(input)).rejects.toThrow(
        'Invalid credentials'
      )
    })

    it('should upload featured image', async () => {
      const mockMediaResponse = {
        data: {
          id: 67890,
          source_url: 'https://blog.com/wp-content/uploads/image.jpg',
        },
      }

      const mockPostResponse = {
        data: {
          id: 12345,
          link: 'https://blog.com/test',
        },
      }

      mockedAxios.post
        .mockResolvedValueOnce(mockMediaResponse) // First call: upload image
        .mockResolvedValueOnce(mockPostResponse) // Second call: create post

      const input = {
        domain: 'https://blog.com',
        username: 'admin',
        app_password: 'test',
        title: 'Test',
        content: '<p>Test</p>',
        status: 'publish',
        featured_image_url: 'https://example.com/image.jpg',
      }

      const result = await service.publishArticle(input)

      expect(result.wpFeaturedMedia_id).toBe(67890)
      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })
  })
})
```

## Integration Tests

### End-to-End Arrow Article Creation Flow

```typescript
// e2e/arrow-articles.e2e.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Arrow Articles', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test.user@alvobot.com')
    await page.fill('input[name="password"]', 'TestPassword123!')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should create arrow article successfully', async ({ page }) => {
    // Navigate to arrow articles page
    await page.goto('/artigos-flecha')
    await expect(page.locator('h1')).toContainText('Artigos Flecha')

    // Click create button
    await page.click('button:has-text("Novo Artigo Flecha")')

    // Wait for modal to open
    await expect(page.locator('[role="dialog"]')).toBeVisible()

    // Step 1: Select project
    await page.click('select[name="project_id"]')
    await page.click('option:has-text("Marketing Blog")')
    await page.click('button:has-text("Próximo")')

    // Step 2: Content settings
    await page.fill(
      'input[name="title"]',
      '10 Email Marketing Strategies That Work'
    )
    await page.fill(
      'textarea[name="meta_description"]',
      'Discover proven email marketing strategies to boost ROI.'
    )
    await page.fill('input[name="target_word_count"]', '1500')
    await page.click('button:has-text("Próximo")')

    // Step 3: SEO configuration
    await page.fill('input[name="primary_keyword"]', 'email marketing strategies')
    await page.fill(
      'input[name="secondary_keywords"]',
      'email conversion, email automation'
    )
    await page.press('input[name="secondary_keywords"]', 'Enter')
    await page.click('button:has-text("Próximo")')

    // Step 4: CTA setup
    await page.selectOption('select[name="cta_type"]', 'button')
    await page.fill('input[name="cta_text"]', 'Start Free Trial')
    await page.fill('input[name="cta_url"]', 'https://example.com/signup')
    await page.selectOption('select[name="cta_position"]', 'middle')
    await page.click('button:has-text("Próximo")')

    // Step 5: Template selection
    await page.click('input[value="listicle"]')
    await page.click('button:has-text("Criar Artigo")')

    // Wait for success and modal close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()

    // Verify article appears in list
    await expect(
      page.locator('tr:has-text("10 Email Marketing Strategies That Work")')
    ).toBeVisible()
  })

  test('should generate content for arrow article', async ({ page }) => {
    // Navigate to article
    await page.goto('/artigos-flecha')
    await page.click('tr:has-text("10 Email Marketing Strategies") >> button')

    // Click generate content
    await page.click('button:has-text("Gerar Conteúdo")')

    // Wait for generation (may take time)
    await expect(page.locator('text=Gerando conteúdo...')).toBeVisible()

    // Wait for completion (timeout 60s)
    await expect(page.locator('.tiptap-editor')).toBeVisible({ timeout: 60000 })

    // Verify content exists
    const editorContent = await page.locator('.tiptap-editor').textContent()
    expect(editorContent).toBeTruthy()
    expect(editorContent?.length).toBeGreaterThan(100)
  })

  test('should publish article to WordPress', async ({ page }) => {
    // Navigate to ready article
    await page.goto('/artigos-flecha')
    await page.click(
      'tr:has-text("Complete Guide to SEO") >> button:has-text("Publicar")'
    )

    // Configure publish options
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await page.selectOption('select[name="status"]', 'publish')
    await page.click('button:has-text("Publicar Agora")')

    // Wait for success message
    await expect(page.locator('text=Artigo publicado com sucesso')).toBeVisible()

    // Verify status updated
    await expect(
      page.locator('tr:has-text("Complete Guide to SEO") >> td:has-text("Publicado")')
    ).toBeVisible()
  })

  test('should filter articles by status', async ({ page }) => {
    await page.goto('/artigos-flecha')

    // Filter by published
    await page.selectOption('select[name="status_filter"]', 'published')

    // Verify only published articles shown
    const rows = page.locator('tbody tr')
    const count = await rows.count()

    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).locator('td:nth-child(3)')).toContainText(
        'Publicado'
      )
    }
  })
})
```

## Manual Testing Checklist

### Arrow Article Creation
- [ ] Modal opens when clicking "New Arrow Article"
- [ ] All form steps are accessible via "Next" and "Previous"
- [ ] Required field validation works (red border + error message)
- [ ] Project dropdown shows only user's projects
- [ ] Character counters update in real-time (title, meta description)
- [ ] Secondary keywords can be added/removed via tag input
- [ ] CTA preview updates based on type selection
- [ ] Template preview shows structure example
- [ ] "Create" button is disabled until all required fields filled
- [ ] Cancel button shows confirmation if changes made
- [ ] Success message appears after creation
- [ ] New article appears in list immediately

### Content Generation
- [ ] "Generate Content" button is disabled for articles without required fields
- [ ] Loading spinner appears during generation
- [ ] Progress indicator shows estimated time
- [ ] Generated content appears in editor
- [ ] Primary keyword is highlighted in generated content
- [ ] CTA is positioned correctly (top/middle/bottom)
- [ ] Word count is close to target (±10%)
- [ ] Retry works if generation fails
- [ ] Error message is clear if API fails
- [ ] Credits are deducted after successful generation

### WordPress Publishing
- [ ] "Publish" button is disabled for draft articles
- [ ] Publish modal shows WordPress configuration options
- [ ] Invalid credentials show helpful error message
- [ ] Featured image upload works
- [ ] Categories and tags are mapped correctly
- [ ] Published article shows WordPress post ID
- [ ] Status changes to "Published" after success
- [ ] Re-publishing updates existing post (not creates new)
- [ ] Error messages include troubleshooting steps

### Performance & UX
- [ ] List loads in under 2 seconds with 100+ articles
- [ ] Filters apply instantly (no page reload)
- [ ] Pagination works correctly
- [ ] Sorting by column works
- [ ] Search filters correctly
- [ ] Mobile view is responsive
- [ ] Keyboard navigation works in modal
- [ ] Focus management is correct (modal open/close)

### Security & RLS
- [ ] User can only see their own articles
- [ ] User cannot access other users' articles via direct URL
- [ ] User cannot create article for project they don't own
- [ ] WordPress credentials are never exposed in frontend
- [ ] API endpoints require authentication
- [ ] RLS policies prevent unauthorized access

### Edge Cases
- [ ] User with no projects sees "Create Project" message
- [ ] Deleting project soft-deletes associated articles
- [ ] Network failure during creation auto-saves draft
- [ ] Browser crash recovery works (unsaved changes)
- [ ] Very long titles are truncated in list view
- [ ] Very long meta descriptions show validation error
- [ ] Invalid URLs in CTA show validation error
- [ ] Keyword density outside range shows warning
- [ ] Duplicate article titles are allowed (no constraint)
- [ ] Empty content can be saved as draft
- [ ] Failed generation doesn't corrupt article record

## Performance Benchmarks

```typescript
// Load time targets
const performanceTargets = {
  listLoad: 2000, // ms
  modalOpen: 500, // ms
  contentGeneration: 60000, // ms (1 min)
  wordPressPublish: 10000, // ms
  filterApply: 500, // ms
  searchQuery: 300, // ms
}

// Test with Lighthouse
test('Arrow Articles page performance', async ({ page }) => {
  await page.goto('/artigos-flecha')

  const performanceMetrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0]
    return {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
    }
  })

  expect(performanceMetrics.loadTime).toBeLessThan(2000)
  expect(performanceMetrics.firstPaint).toBeLessThan(1000)
})
```

## Accessibility Testing

```typescript
// ARIA labels and roles
test('Arrow Articles accessibility', async ({ page }) => {
  await page.goto('/artigos-flecha')

  // Check ARIA labels
  await expect(page.locator('[role="button"]')).toHaveAttribute(
    'aria-label',
    /.+/
  )

  // Check keyboard navigation
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toBeVisible()

  // Check modal focus trap
  await page.click('button:has-text("Novo Artigo Flecha")')
  await page.keyboard.press('Tab')
  const focusedElement = await page.locator(':focus')
  const dialogElement = page.locator('[role="dialog"]')
  expect(await dialogElement.evaluate((el, focused) => el.contains(focused), await focusedElement.elementHandle())).toBe(true)

  // Check screen reader announcements
  await expect(page.locator('[role="status"]')).toBeVisible()
})
```

## Notes

- Run integration tests against a test WordPress instance (not production)
- Use separate test database for E2E tests
- Mock OpenAI API in unit tests to avoid costs and rate limits
- Test with real OpenAI API in staging environment
- Verify RLS policies with multiple test users
- Test browser compatibility (Chrome, Firefox, Safari, Edge)
- Test responsive design at breakpoints: 320px, 768px, 1024px, 1440px
- Performance test with realistic data volumes (100, 500, 1000 articles)
