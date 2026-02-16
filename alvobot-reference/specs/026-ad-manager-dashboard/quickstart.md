# Quickstart: Google Ad Manager Dashboard

**Feature**: 026-ad-manager-dashboard
**Date**: 2026-01-15

## Prerequisites

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Enable the **Google Ad Manager API**:
   - Go to APIs & Services → Library
   - Search for "Google Ad Manager API"
   - Click Enable

4. Create OAuth 2.0 Credentials:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:3001/ad-manager/oauth/callback` (development)
     - `https://api.yourdomain.com/ad-manager/oauth/callback` (production)
   - Save the **Client ID** and **Client Secret**

### 2. Ad Manager Network Access

The user connecting must have:
- Access to at least one Ad Manager network
- Permission to run reports (typically any role except "Read-only")

### 3. Environment Variables

Add to `backend/.env`:

```bash
# Google Ad Manager OAuth (can reuse Google Ads credentials or create separate)
GOOGLE_AD_MANAGER_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_AD_MANAGER_CLIENT_SECRET=your-client-secret
GOOGLE_AD_MANAGER_REDIRECT_URI=http://localhost:3001/ad-manager/oauth/callback
```

---

## Installation

### Backend Dependencies

```bash
cd backend
npm install @google-ads/admanager
```

### Frontend Dependencies

No additional dependencies needed - uses existing TanStack Query setup.

---

## Development Setup

### 1. Start Backend

```bash
cd backend
npm run start:dev
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

### 3. Test OAuth Flow

1. Go to `/connections` in the frontend
2. Click "Nova Conexão"
3. Enter a name for the connection
4. Select "Google Ad Manager" as provider
5. Complete OAuth flow
6. Verify connection appears in list

### 4. Test Dashboard

1. Go to `/ad-manager` (or wherever the route is configured)
2. Select a connected Ad Manager account
3. Choose a network from the dropdown
4. Verify site metrics load

---

## File Structure

### Backend

```
backend/src/modules/
├── ad-manager/
│   ├── ad-manager.module.ts
│   ├── ad-manager.controller.ts
│   ├── services/
│   │   ├── ad-manager-oauth.service.ts
│   │   ├── ad-manager-report.service.ts
│   │   └── ad-manager-cache.service.ts
│   └── dto/
│       ├── site-analysis.dto.ts
│       └── expand.dto.ts
```

### Frontend

```
frontend/src/features/
├── ad-manager-dashboard/
│   ├── api/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── index.ts
│   ├── components/
│   │   ├── NetworkSelector/
│   │   ├── PeriodFilter/
│   │   ├── SiteAnalysisTable/
│   │   └── index.ts
│   ├── pages/
│   │   └── AdManagerDashboardPage.tsx
│   ├── types/
│   │   └── index.ts
│   └── hooks/
│       └── useExpandableTable.ts
├── connections/
│   └── pages/
│       └── AdManagerCallbackPage.tsx  # New callback handler
```

---

## Key Implementation Notes

### OAuth Scope

```typescript
const SCOPE = 'https://www.googleapis.com/auth/admanager'
```

Single scope grants full read access to Ad Manager data.

### Report Workflow

The Ad Manager API uses async reports:

```typescript
// 1. Create report definition
const report = await client.createReport({ ... })

// 2. Run report (async)
const operation = await client.runReport({ name: report.name })

// 3. Poll for completion
while (!operation.done) {
  await sleep(2000)
  operation = await client.getOperation({ name: operation.name })
}

// 4. Fetch results
const rows = await client.fetchReportResultRows({ name: report.name })
```

### Cache Key Pattern

```typescript
const cacheKey = `ad-manager:site-analysis:${connectionId}:${networkId}:${startDate}:${endDate}`
```

### Metrics Calculation

Some metrics are calculated from base values:

```typescript
const rps = requests > 0 ? revenue / requests : 0
const ecpm = impressions > 0 ? (revenue / impressions) * 1000 : 0
const cpc = clicks > 0 ? revenue / clicks : 0
```

---

## Testing

### Manual Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] Networks are listed after connection
- [ ] Site metrics load for selected period
- [ ] Expanding site shows dates
- [ ] Expanding date shows URIs
- [ ] Sorting works on all columns
- [ ] Period filter updates data
- [ ] Network selector switches networks
- [ ] Refresh button fetches fresh data
- [ ] Cache indicator shows "cached at" time

### API Testing (curl)

```bash
# Get networks
curl -X GET "http://localhost:3001/ad-manager/networks?connectionId=YOUR_CONNECTION_ID" \
  -H "Authorization: Bearer YOUR_JWT"

# Get site analysis
curl -X POST "http://localhost:3001/ad-manager/site-analysis" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "YOUR_CONNECTION_ID",
    "networkId": "YOUR_NETWORK_ID",
    "startDate": "2026-01-08",
    "endDate": "2026-01-15"
  }'
```

---

## Troubleshooting

### "API not enabled"
- Enable Google Ad Manager API in Cloud Console
- Wait a few minutes for propagation

### "Access denied"
- User needs access to the Ad Manager network
- Check user has report permissions in Ad Manager

### "Rate limited"
- Backend implements exponential backoff
- Standard accounts: 2 req/sec
- Ad Manager 360: 8 req/sec

### "Token expired"
- Call `/ad-manager/oauth/refresh/:connectionId`
- Or reconnect via OAuth flow

### "No networks found"
- User may not have any Ad Manager networks
- Check Ad Manager console for network access
