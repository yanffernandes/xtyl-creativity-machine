# API Contract: Ad Manager Dashboard

**Feature**: 026-ad-manager-dashboard
**Base URL**: `/ad-manager`

## Overview

Endpoints for fetching Ad Manager site analysis metrics. All data is fetched in real-time from Google Ad Manager API with backend caching.

---

## Endpoints

### 1. Get Networks

List all Ad Manager networks the user has access to.

```
GET /ad-manager/networks
```

**Headers**:
```
Authorization: Bearer <jwt>
```

**Query Parameters**:
```typescript
interface GetNetworksParams {
  connectionId: string  // Required: connection UUID
}
```

**Response 200**:
```typescript
interface GetNetworksResponse {
  networks: Array<{
    id: string           // Network code
    name: string         // Display name
    currencyCode: string // ISO currency (BRL, USD, etc.)
  }>
}
```

**Example Request**:
```
GET /ad-manager/networks?connectionId=550e8400-e29b-41d4-a716-446655440000
```

**Example Response**:
```json
{
  "networks": [
    { "id": "12345678", "name": "Gastronomia Network", "currencyCode": "BRL" },
    { "id": "87654321", "name": "Finance Network", "currencyCode": "USD" }
  ]
}
```

**Errors**:
| Code | Description |
|------|-------------|
| 401 | Unauthorized |
| 403 | Not owner of connection |
| 404 | Connection not found |
| 400 | Token expired, needs refresh |

---

### 2. Get Site Analysis

Fetch aggregated metrics grouped by site.

```
POST /ad-manager/site-analysis
```

**Headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request Body**:
```typescript
interface SiteAnalysisRequest {
  connectionId: string      // Connection UUID
  networkId: string         // Network code
  startDate: string         // YYYY-MM-DD
  endDate: string           // YYYY-MM-DD
  groupBy?: 'site' | 'request_uri'  // Default: 'site'
  filters?: {
    site?: string           // Filter by site name (partial match)
    requestUri?: string     // Filter by URI (partial match)
  }
  pagination?: {
    page?: number           // Default: 1
    pageSize?: number       // Default: 50, max: 100
  }
  sortBy?: string           // Metric field to sort by
  sortOrder?: 'asc' | 'desc' // Default: 'desc'
  forceRefresh?: boolean    // Bypass cache
}
```

**Response 200**:
```typescript
interface SiteAnalysisResponse {
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
    cachedAt: string | null  // ISO timestamp if from cache
  }
}

interface SiteData {
  site: string
  childCount: number
  metrics: MetricsData
}

interface MetricsData {
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
```

**Example Request**:
```json
{
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "networkId": "12345678",
  "startDate": "2026-01-08",
  "endDate": "2026-01-15",
  "groupBy": "site",
  "sortBy": "revenue",
  "sortOrder": "desc",
  "pagination": {
    "page": 1,
    "pageSize": 50
  }
}
```

**Example Response**:
```json
{
  "data": [
    {
      "site": "gastronomiaenegocios.com.br",
      "childCount": 7,
      "metrics": {
        "revenue": 5.46,
        "rps": 38.45,
        "ecpm": 45.12,
        "pmr": 90.04,
        "viewability": 84.30,
        "cpc": 0.36,
        "ctr": 12.40,
        "clicks": 15,
        "impressions": 121,
        "requests": 241
      }
    },
    {
      "site": "gremista.net",
      "childCount": 5,
      "metrics": {
        "revenue": 54.29,
        "rps": 24.92,
        "ecpm": 48.91,
        "pmr": 85.04,
        "viewability": 78.20,
        "cpc": 0.27,
        "ctr": 18.02,
        "clicks": 200,
        "impressions": 1110,
        "requests": 2967
      }
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1
  },
  "metadata": {
    "networkId": "12345678",
    "currencyCode": "BRL",
    "dateRange": {
      "start": "2026-01-08",
      "end": "2026-01-15"
    },
    "cachedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Errors**:
| Code | Description |
|------|-------------|
| 401 | Unauthorized |
| 403 | Not owner of connection |
| 404 | Connection or network not found |
| 400 | Invalid date range (max 90 days) |
| 429 | Rate limited by Ad Manager API |
| 502 | Ad Manager API error |

---

### 3. Expand Level (Lazy Loading)

Fetch child data for a specific site or date.

```
POST /ad-manager/site-analysis/expand
```

**Headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request Body**:
```typescript
interface ExpandRequest {
  connectionId: string
  networkId: string
  startDate: string
  endDate: string
  level: 'date' | 'uri'
  parentSite: string
  parentDate?: string    // Required if level = 'uri'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  forceRefresh?: boolean
}
```

**Response 200**:
```typescript
// For level = 'date'
interface ExpandDateResponse {
  items: DateData[]
}

interface DateData {
  date: string           // YYYY-MM-DD
  childCount: number
  metrics: MetricsData
}

// For level = 'uri'
interface ExpandUriResponse {
  items: UriData[]
}

interface UriData {
  requestUri: string
  metrics: MetricsData
}
```

**Example Request (expand site to dates)**:
```json
{
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "networkId": "12345678",
  "startDate": "2026-01-08",
  "endDate": "2026-01-15",
  "level": "date",
  "parentSite": "gastronomiaenegocios.com.br",
  "sortBy": "date",
  "sortOrder": "desc"
}
```

**Example Response (dates)**:
```json
{
  "items": [
    {
      "date": "2026-01-15",
      "childCount": 3,
      "metrics": {
        "revenue": 5.46,
        "rps": 38.45,
        "ecpm": 45.12,
        "pmr": 90.04,
        "viewability": 84.30,
        "cpc": 0.36,
        "ctr": 12.40,
        "clicks": 15,
        "impressions": 121,
        "requests": 241
      }
    }
  ]
}
```

**Example Request (expand date to URIs)**:
```json
{
  "connectionId": "550e8400-e29b-41d4-a716-446655440000",
  "networkId": "12345678",
  "startDate": "2026-01-15",
  "endDate": "2026-01-15",
  "level": "uri",
  "parentSite": "gastronomiaenegocios.com.br",
  "parentDate": "2026-01-15",
  "sortBy": "revenue",
  "sortOrder": "desc"
}
```

**Example Response (URIs)**:
```json
{
  "items": [
    {
      "requestUri": "/en/melhores-estrategias-de-marketing-di",
      "metrics": {
        "revenue": 3.15,
        "rps": 44.38,
        "ecpm": 50.02,
        "pmr": 83.33,
        "viewability": 88.89,
        "cpc": 0.32,
        "ctr": 15.87,
        "clicks": 10,
        "impressions": 63,
        "requests": 126
      }
    },
    {
      "requestUri": "/en/como-escolher-o-melhor-seguro-de-vid",
      "metrics": {
        "revenue": 1.24,
        "rps": 44.39,
        "ecpm": 51.79,
        "pmr": 93.48,
        "viewability": 79.17,
        "cpc": 0.62,
        "ctr": 8.33,
        "clicks": 2,
        "impressions": 24,
        "requests": 46
      }
    },
    {
      "requestUri": "/en/cartoes-sem-anuidade-que-devolvem-di",
      "metrics": {
        "revenue": 1.07,
        "rps": 24.77,
        "ecpm": 31.33,
        "pmr": 100.00,
        "viewability": 79.41,
        "cpc": 0.36,
        "ctr": 8.82,
        "clicks": 3,
        "impressions": 34,
        "requests": 69
      }
    }
  ]
}
```

---

### 4. Force Refresh

Invalidate cache and fetch fresh data.

```
POST /ad-manager/site-analysis/refresh
```

**Headers**:
```
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request Body**:
```typescript
interface RefreshRequest {
  connectionId: string
  networkId: string
}
```

**Response 200**:
```typescript
interface RefreshResponse {
  success: boolean
  message: string
}
```

**Example Response**:
```json
{
  "success": true,
  "message": "Cache invalidated for network 12345678"
}
```

---

## Caching Behavior

| Endpoint | Cache Key Pattern | TTL |
|----------|-------------------|-----|
| site-analysis | `ad-manager:${connectionId}:${networkId}:${startDate}:${endDate}` | 15 min |
| expand (date) | `ad-manager:expand:${connectionId}:${networkId}:${site}:${startDate}:${endDate}` | 15 min |
| expand (uri) | `ad-manager:expand:${connectionId}:${networkId}:${site}:${date}` | 15 min |

- `forceRefresh=true` bypasses cache and fetches fresh data
- `/refresh` endpoint invalidates all cache for a network

---

## Rate Limiting

The backend implements exponential backoff for Ad Manager API rate limits:

- **Standard accounts**: 2 requests/second
- **Ad Manager 360**: 8 requests/second

If rate limited, returns 429 with retry-after header.
