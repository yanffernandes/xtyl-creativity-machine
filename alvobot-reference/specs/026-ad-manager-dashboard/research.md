# Research: Google Ad Manager Dashboard

**Feature**: 026-ad-manager-dashboard
**Date**: 2026-01-15

## 1. Google Ad Manager API Authentication

### Decision
Use OAuth 2.0 Web Application flow with scope `https://www.googleapis.com/auth/admanager`

### Rationale
- Single scope grants full read access to Ad Manager data
- Web Application flow aligns with existing connections module pattern
- Allows user-specific authentication (each user's own Ad Manager access)

### Alternatives Considered
- **Service Account**: Rejected - requires central account with access to all user networks
- **API Key**: Not available for Ad Manager API

### Implementation Details
```typescript
// OAuth Configuration
const OAUTH_CONFIG = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scope: 'https://www.googleapis.com/auth/admanager',
  accessType: 'offline', // Required for refresh tokens
}
```

---

## 2. Report Service API Workflow

### Decision
Use the Ad Manager API Beta (REST) with asynchronous report workflow

### Rationale
- Modern REST API (not legacy SOAP)
- Native async support for long-running reports
- Better error handling and pagination
- Official client library available for Node.js

### Workflow
1. **Create Report** → `POST /networks/{networkCode}/reports`
2. **Run Report** → `POST /networks/{networkCode}/reports/{reportId}:run`
3. **Poll Status** → `GET /networks/{networkCode}/operations/{operationId}`
4. **Fetch Results** → `POST /networks/{networkCode}/reports/{reportId}/results:fetchRows`

### Alternatives Considered
- **SOAP API**: Rejected - legacy, more complex, being deprecated
- **Real-time queries**: Not available - Ad Manager requires async reports

---

## 3. Available Dimensions for Site Analysis

### Decision
Use these dimensions for Site > Date > Request URI hierarchy:

| Dimension | API Field | Purpose |
|-----------|-----------|---------|
| Site | `AD_UNIT_NAME` or custom dimension | Group by site/domain |
| Date | `DATE` | Daily breakdown |
| Request URI | `CUSTOM_CRITERIA_ID` or URL dimension | Page-level breakdown |

### Rationale
- Ad Manager uses "Ad Units" as the primary site grouping
- Date dimension is standard and well-supported
- Request URI may require custom targeting setup in Ad Manager

### Important Finding
⚠️ The exact dimension for "Request URI" depends on how the user's Ad Manager account is configured. Common approaches:
1. Custom targeting key-value pairs
2. Ad Unit hierarchy (sub-ad-units per page)
3. URL channels (if using AdSense integration)

**Recommendation**: Start with AD_UNIT hierarchy, add support for custom dimensions based on account configuration.

---

## 4. Available Metrics

### Decision
Map these Ad Manager metrics to UI columns:

| UI Column | Ad Manager Metric | Notes |
|-----------|-------------------|-------|
| Revenue | `AD_SERVER_CPM_AND_CPC_REVENUE` | Primary revenue metric |
| RPS | Calculated | Revenue / Requests |
| eCPM | Calculated | (Revenue / Impressions) * 1000 |
| PMR | `AD_SERVER_LINE_ITEM_LEVEL_PERCENT_IMPRESSIONS` | Page Match Rate |
| Viewability | `ACTIVE_VIEW_VIEWABLE_IMPRESSIONS_RATE` | Active View metric |
| CPC | Calculated | Cost / Clicks |
| CTR | `AD_SERVER_CTR` | Click-through rate |
| Clicks | `AD_SERVER_CLICKS` | Total clicks |
| Impressions | `AD_SERVER_IMPRESSIONS` | Total impressions |
| Requests | `AD_SERVER_TOTAL_REQUESTS` | Total ad requests |

### Rationale
- Core metrics available via standard Ad Manager reporting
- Some metrics (RPS, eCPM, CPC) need calculation from base metrics
- Viewability uses Active View which is standard in Ad Manager

---

## 5. Rate Limits

### Decision
Implement aggressive caching with 15-minute TTL and exponential backoff

### Rate Limits
| Account Type | Limit |
|--------------|-------|
| Ad Manager 360 | 8 requests/second |
| Standard Ad Manager | 2 requests/second |

### Implementation
```typescript
// Exponential backoff pattern
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let delay = 5000 // Start at 5 seconds
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (error.code === 'QUOTA_EXCEEDED' && i < maxRetries - 1) {
        await sleep(delay)
        delay *= 2 // Double delay each retry
      } else {
        throw error
      }
    }
  }
}
```

---

## 6. Integration with Existing Connections Module

### Decision
Add new provider `ad_manager` to existing connections table

### Rationale
- Reuses existing OAuth infrastructure
- Maintains consistent UX across all providers
- Leverages existing token storage and RLS policies

### Implementation Pattern
Following the Google Ads pattern from `google-oauth.service.ts`:

```typescript
// New service: ad-manager-oauth.service.ts
@Injectable()
export class AdManagerOAuthService {
  // Same pattern as GoogleOAuthService but with:
  // - Different scope: https://www.googleapis.com/auth/admanager
  // - Different token storage: provider = 'ad_manager'
  // - Network discovery after connection
}
```

### Database Changes
```sql
-- No schema changes needed
-- Just add 'ad_manager' as valid provider value
-- Connections table already supports:
-- - plataform_name: 'meta' | 'google' | 'ad_manager' (new)
-- - access_token, refresh_token, token_expires_at
-- - metadata JSONB for network IDs
```

---

## 7. Caching Strategy

### Decision
Use NestJS Cache Manager with 15-minute TTL, matching Google Ads dashboard pattern

### Cache Key Structure
```typescript
const cacheKey = `ad-manager:site-analysis:${connectionId}:${networkId}:${period}:${startDate}:${endDate}`
```

### Cache Invalidation
- On manual refresh (user clicks refresh button)
- On connection reconnect/token refresh
- TTL-based expiration (15 minutes)

### Rationale
- Ad Manager data has natural delay of several hours
- 15-minute cache balances freshness with API quota
- Matches pattern used in Google Ads dashboard

---

## 8. Lazy Loading Strategy

### Decision
Implement lazy loading at each hierarchy level

### Pattern
```typescript
// Initial load: Sites only (level 0)
GET /ad-manager/site-analysis
→ Returns: Array<{ site, metrics, childCount }>

// Expand site (level 1)
POST /ad-manager/site-analysis/expand
body: { site: "example.com", level: "date" }
→ Returns: Array<{ date, metrics, childCount }>

// Expand date (level 2)
POST /ad-manager/site-analysis/expand
body: { site: "example.com", date: "2026-01-15", level: "uri" }
→ Returns: Array<{ requestUri, metrics }>
```

### Rationale
- Reduces initial load time (only top-level sites)
- Minimizes API calls (only fetch what user views)
- Follows Google Ads dashboard pattern

---

## 9. Client Library

### Decision
Use `@google-ads/admanager` npm package (Google's official client)

### Installation
```bash
npm install @google-ads/admanager
```

### Usage Pattern
```typescript
import { ReportServiceClient } from '@google-ads/admanager'

const client = new ReportServiceClient()

// Create report
const report = await client.createReport({
  parent: `networks/${networkCode}`,
  report: {
    displayName: 'Site Analysis',
    reportDefinition: {
      dimensions: ['AD_UNIT_NAME', 'DATE'],
      metrics: ['AD_SERVER_IMPRESSIONS', 'AD_SERVER_CLICKS', 'AD_SERVER_CPM_AND_CPC_REVENUE'],
      dateRange: { relativeDateRange: 'LAST_7_DAYS' },
    },
  },
})
```

---

## 10. Network Discovery

### Decision
Fetch available networks after OAuth connection, store in connection metadata

### Implementation
```typescript
// After successful OAuth token exchange:
async function discoverNetworks(accessToken: string): Promise<Network[]> {
  // Use NetworkService to list networks the user has access to
  const client = new NetworkServiceClient()
  const networks = await client.listNetworks({})
  return networks.map(n => ({
    id: n.networkCode,
    name: n.displayName,
    currencyCode: n.currencyCode,
  }))
}
```

### Storage
```typescript
// In connections.metadata JSONB:
{
  "networks": [
    { "id": "12345", "name": "My Publisher Network", "currencyCode": "BRL" },
    { "id": "67890", "name": "Second Network", "currencyCode": "USD" }
  ],
  "user_name": "Publisher Name",
  "user_email": "publisher@example.com"
}
```

---

## Summary

| Topic | Decision |
|-------|----------|
| Authentication | OAuth 2.0 with `admanager` scope |
| API | Ad Manager Beta (REST), async reports |
| Dimensions | AD_UNIT_NAME, DATE, custom targeting |
| Client Library | `@google-ads/admanager` |
| Cache TTL | 15 minutes |
| Rate Limiting | Exponential backoff, 2-8 req/sec |
| Integration | New provider in existing connections module |
| Loading | Lazy load per hierarchy level |
