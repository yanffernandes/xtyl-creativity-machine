# API Contract: Google Ads Action History

**Feature**: 025-google-ads-dashboard
**Date**: 2026-01-13

## Base Path

```
/api/google/history
```

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## Endpoints

### GET /actions

List action history (manual and automated actions).

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| connectionId | UUID | No | Filter by connection |
| source | string | No | `manual`, `automation`, or `all` (default) |
| campaignId | string | No | Filter by Google campaign ID |
| actionType | string | No | Filter by action type |
| status | string | No | `success`, `failed`, `skipped` |
| startDate | string | No | Filter from date (YYYY-MM-DD) |
| endDate | string | No | Filter to date (YYYY-MM-DD) |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 50, max: 100) |

**Response 200**:

```json
{
  "actions": [
    {
      "id": "uuid",
      "source": "automation",
      "automationRuleId": "uuid",
      "automationRuleName": "Pause low CTR campaigns",
      "googleCampaignId": "123456789",
      "googleCampaignName": "Campaign A",
      "actionType": "pause",
      "actionDetails": {
        "previousValue": null,
        "newValue": null
      },
      "status": "success",
      "errorMessage": null,
      "metricsSnapshot": {
        "impressions": 5000,
        "clicks": 25,
        "ctr": 0.005,
        "cost": 75.00,
        "conversions": 0,
        "cpa": null,
        "roas": 0
      },
      "executedAt": "2026-01-13T08:30:00Z"
    },
    {
      "id": "uuid",
      "source": "manual",
      "automationRuleId": null,
      "automationRuleName": null,
      "googleCampaignId": "123456790",
      "googleCampaignName": "Campaign B",
      "actionType": "update_budget",
      "actionDetails": {
        "previousValue": 50,
        "newValue": 75,
        "changeAmount": 25,
        "changePercent": 50
      },
      "status": "success",
      "errorMessage": null,
      "metricsSnapshot": null,
      "executedAt": "2026-01-13T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156,
    "totalPages": 4
  }
}
```

---

### GET /actions/:actionId

Get a specific action log entry.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| actionId | UUID | Action log ID |

**Response 200**: Same structure as single item in GET /actions response.

---

### GET /actions/stats

Get action statistics for a period.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| connectionId | UUID | Yes | Connection ID |
| period | string | No | `today`, `last_7d`, `last_30d` (default: `last_7d`) |

**Response 200**:

```json
{
  "stats": {
    "totalActions": 156,
    "manualActions": 45,
    "automatedActions": 111,
    "successRate": 0.98,
    "byActionType": {
      "pause": 32,
      "enable": 18,
      "update_budget": 65,
      "increase_bid": 28,
      "decrease_bid": 13
    },
    "byStatus": {
      "success": 153,
      "failed": 2,
      "skipped": 1
    },
    "automationBreakdown": [
      {
        "ruleId": "uuid",
        "ruleName": "Pause low CTR campaigns",
        "executions": 45,
        "successRate": 1.0
      },
      {
        "ruleId": "uuid",
        "ruleName": "Increase budget on performers",
        "executions": 66,
        "successRate": 0.97
      }
    ]
  },
  "period": "last_7d",
  "generatedAt": "2026-01-13T10:30:00Z"
}
```

---

### GET /notifications

Get recent automation notifications (unread).

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| connectionId | UUID | No | Filter by connection |
| limit | number | No | Max items (default: 10) |

**Response 200**:

```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "automation_executed",
      "title": "Automation executed",
      "message": "\"Pause low CTR campaigns\" paused Campaign A",
      "actionLogId": "uuid",
      "automationRuleId": "uuid",
      "createdAt": "2026-01-13T08:30:00Z",
      "read": false
    }
  ],
  "unreadCount": 5
}
```

---

### POST /notifications/mark-read

Mark notifications as read.

**Request Body**:

```json
{
  "notificationIds": ["uuid1", "uuid2"]
}
```

Or mark all as read:

```json
{
  "markAll": true
}
```

**Response 200**:

```json
{
  "markedCount": 5
}
```

---

## Action Types Reference

| Type | Description | Has Details |
|------|-------------|-------------|
| `pause` | Pause campaign | No |
| `enable` | Enable campaign | No |
| `update_budget` | Change budget | Yes (prev/new value) |
| `increase_bid` | Increase bid | Yes (prev/new value) |
| `decrease_bid` | Decrease bid | Yes (prev/new value) |
| `duplicate` | Duplicate campaign | Yes (new campaign ID) |

## Status Types

| Status | Description |
|--------|-------------|
| `success` | Action executed successfully |
| `failed` | Action failed (see errorMessage) |
| `skipped` | Action skipped (cooldown, limit reached, etc.) |
