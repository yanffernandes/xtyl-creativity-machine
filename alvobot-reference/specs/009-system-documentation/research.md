# Research: System Documentation & Improvements

**Date**: 2024-12-17
**Branch**: `009-system-documentation`

## 1. Email Service Selection

### Decision: Resend

### Rationale
- Modern API design with excellent TypeScript support
- Built specifically for transactional emails
- Simple pricing ($0 for 3,000 emails/month, then $20/month for 50,000)
- React Email templates support (aligns with frontend stack)
- Better deliverability than self-hosted solutions

### Alternatives Considered

| Service | Pros | Cons | Why Rejected |
|---------|------|------|--------------|
| SendGrid | Mature, feature-rich | Complex API, expensive | Overkill for transactional emails |
| AWS SES | Cheap at scale | Complex setup, requires AWS account | Infrastructure overhead |
| Mailgun | Good deliverability | Pricing complexity | Less TypeScript-native |
| Postmark | Excellent deliverability | Higher cost | Budget constraints |

### Implementation Notes
```typescript
// Backend integration
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Workspace invite email
await resend.emails.send({
  from: 'AlvoBot <noreply@alvobot.com>',
  to: email,
  subject: 'Convite para workspace',
  react: WorkspaceInviteEmail({ workspaceName, inviterName }),
});
```

---

## 2. Credit/Subscription System Architecture

### Decision: Supabase-native with Stripe integration

### Rationale
- Keep user data in Supabase (RLS protected)
- Use Stripe for payment processing and subscription management
- Webhook-driven credit updates
- Simple credit tracking in `user_credits` table

### Data Model

```sql
-- User credits table
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  total_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  plan_type TEXT DEFAULT 'free', -- free, starter, pro, enterprise
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
ON user_credits FOR SELECT
USING (auth.uid() = user_id);
```

### Credit Operations

| Operation | Credits |
|-----------|---------|
| Arrow Article Generation | 1 credit |
| Base Article Generation | 3 credits |
| Keyword Mining (batch) | 1 credit per 100 keywords |
| AI Title Generation | 0.5 credits |

### Alternatives Considered

| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| Stripe-only metering | Built-in billing | Complex for simple credits | Overengineered |
| Third-party (Lago, Orb) | Full billing suite | Additional vendor | Unnecessary complexity |
| Custom billing system | Full control | Significant dev effort | Time constraints |

---

## 3. Google Ads API Integration

### Decision: Use official `google-ads-api` npm package

### Rationale
- Official Google client library
- Well-documented with TypeScript types
- Handles OAuth token refresh automatically
- Supports all Google Ads API operations

### Implementation Approach

```typescript
// backend/src/modules/google/google-ads.service.ts
import { GoogleAdsApi, Customer } from 'google-ads-api';

@Injectable()
export class GoogleAdsService {
  private client: GoogleAdsApi;

  constructor(private configService: ConfigService) {
    this.client = new GoogleAdsApi({
      client_id: this.configService.get('GOOGLE_CLIENT_ID'),
      client_secret: this.configService.get('GOOGLE_CLIENT_SECRET'),
      developer_token: this.configService.get('GOOGLE_ADS_DEVELOPER_TOKEN'),
    });
  }

  async getCampaigns(customerId: string, refreshToken: string) {
    const customer = this.client.Customer({
      customer_id: customerId,
      refresh_token: refreshToken,
    });

    return customer.query(`
      SELECT campaign.id, campaign.name, campaign.status
      FROM campaign
      ORDER BY campaign.id
    `);
  }
}
```

### Required Credentials
1. Google Cloud Console project with Google Ads API enabled
2. OAuth 2.0 credentials (client_id, client_secret)
3. Google Ads Developer Token (requires approval)
4. Customer ID from Google Ads account

### Alternatives Considered

| Approach | Pros | Cons | Why Rejected |
|----------|------|------|--------------|
| Direct REST API | No dependencies | Complex OAuth handling | More boilerplate |
| `googleapis` package | Official, general | Less Google Ads specific | Less convenient |

---

## 4. Test Framework Setup

### Decision: Vitest (Frontend) + Jest (Backend)

### Rationale
- **Vitest**: Native Vite integration, fast, ESM-first
- **Jest**: NestJS default, mature ecosystem, good mocking

### Frontend Test Structure

```text
frontend/
├── vitest.config.ts
├── src/
│   └── features/
│       └── auth/
│           ├── components/
│           │   ├── LoginForm.tsx
│           │   └── LoginForm.test.tsx
│           └── api/
│               ├── mutations.ts
│               └── mutations.test.ts
└── tests/
    ├── setup.ts           # Global test setup
    ├── mocks/             # MSW handlers
    └── e2e/               # Playwright tests (future)
```

### Backend Test Structure

```text
backend/
├── jest.config.js
├── src/
│   └── modules/
│       └── wordpress/
│           ├── wordpress.service.ts
│           └── wordpress.service.spec.ts
└── test/
    ├── jest-e2e.json
    └── app.e2e-spec.ts
```

### Test Types by Priority

| Type | Tool | Priority | Coverage Target |
|------|------|----------|-----------------|
| Unit (Frontend) | Vitest + React Testing Library | High | 70% |
| Unit (Backend) | Jest | High | 80% |
| Integration (API) | Jest + Supertest | Medium | Key endpoints |
| E2E | Playwright | Low | Critical flows |

### Alternatives Considered

| Tool | Pros | Cons | Why Rejected |
|------|------|------|--------------|
| Jest for frontend | Familiar | Slower with Vite | Performance |
| Cypress | Great DX | Heavy, overlaps Playwright | Redundant |
| Mocha | Flexible | Less integrated | Less convenient |

---

## 5. Notifications Table Schema

### Decision: Standard notification pattern with read status

### Schema

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL, -- 'article_published', 'task_due', 'workspace_invite', etc.
  title TEXT NOT NULL,
  message TEXT,
  data JSONB, -- Additional context (article_id, task_id, etc.)
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### Notification Types

| Type | Trigger | Data Fields |
|------|---------|-------------|
| `article_published` | WordPress publish success | `article_id`, `project_id` |
| `article_failed` | WordPress publish error | `article_id`, `error_message` |
| `task_due` | Task due date approaching | `task_id`, `due_date` |
| `workspace_invite` | Member invited | `workspace_id`, `inviter_name` |
| `credit_low` | Credits below threshold | `remaining_credits` |
| `flow_completed` | Workflow finished | `flow_id`, `run_id` |
| `flow_failed` | Workflow error | `flow_id`, `error_message` |

---

## 6. CSS Variables Migration Strategy

### Decision: Incremental migration with lint rule

### Approach

1. **Audit**: Identify all hardcoded colors (already done: ~30 in Flow Editor)
2. **Map**: Create mapping of hex values to CSS variables
3. **Migrate**: Replace incrementally, test visually
4. **Lint**: Add stylelint rule to prevent new hardcoded colors

### Color Mapping (Flow Editor)

| Hardcoded | CSS Variable |
|-----------|--------------|
| `#1a1a2e` | `--color-sidebar-bg` (new) |
| `#fbbf24` | `--color-primary` |
| `#10b981` | `--color-success` |
| `#ef4444` | `--color-error` |
| `#6b7280` | `--color-text-secondary` |

### Stylelint Rule

```json
// .stylelintrc.json
{
  "rules": {
    "color-no-hex": true,
    "declaration-property-value-allowed-list": {
      "color": ["/^var\\(--/"],
      "background-color": ["/^var\\(--/"],
      "border-color": ["/^var\\(--/"]
    }
  }
}
```

---

## Summary

| Topic | Decision | Effort | Impact |
|-------|----------|--------|--------|
| Email Service | Resend | Low | High (enables invites) |
| Credit System | Supabase + Stripe | Medium | High (monetization) |
| Google Ads | google-ads-api | High | Medium (feature completion) |
| Testing | Vitest + Jest | High | High (quality) |
| Notifications | Standard table | Low | High (fixes errors) |
| CSS Migration | Incremental + lint | Medium | Medium (maintainability) |
