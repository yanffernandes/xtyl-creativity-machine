# Data Model: Google AdSense Integration

## Overview

This document defines the data entities, relationships, and validation rules for the Google AdSense integration feature.

---

## 1. Existing Entities (No Changes)

### 1.1 Connection

The existing `connections` table is reused without schema changes.

```typescript
interface Connection {
  id: string;                    // UUID, primary key
  user_id: string;               // FK to users.id
  workspace_id: string | null;   // FK to workspaces.id
  connection_name: string;       // User-defined name
  plataform_name: string;        // 'google' | 'meta' | 'ad_manager'
  platform_user_id: string;      // External platform user ID
  access_token: string;          // Encrypted OAuth access token
  refresh_token: string | null;  // Encrypted OAuth refresh token
  token_expires_at: string;      // ISO timestamp
  metadata: ConnectionMetadata;  // JSON object
  is_active: boolean;           // Connection status
  last_used_at: string | null;  // ISO timestamp
  created_at: string;           // ISO timestamp
  updated_at: string;           // ISO timestamp
  deleted_at: string | null;    // Soft delete timestamp
  meta_app_id: string | null;   // For Meta connections only
}
```

**RLS Policies:** Existing workspace-based policies apply.

---

## 2. New/Extended Types

### 2.1 Connection Metadata (Extended)

```typescript
// Base metadata for all connections
interface BaseConnectionMetadata {
  user_name: string;
  user_email: string;
  user_picture?: string;
  scopes: string[];
}

// Google Ads connection metadata
interface GoogleAdsMetadata extends BaseConnectionMetadata {
  type: 'ads';
  customer_ids?: string[];
}

// Google AdSense connection metadata (NEW)
interface GoogleAdSenseMetadata extends BaseConnectionMetadata {
  type: 'adsense';
  accounts: AdSenseAccount[];
  primary_account_id?: string;
  currency_code?: string;
}

// Google Ad Manager connection metadata
interface GoogleAdManagerMetadata extends BaseConnectionMetadata {
  networks: AdManagerNetwork[];
}

// Union type for Google connections
type GoogleConnectionMetadata = GoogleAdsMetadata | GoogleAdSenseMetadata;

// Union type for all connection metadata
type ConnectionMetadata = GoogleConnectionMetadata | GoogleAdManagerMetadata | MetaConnectionMetadata;
```

### 2.2 AdSense Account

```typescript
interface AdSenseAccount {
  id: string;              // Account ID (e.g., 'pub-1234567890123456')
  name: string;            // Full resource name (e.g., 'accounts/pub-123...')
  displayName: string;     // Human-readable name
  timezone: string;        // Timezone ID (e.g., 'America/Sao_Paulo')
  currencyCode: string;    // Currency code (e.g., 'BRL', 'USD')
  reportingDimensionId?: string;  // Optional reporting dimension
}
```

### 2.3 AdSense Report Row

```typescript
interface AdSenseReportRow {
  date?: string;           // ISO date (YYYY-MM-DD), if DATE dimension used
  domain?: string;         // Domain name, if DOMAIN_NAME dimension used
  url?: string;            // URL channel, if URL_CHANNEL_NAME dimension used
  revenue: number;         // ESTIMATED_EARNINGS in account currency
  impressions: number;     // IMPRESSIONS count
  clicks: number;          // CLICKS count
  ctr: number;             // CLICK_THROUGH_RATE as decimal (0.015 = 1.5%)
  cpc: number;             // COST_PER_CLICK in account currency
  rpm: number;             // PAGE_VIEWS_RPM in account currency
  currencyCode: string;    // Currency code for monetary values
}
```

### 2.4 AdSense Report Response

```typescript
interface AdSenseReportResponse {
  rows: AdSenseReportRow[];
  totals: {
    revenue: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    rpm: number;
  };
  startDate: string;       // ISO date
  endDate: string;         // ISO date
  currencyCode: string;    // Account currency
}
```

---

## 3. Frontend Types

### 3.1 Unified Revenue Data

```typescript
type RevenueSource = 'ad_manager' | 'adsense';

interface UnifiedRevenueRow {
  id: string;              // Unique row identifier
  source: RevenueSource;   // Data source
  domain: string;          // Site/domain
  date?: string;           // Date if grouped by date
  revenue: number;         // Revenue amount
  impressions: number;     // Impression count
  clicks: number;          // Click count
  ctr: number;             // Click-through rate
  cpc: number;             // Cost per click
  rpm: number;             // Revenue per mille
  currencyCode: string;    // Currency for monetary values
}

interface UnifiedRevenueTotals {
  revenue: number;
  impressions: number;
  clicks: number;
  avgCtr: number;
  avgCpc: number;
  avgRpm: number;
  hasMultipleCurrencies: boolean;  // True if data contains mixed currencies
  currencies: string[];            // List of unique currencies
}

interface UnifiedRevenueData {
  rows: UnifiedRevenueRow[];
  totals: UnifiedRevenueTotals;
  isLoading: boolean;
  error?: string;
}
```

### 3.2 Connection with Service Badge

```typescript
type GoogleServiceType = 'ads' | 'adsense' | 'ad_manager';

interface ConnectionWithBadge extends Connection {
  serviceType: GoogleServiceType;
  badgeLabel: string;      // 'Ads', 'AdSense', 'Ad Manager'
  badgeColor: string;      // Hex color code
}

const SERVICE_BADGES: Record<GoogleServiceType, { label: string; color: string }> = {
  ads: { label: 'Ads', color: '#4285F4' },           // Google Blue
  adsense: { label: 'AdSense', color: '#34A853' },   // Google Green
  ad_manager: { label: 'Ad Manager', color: '#FBBC04' }  // Google Yellow
};
```

### 3.3 Revenue Filter State

```typescript
type RevenueSourceFilter = 'all' | 'ad_manager' | 'adsense';

interface RevenueFilterState {
  source: RevenueSourceFilter;
  connectionId: string | null;
  accountId: string | null;      // For AdSense accounts
  networkId: string | null;      // For Ad Manager networks
  period: PeriodType;
  startDate: string;
  endDate: string;
}

type PeriodType = 'today' | '7d' | '30d' | 'custom';
```

---

## 4. API DTOs

### 4.1 Initiate OAuth DTO

```typescript
class InitiateAdSenseOAuthDto {
  @IsString()
  connectionName: string;

  @IsString()
  workspaceId: string;

  @IsOptional()
  @IsString()
  reconnectConnectionId?: string;
}
```

### 4.2 Get Accounts DTO

```typescript
class GetAdSenseAccountsDto {
  @IsUUID()
  connectionId: string;
}
```

### 4.3 Generate Report DTO

```typescript
class GenerateAdSenseReportDto {
  @IsUUID()
  connectionId: string;

  @IsString()
  accountId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dimensions?: ('DATE' | 'DOMAIN_NAME' | 'URL_CHANNEL_NAME')[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
```

---

## 5. Validation Rules

### 5.1 Connection Validation

| Field | Rule |
|-------|------|
| `connectionName` | Required, 1-100 characters |
| `workspaceId` | Required, valid UUID |
| `accountId` | Required for reports, valid AdSense account ID format |
| `startDate` | Required, ISO date, not future |
| `endDate` | Required, ISO date, >= startDate |

### 5.2 AdSense Account ID Format

```typescript
// Valid format: pub-NNNNNNNNNNNNNNNN (16 digits)
const ADSENSE_ACCOUNT_ID_REGEX = /^pub-\d{16}$/;

function isValidAdSenseAccountId(id: string): boolean {
  return ADSENSE_ACCOUNT_ID_REGEX.test(id);
}
```

### 5.3 Date Range Validation

```typescript
const MAX_DATE_RANGE_DAYS = 365;

function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  if (start > today) {
    throw new BadRequestException('Start date cannot be in the future');
  }

  if (end > today) {
    throw new BadRequestException('End date cannot be in the future');
  }

  if (start > end) {
    throw new BadRequestException('Start date must be before end date');
  }

  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > MAX_DATE_RANGE_DAYS) {
    throw new BadRequestException(`Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`);
  }
}
```

---

## 6. State Transitions

### 6.1 Connection States

```
┌─────────────┐
│   Created   │
│  (inactive) │
└──────┬──────┘
       │ OAuth success
       ▼
┌─────────────┐
│   Active    │◄────────────────┐
│             │                 │
└──────┬──────┘                 │
       │ Token expired          │ Token refreshed
       ▼                        │
┌─────────────┐                 │
│   Expired   │─────────────────┘
│  (inactive) │
└──────┬──────┘
       │ Reconnect failed
       ▼
┌─────────────┐
│  Inactive   │
│ (requires   │
│  reconnect) │
└─────────────┘
```

### 6.2 Connection Status Determination

```typescript
function getConnectionStatus(connection: Connection): 'active' | 'expired' | 'inactive' {
  if (!connection.is_active) {
    return 'inactive';
  }

  if (!connection.token_expires_at) {
    return 'active';  // No expiry set, assume active
  }

  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (expiresAt < fiveMinutesFromNow) {
    return 'expired';
  }

  return 'active';
}
```

---

## 7. Entity Relationships

```
┌──────────────────┐
│     users        │
│                  │
│  id (PK)         │
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐         ┌──────────────────┐
│   connections    │         │   workspaces     │
│                  │ N:1     │                  │
│  id (PK)         │────────▶│  id (PK)         │
│  user_id (FK)    │         │                  │
│  workspace_id(FK)│         └──────────────────┘
│  plataform_name  │
│  metadata ───────┼──────┐
└──────────────────┘      │
                          │
                          ▼ (JSON)
              ┌───────────────────────┐
              │  AdSenseAccount[]     │
              │                       │
              │  id                   │
              │  displayName          │
              │  currencyCode         │
              └───────────────────────┘
```

---

## 8. Indexes and Performance

### 8.1 Existing Indexes (connections table)

- `connections_pkey` - Primary key on `id`
- `connections_user_id_idx` - Index on `user_id`
- `connections_workspace_id_idx` - Index on `workspace_id`
- `connections_plataform_name_idx` - Index on `plataform_name`

### 8.2 Query Patterns

**Get connections by workspace and platform:**
```sql
SELECT * FROM connections
WHERE workspace_id = $1
  AND plataform_name = 'google'
  AND is_active = true
  AND deleted_at IS NULL;
```

**Get AdSense connections specifically:**
```sql
SELECT * FROM connections
WHERE workspace_id = $1
  AND plataform_name = 'google'
  AND metadata->>'type' = 'adsense'
  AND is_active = true
  AND deleted_at IS NULL;
```

No new indexes required - existing indexes cover all query patterns.

---

## Summary

This data model extends the existing `connections` table to support AdSense connections without schema changes. Key additions:

1. **New metadata type** (`adsense`) for Google connections
2. **AdSense-specific entities** (AdSenseAccount, AdSenseReportRow)
3. **Unified revenue types** for combining Ad Manager and AdSense data
4. **Service badges** for visual differentiation in the UI

All changes are additive and backwards-compatible with existing functionality.
