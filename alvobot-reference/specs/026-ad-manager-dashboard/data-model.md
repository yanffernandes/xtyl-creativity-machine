# Data Model: Google Ad Manager Dashboard

**Feature**: 026-ad-manager-dashboard
**Date**: 2026-01-15

## Overview

This feature uses a **fully stateless architecture** - all metrics are fetched in real-time from Google Ad Manager API and NOT persisted locally. Only the OAuth connection is stored in the existing `connections` table. User preferences (period, grouping) are handled client-side via URL params or localStorage.

**Pattern**: Same as Google Ads Dashboard (025) - no new database tables.

## Database Changes

### None Required

The only database interaction is with the existing `connections` table:

```sql
-- No new tables
-- No schema changes
-- Just add 'ad_manager' as a valid provider value in connections.plataform_name
```

### Connection Metadata Structure

The `metadata` JSONB field in `connections` stores Ad Manager-specific data:

```typescript
// connections.metadata for ad_manager provider
{
  "networks": [
    { "id": "12345", "name": "My Publisher Network", "currencyCode": "BRL" },
    { "id": "67890", "name": "Second Network", "currencyCode": "USD" }
  ],
  "user_name": "Publisher Name",
  "user_email": "publisher@example.com",
  "scopes": ["https://www.googleapis.com/auth/admanager"]
}
```

---

## In-Memory Types (Not Persisted)

All data below is fetched from the Ad Manager API and held only in memory/cache.

### Network

```typescript
interface AdManagerNetwork {
  id: string              // Network code (e.g., "12345")
  name: string            // Display name
  currencyCode: string    // ISO currency code (e.g., "BRL", "USD")
}
```

### Metrics Data (Shared across all levels)

```typescript
interface MetricsData {
  revenue: number         // Total revenue in account currency
  rps: number             // Revenue Per Session (calculated)
  ecpm: number            // Effective CPM (calculated)
  pmr: number             // Page Match Rate (0-100)
  viewability: number     // Viewability % (0-100)
  cpc: number             // Cost Per Click (calculated)
  ctr: number             // Click-Through Rate (0-100)
  clicks: number          // Total clicks
  impressions: number     // Total impressions
  requests: number        // Total ad requests
}
```

### Site Metrics (Level 0)

```typescript
interface SiteData {
  site: string            // Site name/domain (from AD_UNIT_NAME)
  childCount: number      // Number of dates with data
  metrics: MetricsData
}
```

### Date Metrics (Level 1)

```typescript
interface DateData {
  date: string            // YYYY-MM-DD format
  childCount: number      // Number of URIs with data
  metrics: MetricsData
}
```

### URI Metrics (Level 2)

```typescript
interface UriData {
  requestUri: string      // Page URL/path
  metrics: MetricsData
}
```

### Calculated Fields

| Field | Formula |
|-------|---------|
| rps | `revenue / requests` |
| ecpm | `(revenue / impressions) * 1000` |
| cpc | `revenue / clicks` (if clicks > 0, else 0) |

---

## Data Flow

```
┌─────────────────┐
│   connections   │
├─────────────────┤
│ id              │
│ user_id         │
│ workspace_id    │
│ plataform_name  │ ← 'ad_manager'
│ access_token    │
│ refresh_token   │
│ metadata        │ ← { networks: [...] }
└────────┬────────┘
         │
         │ OAuth token
         ▼
┌─────────────────────────────────────────────────┐
│           Google Ad Manager API                 │
├─────────────────────────────────────────────────┤
│ Networks → Sites → Dates → URIs                 │
│ (fetched on-demand, cached 15 min in backend)   │
└─────────────────────────────────────────────────┘
         │
         │ JSON response
         ▼
┌─────────────────────────────────────────────────┐
│              Frontend (React)                   │
├─────────────────────────────────────────────────┤
│ TanStack Query cache (5 min staleTime)          │
│ URL params for filters (period, network, etc)   │
│ localStorage for UI preferences (optional)      │
└─────────────────────────────────────────────────┘
```

---

## State Management

### Backend Cache
- **Cache Key**: `ad-manager:site-analysis:${connectionId}:${networkId}:${startDate}:${endDate}`
- **TTL**: 15 minutes
- **Invalidation**: Manual refresh button only

### Frontend State
- **Server State**: TanStack Query (5 min staleTime)
- **UI State**:
  - URL params: `?networkId=123&period=7d&groupBy=site`
  - Component state: expanded rows, sort order
  - Optional: localStorage for last selected network

### No Database Preferences
User preferences are NOT stored in database:
- **Period filter**: URL param or default to '7d'
- **Network selection**: URL param or first available network
- **Grouping**: URL param or default to 'site'
- **Sort order**: Component state, reset on page reload

---

## TypeScript Types (Frontend)

```typescript
// types/index.ts

export interface AdManagerNetwork {
  id: string
  name: string
  currencyCode: string
}

export interface MetricsData {
  revenue: number
  rps: number
  ecpm: number
  pmr: number
  viewability: number
  cpc: number
  ctr: number
  clicks: number
  impressions: number
  requests: number
}

export interface SiteData {
  site: string
  childCount: number
  metrics: MetricsData
  children?: DateData[]
  expanded?: boolean // UI state only
}

export interface DateData {
  date: string
  childCount: number
  metrics: MetricsData
  children?: UriData[]
  expanded?: boolean // UI state only
}

export interface UriData {
  requestUri: string
  metrics: MetricsData
}

// Filter types
export type PeriodFilter = 'today' | '7d' | '30d' | 'custom'
export type GroupBy = 'site' | 'request_uri'
export type SortField = keyof MetricsData | 'site' | 'date' | 'requestUri'
export type SortOrder = 'asc' | 'desc'

// API Response types
export interface SiteAnalysisResponse {
  data: SiteData[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  metadata: {
    networkId: string
    currencyCode: string
    dateRange: {
      start: string
      end: string
    }
    cachedAt?: string
  }
}

export interface ExpandResponse {
  items: DateData[] | UriData[]
}
```

---

## Summary

| Aspect | Approach |
|--------|----------|
| Database tables | None (uses existing `connections` only) |
| Metrics storage | Not persisted (API → Cache → Frontend) |
| User preferences | URL params + localStorage (client-side) |
| Backend cache | 15 min TTL, in-memory |
| Frontend cache | TanStack Query, 5 min staleTime |
| Architecture | 100% stateless, same as Google Ads Dashboard |
