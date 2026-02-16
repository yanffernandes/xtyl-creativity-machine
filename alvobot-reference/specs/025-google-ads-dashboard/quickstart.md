# Quickstart: Google Ads Performance Dashboard & Automation Engine

**Feature**: 025-google-ads-dashboard
**Date**: 2026-01-13

## Overview

Este guia fornece instruções para desenvolver a feature de Dashboard de Performance do Google Ads com sistema de automações.

## Prerequisites

1. **Conta Google Ads conectada** - O usuário deve ter uma conexão OAuth válida com o Google Ads
2. **Developer Token** - Token de desenvolvedor do Google Ads configurado no backend
3. **Ambiente local** - Frontend (5173), Backend (3001), Supabase local ou remoto

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │           alvoads-google-dashboard (new feature)                 │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌────────────────────────────┐ │   │
│  │  │  Dashboard  │ │ Automations │ │      Action History        │ │   │
│  │  │   Page      │ │    Page     │ │         Page               │ │   │
│  │  └─────────────┘ └─────────────┘ └────────────────────────────┘ │   │
│  │                                                                   │   │
│  │  TanStack Query + Zustand (filters, cache)                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                            HTTP (JWT auth)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (NestJS)                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    google module (extended)                       │   │
│  │  ┌──────────────────┐  ┌────────────────────┐                    │   │
│  │  │ DashboardService │  │ AutomationService  │                    │   │
│  │  │ - getCampaigns() │  │ - CRUD rules       │                    │   │
│  │  │ - pauseCampaign()│  │ - evaluateRules()  │                    │   │
│  │  │ - updateBudget() │  │ - executeAction()  │                    │   │
│  │  └──────────────────┘  └────────────────────┘                    │   │
│  │           │                     │                                  │   │
│  │           └─────────┬───────────┘                                  │   │
│  │                     ▼                                              │   │
│  │         ┌─────────────────────┐                                    │   │
│  │         │  GoogleAdsApiService│  (EXISTING - extend)               │   │
│  │         │  - OAuth tokens     │                                    │   │
│  │         │  - GAQL queries     │                                    │   │
│  │         │  - Mutations        │                                    │   │
│  │         └─────────────────────┘                                    │   │
│  │                     │                                              │   │
│  │    ┌────────────────┴────────────────┐                            │   │
│  │    ▼                                 ▼                            │   │
│  │  Google Ads API              AutomationRunner                     │   │
│  │  (external)                  (cron job)                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                            Supabase client
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE (PostgreSQL)                          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  google_connections (EXISTING)                                    │   │
│  │  - OAuth tokens                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  google_ads_automation_rules (NEW)                                │   │
│  │  - Automation configuration                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  google_ads_action_logs (NEW)                                     │   │
│  │  - Action history (manual + automated)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  google_ads_automation_executions (NEW)                           │   │
│  │  - Execution tracking per campaign                                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Getting Started

### 1. Database Setup

Run the migration to create the new tables:

```bash
# Local Supabase
supabase migration new google_ads_automations

# Copy content from data-model.md SQL sections
# Then apply:
supabase db reset  # or supabase db push
```

### 2. Backend Setup

Extend the existing `google` module:

```bash
cd backend/src/modules/google

# Create new files
touch services/google-dashboard.service.ts
touch services/google-automation.service.ts
touch controllers/google-dashboard.controller.ts
touch controllers/google-automation.controller.ts
touch dto/campaign-metrics.dto.ts
touch dto/campaign-action.dto.ts
touch dto/automation-rule.dto.ts
```

### 3. Frontend Setup

Create the new feature module:

```bash
cd frontend/src/features

# Create feature structure
mkdir -p alvoads-google-dashboard/{api,components,pages,stores,types,hooks}

# Create component directories
mkdir -p alvoads-google-dashboard/components/{CampaignTable,CampaignActions,AutomationList,AutomationForm,ConditionBuilder,ActionHistoryTable}
```

### 4. Add Routes

Update `frontend/src/app/router.tsx`:

```typescript
// Add lazy imports
const GoogleAdsDashboardPage = lazy(() =>
  import('@/features/alvoads-google-dashboard/pages/GoogleAdsDashboardPage')
)
const AutomationsPage = lazy(() =>
  import('@/features/alvoads-google-dashboard/pages/AutomationsPage')
)
const ActionHistoryPage = lazy(() =>
  import('@/features/alvoads-google-dashboard/pages/ActionHistoryPage')
)

// Add routes (inside protected routes)
{ path: 'google-ads', element: <GoogleAdsDashboardPage /> },
{ path: 'google-ads/automations', element: <AutomationsPage /> },
{ path: 'google-ads/history', element: <ActionHistoryPage /> },
```

## Key Implementation Notes

### 1. Stateless Metrics

Metrics are fetched directly from Google Ads API, **never** stored in our database:

```typescript
// ❌ WRONG - Don't store metrics
await supabase.from('campaign_metrics').insert(metrics)

// ✅ CORRECT - Fetch from API, cache in memory
const metrics = await googleAdsApiService.getCampaignMetrics(customerId, period)
// Use TanStack Query with 5min staleTime for caching
```

### 2. User OAuth Tokens

Always use the user's own OAuth tokens, never a shared service account:

```typescript
// Get user's connection
const connection = await supabase
  .from('google_connections')
  .select('*')
  .eq('id', connectionId)
  .eq('user_id', userId)
  .single()

// Use their tokens
const customer = googleAdsClient.Customer({
  customer_id: connection.google_customer_id,
  refresh_token: connection.refresh_token,
})
```

### 3. Condition Builder

The condition builder supports nested AND/OR groups:

```typescript
// Simple condition
const simple: Condition = {
  type: 'condition',
  metric: 'ctr',
  operator: '<',
  value: 0.01,
  period: 'last_7d'
}

// Grouped conditions: (CTR < 1% AND cost > 50) OR (impressions = 0 AND runtime > 4h)
const complex: ConditionGroup = {
  type: 'group',
  operator: 'OR',
  children: [
    {
      type: 'group',
      operator: 'AND',
      children: [
        { type: 'condition', metric: 'ctr', operator: '<', value: 0.01 },
        { type: 'condition', metric: 'cost', operator: '>', value: 50 }
      ]
    },
    {
      type: 'group',
      operator: 'AND',
      children: [
        { type: 'condition', metric: 'impressions', operator: '==', value: 0 },
        { type: 'condition', metric: 'runtime_hours', operator: '>', value: 4 }
      ]
    }
  ]
}
```

### 4. Automation Runner

The cron job evaluates and executes automations:

```typescript
@Injectable()
export class AutomationRunnerJob {
  @Cron(CronExpression.EVERY_MINUTE)
  async runAutomations() {
    // Get all active automations that are due
    const dueAutomations = await this.getDueAutomations()

    for (const automation of dueAutomations) {
      // Check cooldown per campaign
      // Evaluate conditions against live metrics
      // Execute action if conditions met
      // Log result
    }
  }
}
```

## Testing

### Manual Testing Checklist

1. **Dashboard**
   - [ ] Campaigns load with correct metrics
   - [ ] Period filter works (today, 7d, 30d, custom)
   - [ ] Sorting by columns works
   - [ ] Status filter works (active, paused, all)
   - [ ] Alerts show for low-performing campaigns

2. **Actions**
   - [ ] Pause campaign works
   - [ ] Enable campaign works
   - [ ] Update budget works
   - [ ] Duplicate campaign works
   - [ ] All actions logged in history

3. **Automations**
   - [ ] Create automation with simple condition
   - [ ] Create automation with grouped conditions
   - [ ] Test automation (dry run)
   - [ ] Toggle automation on/off
   - [ ] Delete automation
   - [ ] Automation executes on schedule

4. **History**
   - [ ] Manual actions appear
   - [ ] Automated actions appear with rule context
   - [ ] Filters work (source, campaign, action type)
   - [ ] Metrics snapshot visible for automated actions

## Common Issues

### Rate Limiting

```typescript
// Handle 429 errors from Google Ads API
try {
  const result = await this.googleAdsClient.query(gaql)
} catch (error) {
  if (error.code === 'RESOURCE_EXHAUSTED') {
    // Implement exponential backoff
    await this.retryWithBackoff(query, attempt + 1)
  }
}
```

### Token Refresh

```typescript
// Google OAuth tokens expire, ensure refresh logic
if (isTokenExpired(connection.access_token_expires_at)) {
  const newTokens = await this.refreshAccessToken(connection.refresh_token)
  await this.updateConnectionTokens(connectionId, newTokens)
}
```

## Related Documentation

- [spec.md](./spec.md) - Feature specification
- [data-model.md](./data-model.md) - Database schema
- [research.md](./research.md) - Technical research
- [contracts/](./contracts/) - API specifications
