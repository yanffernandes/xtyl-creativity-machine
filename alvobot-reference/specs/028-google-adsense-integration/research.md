# Research: Google AdSense Integration

## Overview

This document consolidates research findings for implementing Google AdSense integration, following patterns established by the existing Ad Manager module.

---

## 1. Google AdSense Management API v2

### Decision
Use Google AdSense Management API v2 for all AdSense operations.

### Rationale
- Official Google API with comprehensive documentation
- RESTful interface compatible with existing patterns
- Supports all required operations: accounts listing, report generation

### API Endpoints

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List accounts | `https://adsense.googleapis.com/v2/accounts` | GET |
| Generate report | `https://adsense.googleapis.com/v2/accounts/{accountId}/reports:generate` | GET |
| Get account | `https://adsense.googleapis.com/v2/accounts/{accountId}` | GET |

### Report Parameters

**Dimensions (GROUP BY):**
- `DATE` - Report by date
- `DOMAIN_NAME` - Report by site/domain
- `URL_CHANNEL_NAME` - Report by URL channel

**Metrics:**
- `ESTIMATED_EARNINGS` - Revenue in account currency
- `IMPRESSIONS` - Ad impressions
- `CLICKS` - Ad clicks
- `CLICK_THROUGH_RATE` - CTR as decimal (0.02 = 2%)
- `COST_PER_CLICK` - CPC in account currency
- `PAGE_VIEWS_RPM` - Revenue per 1000 page views

### Response Format
```json
{
  "rows": [
    {
      "cells": [
        { "value": "2026-01-15" },  // DATE dimension
        { "value": "example.com" },  // DOMAIN_NAME dimension
        { "value": "150.50" }        // ESTIMATED_EARNINGS metric
      ]
    }
  ],
  "totals": {
    "cells": [
      { "value": "1500.00" }
    ]
  },
  "headers": [
    { "name": "DATE", "type": "DIMENSION" },
    { "name": "DOMAIN_NAME", "type": "DIMENSION" },
    { "name": "ESTIMATED_EARNINGS", "type": "METRIC_CURRENCY" }
  ],
  "startDate": { "year": 2026, "month": 1, "day": 1 },
  "endDate": { "year": 2026, "month": 1, "day": 15 }
}
```

### Alternatives Considered
- **Google AdSense API v1.4** - Deprecated, will be shut down
- **Google Analytics integration** - More complex, requires additional setup

---

## 2. OAuth Scopes

### Decision
Use `https://www.googleapis.com/auth/adsense.readonly` scope.

### Rationale
- Read-only scope follows principle of least privilege
- Sufficient for all report generation and account listing operations
- No write access needed per spec requirements

### Required Scopes
```typescript
const ADSENSE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/adsense.readonly'
];
```

### Comparison with Existing Modules

| Module | Scope |
|--------|-------|
| Google Ads | `adwords` |
| Ad Manager | `admanager` |
| AdSense (new) | `adsense.readonly` |

---

## 3. OAuth Flow Pattern

### Decision
Follow existing `ad-manager-oauth.service.ts` pattern exactly.

### Rationale
- Proven architecture in production
- Consistent developer experience
- Reuses same Google OAuth credentials

### Flow Steps

1. **Initiate** (`POST /adsense/oauth/initiate`)
   - Validate JWT auth
   - Build state with userId, workspaceId, connectionName
   - Generate authorization URL with scopes
   - Return URL to frontend

2. **Callback** (`GET /adsense/oauth/callback`)
   - Validate state (10 min expiry)
   - Exchange code for tokens
   - Fetch user info
   - Fetch AdSense accounts
   - Store connection in database
   - Redirect to frontend callback page

3. **Refresh** (`POST /adsense/oauth/refresh/:connectionId`)
   - Verify connection ownership
   - Refresh access token using refresh token
   - Update connection in database

### State Structure
```typescript
interface OAuthState {
  userId: string;
  workspaceId?: string;
  connectionName: string;
  nonce: string;
  timestamp: number;
  reconnectConnectionId?: string;
}
```

---

## 4. Connection Storage

### Decision
Use existing `connections` table with `metadata.type: 'adsense'`.

### Rationale
- No schema changes required
- Consistent with existing Google connections
- RLS policies already in place

### Connection Data Structure
```typescript
{
  user_id: string,
  workspace_id: string | null,
  connection_name: string,
  plataform_name: 'google',  // Note: existing typo maintained
  platform_user_id: string,
  access_token: string,
  refresh_token: string | null,
  token_expires_at: string,
  metadata: {
    type: 'adsense',
    user_name: string,
    user_email: string,
    user_picture?: string,
    scopes: string[],
    accounts: AdSenseAccount[],  // List of AdSense accounts
    currency_code?: string
  },
  is_active: boolean
}
```

### Differentiation from Other Google Services

| Service | plataform_name | metadata.type |
|---------|----------------|---------------|
| Google Ads | google | ads |
| Google Ad Manager | ad_manager | (none) |
| Google AdSense | google | adsense |

---

## 5. Frontend Architecture

### Decision
Rename `ad-manager-dashboard` to `revenue-dashboard` and extend functionality.

### Rationale
- Unified "Receita" (Revenue) concept
- Reuses existing components (PeriodFilter, NetworkSelector, SiteAnalysisTable)
- Minimal code duplication

### Component Structure

```
revenue-dashboard/
├── api/
│   ├── queries.ts         # useAdManagerReport, useAdSenseReport
│   ├── mutations.ts       # useRefreshCache
│   └── index.ts
├── components/
│   ├── RevenueSourceFilter/  # NEW: Filter by source
│   ├── RevenueSummaryCards/  # NEW: Combined totals
│   ├── ConnectionSelector/   # UPDATED: Show both sources
│   ├── NetworkSelector/      # EXISTING
│   ├── PeriodFilter/         # EXISTING
│   └── SiteAnalysisTable/    # UPDATED: Add source column
├── pages/
│   └── RevenueDashboardPage.tsx
├── hooks/
│   └── useUnifiedRevenueData.ts  # NEW: Merge data from both sources
└── types/
    └── index.ts
```

### Data Merging Strategy

```typescript
// Fetch both sources in parallel
const [adManagerData, adSenseData] = await Promise.all([
  fetchAdManagerData(params),
  fetchAdSenseData(params)
]);

// Merge and sort by domain
const unifiedData = [...adManagerData, ...adSenseData]
  .map(item => ({ ...item, source: item.source }))
  .sort((a, b) => a.domain.localeCompare(b.domain));
```

---

## 6. Connection Modal Reorganization

### Decision
Two-level selection: Platform (Meta/Google) → Service (Ads/AdSense/Ad Manager).

### Rationale
- Cleaner organization as Google services grow
- Familiar pattern from other platforms
- Consistent with user mental model

### Current Flow
```
Step 1: Name → Step 2: [Meta, Google, Ad Manager] → Step 3: (Meta only)
```

### New Flow
```
Step 1: Name → Step 2: [Meta, Google] → Step 3: [Service selection]
```

### Platform Configuration
```typescript
const platforms = [
  { id: 'meta', label: 'Meta', icon: <Facebook />, color: '#0084FF' },
  { id: 'google', label: 'Google', icon: <Chrome />, color: '#4285F4' }
];

const googleServices = [
  { id: 'ads', label: 'Google Ads', icon: <Megaphone />, description: 'Gerencie campanhas' },
  { id: 'adsense', label: 'Google AdSense', icon: <DollarSign />, description: 'Visualize receitas' },
  { id: 'ad_manager', label: 'Google Ad Manager', icon: <LayoutGrid />, description: 'Análise de inventário' }
];

const metaTypes = [
  { id: 'messages', label: 'Mensagens', icon: <MessageCircle />, description: 'Broadcast messaging' },
  { id: 'ads', label: 'Anúncios', icon: <Megaphone />, description: 'Ad campaigns' }
];
```

---

## 7. Sidebar and Route Changes

### Decision
- Rename menu item: "Ad Manager" → "Receita"
- Change route: `/ad-manager` → `/receita`
- Add redirect for backwards compatibility

### Rationale
- "Receita" (Revenue) better describes unified functionality
- Route change signals new feature scope
- Redirect prevents broken bookmarks

### Router Configuration
```typescript
// New route
{ path: '/receita', element: <RevenueDashboardPage /> }

// Backwards compatibility redirect
{ path: '/ad-manager', element: <Navigate to="/receita" replace /> }

// New callback route
{ path: '/callback/adsense', element: <AdSenseCallbackPage /> }
```

### Sidebar Item
```typescript
{
  path: '/receita',
  label: 'Receita',
  icon: <DollarSign className="w-5 h-5" />
}
```

---

## 8. Error Handling

### Decision
Follow existing patterns with specific error messages per scenario.

### Rationale
- Consistent UX across the application
- Actionable error messages improve user experience

### Error Scenarios

| Scenario | Backend Response | Frontend Display |
|----------|------------------|------------------|
| User denied permission | `error=access_denied` | "Permissão negada. Autorize o acesso." |
| Invalid/expired state | `error=invalid_state` | "Sessão expirada. Tente novamente." |
| No AdSense account | `error=no_account` | "Conta sem acesso ao AdSense." |
| Token exchange failed | `error=exchange_failed` | "Erro na autenticação. Tente novamente." |
| Network error | `error=network_error` | "Erro de conexão. Verifique sua internet." |

---

## 9. Performance Considerations

### Decision
- Parallel loading for dashboard data
- 5-minute cache for report data (matching Ad Manager)
- Skeleton loaders during loading

### Rationale
- Parallel loading reduces perceived wait time
- Caching reduces API calls and improves response time
- Skeletons provide better UX than spinners

### Implementation
```typescript
// Parallel data fetching
const { data, isLoading } = useQueries({
  queries: [
    { queryKey: ['adManagerReport', params], queryFn: fetchAdManager },
    { queryKey: ['adSenseReport', params], queryFn: fetchAdSense }
  ],
  combine: (results) => ({
    data: mergeRevenueData(results),
    isLoading: results.some(r => r.isLoading)
  })
});

// Cache configuration
const queryOptions = {
  staleTime: 5 * 60 * 1000,  // 5 minutes
  gcTime: 30 * 60 * 1000     // 30 minutes
};
```

---

## 10. Testing Strategy

### Decision
Follow existing testing patterns with focus on integration tests.

### Test Categories

**Unit Tests:**
- OAuth state generation/parsing
- Report data transformation
- Currency formatting
- Source filtering logic

**Integration Tests:**
- OAuth flow (initiate → callback → token storage)
- Report generation with mock API
- Connection CRUD operations

**E2E Tests:**
- Complete connection flow
- Dashboard filtering
- Source switching

### Mock Data
```typescript
const mockAdSenseAccount = {
  name: 'accounts/pub-1234567890123456',
  displayName: 'Test Publisher',
  timezone: { id: 'America/Sao_Paulo' },
  currencyCode: 'BRL'
};

const mockReportRow = {
  cells: [
    { value: '2026-01-15' },
    { value: 'example.com' },
    { value: '150.50' },
    { value: '10000' },
    { value: '150' },
    { value: '0.015' },
    { value: '1.00' },
    { value: '15.05' }
  ]
};
```

---

## Summary

All technical decisions follow existing patterns established by the Ad Manager module. The main architectural changes are:

1. **New backend module** (`adsense/`) following Ad Manager structure
2. **Extended frontend feature** (`revenue-dashboard/`) combining both sources
3. **Reorganized connection modal** with Google services grouping
4. **Unified "Receita" dashboard** with source filtering

No NEEDS CLARIFICATION items remain - all technical decisions are resolved.
