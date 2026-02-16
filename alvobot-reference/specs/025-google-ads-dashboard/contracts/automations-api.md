# API Contract: Google Ads Automations

**Feature**: 025-google-ads-dashboard
**Date**: 2026-01-13

## Base Path

```
/api/google/automations
```

## Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## Endpoints

### GET /rules

List all automation rules for the authenticated user.

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| connectionId | UUID | No | Filter by connection |
| isActive | boolean | No | Filter by active status |

**Response 200**:

```json
{
  "rules": [
    {
      "id": "uuid",
      "name": "Pause low CTR campaigns",
      "description": "Pauses campaigns with CTR below 1% after spending R$50",
      "isActive": true,
      "scopeType": "filter",
      "scopeFilters": {
        "status": "ENABLED",
        "minBudget": 30
      },
      "conditions": {
        "type": "group",
        "operator": "AND",
        "children": [
          { "type": "condition", "metric": "ctr", "operator": "<", "value": 0.01, "period": "last_7d" },
          { "type": "condition", "metric": "cost", "operator": ">", "value": 50, "period": "last_7d" }
        ]
      },
      "actionType": "pause",
      "actionValue": null,
      "actionValueType": null,
      "actionLimit": null,
      "checkFrequencyMinutes": 60,
      "cooldownMinutes": 360,
      "maxExecutions": null,
      "currentExecutions": 5,
      "lastRunAt": "2026-01-13T09:00:00Z",
      "lastExecutionAt": "2026-01-13T08:30:00Z",
      "createdAt": "2026-01-10T14:00:00Z",
      "updatedAt": "2026-01-12T16:30:00Z"
    }
  ],
  "total": 12
}
```

---

### POST /rules

Create a new automation rule.

**Request Body**:

```json
{
  "connectionId": "uuid",
  "name": "Increase budget on good performers",
  "description": "Increases budget by 20% when ROAS > 3",
  "scopeType": "filter",
  "scopeFilters": {
    "nameContains": "promo",
    "status": "ENABLED"
  },
  "conditions": {
    "type": "group",
    "operator": "AND",
    "children": [
      { "type": "condition", "metric": "roas", "operator": ">", "value": 3, "period": "last_7d" },
      { "type": "condition", "metric": "conversions", "operator": ">=", "value": 5, "period": "last_7d" }
    ]
  },
  "actionType": "increase_budget",
  "actionValue": 20,
  "actionValueType": "percentage",
  "actionLimit": 200,
  "checkFrequencyMinutes": 120,
  "cooldownMinutes": 1440,
  "maxExecutions": 10
}
```

**Response 201**:

```json
{
  "id": "uuid",
  "name": "Increase budget on good performers",
  "createdAt": "2026-01-13T10:00:00Z"
}
```

**Validation Rules**:

- `name`: Required, 1-255 characters
- `conditions`: Required, valid ConditionTree structure
- `actionType`: Required, one of: `pause`, `enable`, `increase_budget`, `decrease_budget`, `increase_bid`, `decrease_bid`
- `actionValue`: Required for increase/decrease actions
- `checkFrequencyMinutes`: Min 15, default 60
- `cooldownMinutes`: Min 0, default 360

---

### GET /rules/:ruleId

Get a specific automation rule.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| ruleId | UUID | Automation rule ID |

**Response 200**: Same structure as single item in GET /rules response.

---

### PATCH /rules/:ruleId

Update an automation rule.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| ruleId | UUID | Automation rule ID |

**Request Body**: Same as POST, all fields optional.

**Response 200**:

```json
{
  "id": "uuid",
  "updatedAt": "2026-01-13T11:00:00Z"
}
```

---

### DELETE /rules/:ruleId

Delete an automation rule.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| ruleId | UUID | Automation rule ID |

**Response 204**: No content

---

### POST /rules/:ruleId/toggle

Toggle automation rule active status.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| ruleId | UUID | Automation rule ID |

**Response 200**:

```json
{
  "id": "uuid",
  "isActive": false
}
```

---

### POST /rules/:ruleId/test

Test an automation rule without executing actions (dry run).

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| ruleId | UUID | Automation rule ID |

**Response 200**:

```json
{
  "matchingCampaigns": [
    {
      "id": "123456789",
      "name": "Campaign A",
      "currentMetrics": {
        "roas": 4.2,
        "conversions": 8
      },
      "wouldExecute": true,
      "reason": "All conditions met"
    },
    {
      "id": "123456790",
      "name": "Campaign B",
      "currentMetrics": {
        "roas": 2.1,
        "conversions": 3
      },
      "wouldExecute": false,
      "reason": "ROAS below threshold"
    }
  ],
  "totalMatching": 1,
  "testedAt": "2026-01-13T10:30:00Z"
}
```

---

## Condition Types

### MetricType

```typescript
type MetricType =
  | 'impressions'
  | 'clicks'
  | 'ctr'
  | 'cost'
  | 'conversions'
  | 'cpa'
  | 'roas'
  | 'runtime_hours'
  | 'budget_spent_percent';
```

### ConditionOperator

```typescript
type ConditionOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';
```

### PeriodType

```typescript
type PeriodType = 'today' | 'last_24h' | 'last_7d' | 'last_30d';
```

### ActionType

```typescript
type ActionType =
  | 'pause'
  | 'enable'
  | 'increase_budget'
  | 'decrease_budget'
  | 'increase_bid'
  | 'decrease_bid';
```
