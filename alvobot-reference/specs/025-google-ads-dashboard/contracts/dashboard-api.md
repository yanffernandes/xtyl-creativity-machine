# API Contract: Google Ads Dashboard

**Feature**: 025-google-ads-dashboard
**Date**: 2026-01-13

## Base Path

```
/api/google/dashboard
```

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## Endpoints

### GET /campaigns

Fetch campaign metrics from Google Ads API (real-time, not persisted).

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| connectionId | UUID | Yes | Google Ads connection ID |
| period | string | No | `today`, `last_7d`, `last_30d`, `custom` (default: `last_7d`) |
| startDate | string | No | Required if period=custom, format: YYYY-MM-DD |
| endDate | string | No | Required if period=custom, format: YYYY-MM-DD |
| status | string | No | Filter by campaign status: `ENABLED`, `PAUSED`, `all` |
| sortBy | string | No | Column to sort: `name`, `impressions`, `clicks`, `cost`, etc. |
| sortOrder | string | No | `asc` or `desc` (default: `desc`) |

**Response 200**:

```json
{
  "campaigns": [
    {
      "id": "123456789",
      "name": "Campaign Name",
      "status": "ENABLED",
      "channelType": "SEARCH",
      "budget": 50.00,
      "budgetId": "987654321",
      "impressions": 15000,
      "clicks": 450,
      "ctr": 0.03,
      "cost": 125.50,
      "conversions": 12,
      "conversionsValue": 480.00,
      "cpa": 10.46,
      "roas": 3.82,
      "budgetSpentPercent": 0.65,
      "alerts": ["low_ctr"]
    }
  ],
  "summary": {
    "totalCampaigns": 25,
    "activeCampaigns": 18,
    "totalImpressions": 150000,
    "totalClicks": 4500,
    "totalCost": 1250.00,
    "totalConversions": 120,
    "avgCtr": 0.03,
    "avgCpa": 10.42
  },
  "fetchedAt": "2026-01-13T10:30:00Z"
}
```

**Error Responses**:

- `401 Unauthorized`: Invalid or expired JWT
- `403 Forbidden`: User doesn't own the connection
- `404 Not Found`: Connection not found
- `502 Bad Gateway`: Google Ads API error

---

### POST /campaigns/:campaignId/pause

Pause an active campaign.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| campaignId | string | Google Ads campaign ID |

**Request Body**:

```json
{
  "connectionId": "uuid"
}
```

**Response 200**:

```json
{
  "success": true,
  "campaignId": "123456789",
  "previousStatus": "ENABLED",
  "newStatus": "PAUSED",
  "actionLogId": "uuid"
}
```

---

### POST /campaigns/:campaignId/enable

Enable a paused campaign.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| campaignId | string | Google Ads campaign ID |

**Request Body**:

```json
{
  "connectionId": "uuid"
}
```

**Response 200**:

```json
{
  "success": true,
  "campaignId": "123456789",
  "previousStatus": "PAUSED",
  "newStatus": "ENABLED",
  "actionLogId": "uuid"
}
```

---

### PATCH /campaigns/:campaignId/budget

Update campaign budget.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| campaignId | string | Google Ads campaign ID |

**Request Body**:

```json
{
  "connectionId": "uuid",
  "newBudget": 75.00
}
```

**Response 200**:

```json
{
  "success": true,
  "campaignId": "123456789",
  "previousBudget": 50.00,
  "newBudget": 75.00,
  "actionLogId": "uuid"
}
```

---

### POST /campaigns/:campaignId/duplicate

Duplicate a campaign with all its ad groups and ads.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| campaignId | string | Google Ads campaign ID |

**Request Body**:

```json
{
  "connectionId": "uuid",
  "newName": "Campaign Name - Copy",
  "status": "PAUSED"
}
```

**Response 200**:

```json
{
  "success": true,
  "originalCampaignId": "123456789",
  "newCampaignId": "123456790",
  "newName": "Campaign Name - Copy",
  "actionLogId": "uuid"
}
```

**Note**: Duplication creates the campaign as PAUSED by default for user review.

---

## Rate Limiting

- All endpoints respect Google Ads API rate limits (15,000 requests/day per developer token)
- 429 Too Many Requests returned when limits approached
- Implement exponential backoff on client side

## Caching

- Campaign metrics cached for 5 minutes in memory
- Cache invalidated after any mutation (pause, enable, budget change)
