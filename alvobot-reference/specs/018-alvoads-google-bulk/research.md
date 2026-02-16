# Research: AlvoADS Google - Campanhas em Massa

**Feature**: 018-alvoads-google-bulk
**Date**: 2025-12-15
**Status**: Complete

Este documento consolida a pesquisa necessária para implementar a integração com Google Ads API e operações em massa.

---

## R1: Google Ads API Authentication

### Decision: OAuth 2.0 Web Server Flow

**Rationale**: O Google Ads API requer OAuth 2.0 para autenticação. O "Web Server Flow" é o padrão para aplicações server-side que precisam acessar dados em nome do usuário.

### Escopos Necessários

```
https://www.googleapis.com/auth/adwords
```

Este escopo único fornece acesso completo de leitura/escrita à conta Google Ads do usuário.

### OAuth 2.0 Flow Implementation

```typescript
// 1. Generate Authorization URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${CLIENT_ID}` +
  `&redirect_uri=${REDIRECT_URI}` +
  `&response_type=code` +
  `&scope=https://www.googleapis.com/auth/adwords` +
  `&access_type=offline` +  // Required for refresh_token
  `&prompt=consent`;        // Force consent to get refresh_token

// 2. Exchange code for tokens
POST https://oauth2.googleapis.com/token
{
  code: authorization_code,
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uri: REDIRECT_URI,
  grant_type: 'authorization_code'
}

// Response:
{
  access_token: "...",
  refresh_token: "...",  // Only returned on first auth or with prompt=consent
  expires_in: 3600,      // 1 hour
  token_type: "Bearer"
}

// 3. Refresh token when expired
POST https://oauth2.googleapis.com/token
{
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  refresh_token: STORED_REFRESH_TOKEN,
  grant_type: 'refresh_token'
}
```

### MCC (Manager Account) Support

Para contas MCC, após autenticação:
1. Listar customer IDs acessíveis via `CustomerService.listAccessibleCustomers()`
2. Usuário seleciona qual conta usar
3. Armazenar `customer_id` selecionado na conexão

```typescript
// List accessible customers
const customers = await client.customers.listAccessibleCustomers();
// Returns: { resourceNames: ['customers/1234567890', 'customers/0987654321'] }
```

### Token Storage

```typescript
interface GoogleConnection {
  id: string;
  user_id: string;
  customer_id: string;           // Google Ads customer ID (10 digits)
  customer_name?: string;
  access_token: string;          // Encrypted
  refresh_token: string;         // Encrypted
  token_expires_at: Date;
  login_customer_id?: string;    // For MCC: manager account ID
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Service Account | Requires domain-wide delegation, complex setup for end users |
| API Key only | Google Ads API requires OAuth, API key insufficient |
| Installed App Flow | Designed for desktop apps, not web applications |

---

## R2: Google Ads API Campaign Creation

### Decision: Use google-ads-api npm package

**Rationale**: Biblioteca oficial mantida pela comunidade com TypeScript support, abstrai complexidade do gRPC/REST.

```bash
npm install google-ads-api
```

### Client Setup

```typescript
import { GoogleAdsApi, enums } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID,
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: '1234567890',
  refresh_token: user_refresh_token,
  login_customer_id: '0987654321', // If using MCC
});
```

### Campaign Creation Flow

A criação de uma campanha Search completa requer:

```typescript
// 1. Create Campaign Budget
const budgetResult = await customer.campaignBudgets.create([{
  name: `Budget_${Date.now()}`,
  amount_micros: budget * 1_000_000, // Convert to micros
  delivery_method: enums.BudgetDeliveryMethod.STANDARD,
}]);
const budgetResourceName = budgetResult.results[0].resource_name;

// 2. Create Campaign
const campaignResult = await customer.campaigns.create([{
  name: campaignName,
  campaign_budget: budgetResourceName,
  advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
  status: enums.CampaignStatus.PAUSED, // Start paused for review
  bidding_strategy_type: enums.BiddingStrategyType.MAXIMIZE_CONVERSIONS,
  start_date: '20251220', // YYYYMMDD format
  end_date: '20251231',
  network_settings: {
    target_google_search: true,
    target_search_network: false,
    target_content_network: false,
  },
  geo_target_type_setting: {
    positive_geo_target_type: enums.PositiveGeoTargetType.PRESENCE_OR_INTEREST,
  },
}]);
const campaignResourceName = campaignResult.results[0].resource_name;

// 3. Add Location Targeting
await customer.campaignCriteria.create([{
  campaign: campaignResourceName,
  location: {
    geo_target_constant: 'geoTargetConstants/1001773', // Brazil
  },
}]);

// 4. Create Ad Group
const adGroupResult = await customer.adGroups.create([{
  name: adGroupName,
  campaign: campaignResourceName,
  type: enums.AdGroupType.SEARCH_STANDARD,
  status: enums.AdGroupStatus.ENABLED,
  cpc_bid_micros: 1_000_000, // R$1.00
}]);
const adGroupResourceName = adGroupResult.results[0].resource_name;

// 5. Add Keywords
await customer.adGroupCriteria.create(keywords.map(kw => ({
  ad_group: adGroupResourceName,
  keyword: {
    text: kw.text,
    match_type: enums.KeywordMatchType[kw.matchType], // BROAD, PHRASE, EXACT
  },
  status: enums.AdGroupCriterionStatus.ENABLED,
})));

// 6. Create Responsive Search Ad
await customer.ads.create([{
  ad_group: adGroupResourceName,
  ad: {
    responsive_search_ad: {
      headlines: headlines.map((h, i) => ({
        text: h,
        pinned_field: i < 3 ? enums.ServedAssetFieldType.HEADLINE_1 + i : undefined,
      })),
      descriptions: descriptions.map(d => ({ text: d })),
      path1: 'produto',
      path2: 'comprar',
    },
    final_urls: [finalUrl],
  },
  status: enums.AdStatus.ENABLED,
}]);
```

### Geo Target Constants

Códigos de localização do Google Ads para Brasil:

| Local | Geo Target Constant |
|-------|---------------------|
| Brasil | 2076 |
| São Paulo (Estado) | 20106 |
| São Paulo (Cidade) | 1001773 |
| Rio de Janeiro (Estado) | 20111 |
| Rio de Janeiro (Cidade) | 1001774 |
| Minas Gerais | 20105 |
| Belo Horizonte | 1001768 |

### Rate Limits & Quotas

| Limit | Value |
|-------|-------|
| Operations per day (Standard) | 15,000 |
| Operations per day (Basic) | 10,000 |
| Requests per second | 1 (default), up to 100 with approval |
| Batch size per request | 5,000 operations |

### Error Handling

```typescript
try {
  await customer.campaigns.create([...]);
} catch (error) {
  if (error.errors) {
    // Google Ads API errors
    error.errors.forEach(e => {
      console.error(`Error: ${e.message}`);
      console.error(`Field: ${e.location?.field_path_elements}`);
      console.error(`Code: ${e.error_code}`);
    });
  }
}
```

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Direct REST API | Complex authentication, no TypeScript types |
| google-ads-node | Deprecated, use google-ads-api instead |
| Custom gRPC client | Unnecessary complexity, library handles this |

---

## R3: Bulk Operations Best Practices

### Decision: Batch Operations + Job Queue

**Rationale**: Google Ads API suporta batch mutate (múltiplas operações em uma request). Para 50+ campanhas, combinar com job queue para processamento assíncrono.

### Batch Mutate Pattern

```typescript
// Create multiple campaigns in one request
const operations = campaigns.map(campaign => ({
  create: {
    name: campaign.name,
    campaign_budget: budgetResourceName,
    // ... other fields
  }
}));

const response = await customer.campaigns.mutate({
  customer_id: customerId,
  operations: operations,
  partial_failure: true, // Continue on individual errors
});

// Check for partial failures
if (response.partial_failure_error) {
  const errors = response.partial_failure_error.details;
  // Log which operations failed
}
```

### Job Queue Architecture (BullMQ)

```typescript
// Queue setup
import { Queue, Worker } from 'bullmq';

const bulkOpsQueue = new Queue('bulk-operations', {
  connection: redisConnection,
});

// Add job
await bulkOpsQueue.add('create-campaigns', {
  userId: user.id,
  jobId: uuid(),
  mode: 'bulk_location',
  config: bulkLocationConfig,
  campaigns: generatedCampaigns,
});

// Worker
const worker = new Worker('bulk-operations', async (job) => {
  const { campaigns, jobId } = job.data;

  for (let i = 0; i < campaigns.length; i += 10) {
    const batch = campaigns.slice(i, i + 10);

    try {
      await publishBatch(batch);
      await updateJobProgress(jobId, i + batch.length, campaigns.length);
    } catch (error) {
      await logFailedItems(jobId, batch, error);
    }
  }
}, { connection: redisConnection });
```

### Progress Tracking

```typescript
interface BulkOperationJob {
  id: string;
  user_id: string;
  type: 'bulk_location' | 'bulk_product' | 'spreadsheet' | 'duplicate';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  total_items: number;
  completed_items: number;
  failed_items: number;
  error_log: {
    item_index: number;
    error_message: string;
    error_code?: string;
  }[];
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
}
```

### Real-time Updates (Server-Sent Events)

```typescript
// Backend: NestJS SSE endpoint
@Sse('jobs/:jobId/progress')
jobProgress(@Param('jobId') jobId: string): Observable<MessageEvent> {
  return interval(1000).pipe(
    switchMap(() => this.getJobProgress(jobId)),
    map(progress => ({
      data: JSON.stringify(progress),
    })),
    takeWhile(p => p.status !== 'completed' && p.status !== 'failed'),
  );
}

// Frontend: EventSource
const eventSource = new EventSource(`/api/google/jobs/${jobId}/progress`);
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  setProgress(progress);
};
```

### Retry Logic

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff

async function publishWithRetry(campaign: Campaign, attempt = 0): Promise<void> {
  try {
    await publishCampaign(campaign);
  } catch (error) {
    if (isRetryable(error) && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAYS[attempt]);
      return publishWithRetry(campaign, attempt + 1);
    }
    throw error;
  }
}

function isRetryable(error: any): boolean {
  const retryableCodes = [
    'RATE_LIMIT_EXCEEDED',
    'INTERNAL_ERROR',
    'TRANSIENT_ERROR',
  ];
  return retryableCodes.includes(error.error_code);
}
```

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Sequential processing | Too slow for 50+ campaigns |
| All-at-once batch | Google API batch limit (5,000), no progress tracking |
| WebSocket for progress | SSE simpler for one-way updates |

---

## R4: Spreadsheet Parsing

### Decision: xlsx + csv-parse libraries

**Rationale**: `xlsx` é a biblioteca mais completa para Excel, `csv-parse` para CSV. Ambas suportam streaming para arquivos grandes.

```bash
npm install xlsx csv-parse
```

### Implementation

```typescript
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse';

interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: ParseError[];
}

interface ParseError {
  row: number;
  column?: string;
  message: string;
}

async function parseSpreadsheet(buffer: Buffer, filename: string): Promise<ParseResult> {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return parseCSV(buffer);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(buffer);
  }

  throw new Error('Unsupported file format');
}

function parseExcel(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    header: 1,
    defval: '',
  });

  const headers = data[0] as string[];
  const rows = data.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = String(row[i] || '');
    });
    return obj;
  });

  return { headers, rows, errors: [] };
}

async function parseCSV(buffer: Buffer): Promise<ParseResult> {
  // Detect encoding
  const encoding = detectEncoding(buffer);
  const text = buffer.toString(encoding);

  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    const errors: ParseError[] = [];

    parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      on_record: (record, context) => {
        // Validate record
        const rowErrors = validateRow(record, context.lines);
        errors.push(...rowErrors);
        return record;
      },
    })
    .on('data', (row) => rows.push(row))
    .on('end', () => {
      const headers = Object.keys(rows[0] || {});
      resolve({ headers, rows, errors });
    })
    .on('error', reject);
  });
}
```

### Encoding Detection

```typescript
import * as chardet from 'chardet';

function detectEncoding(buffer: Buffer): BufferEncoding {
  const detected = chardet.detect(buffer);

  const encodingMap: Record<string, BufferEncoding> = {
    'UTF-8': 'utf-8',
    'UTF-16 LE': 'utf16le',
    'ISO-8859-1': 'latin1',
    'windows-1252': 'latin1',
  };

  return encodingMap[detected || 'UTF-8'] || 'utf-8';
}
```

### Column Mapping

```typescript
interface ColumnMapping {
  campaignName: string;
  budget: string;
  keywords: string;
  headlines: string;
  descriptions: string;
  finalUrl: string;
  locations?: string;
}

const DEFAULT_MAPPING: ColumnMapping = {
  campaignName: 'nome_campanha',
  budget: 'orcamento',
  keywords: 'palavras_chave',
  headlines: 'titulos',
  descriptions: 'descricoes',
  finalUrl: 'url_destino',
  locations: 'localizacoes',
};

function autoDetectMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};

  const patterns: Record<keyof ColumnMapping, RegExp[]> = {
    campaignName: [/nome.*campanha/i, /campaign.*name/i, /campanha/i],
    budget: [/orcamento/i, /budget/i, /valor/i],
    keywords: [/palavras.*chave/i, /keywords/i, /palavras/i],
    headlines: [/titulos/i, /headlines/i, /titulo/i],
    descriptions: [/descri/i, /description/i],
    finalUrl: [/url/i, /link/i, /destino/i],
    locations: [/local/i, /cidade/i, /location/i],
  };

  for (const [field, regexes] of Object.entries(patterns)) {
    for (const header of headers) {
      if (regexes.some(r => r.test(header))) {
        mapping[field as keyof ColumnMapping] = header;
        break;
      }
    }
  }

  return mapping;
}
```

### Validation

```typescript
interface ValidationRule {
  field: keyof ColumnMapping;
  required: boolean;
  validate: (value: string) => string | null; // Returns error message or null
}

const validationRules: ValidationRule[] = [
  {
    field: 'campaignName',
    required: true,
    validate: (v) => v.length > 0 && v.length <= 255 ? null : 'Nome deve ter 1-255 caracteres',
  },
  {
    field: 'budget',
    required: true,
    validate: (v) => {
      const num = parseFloat(v.replace(',', '.'));
      return !isNaN(num) && num > 0 ? null : 'Orçamento deve ser número positivo';
    },
  },
  {
    field: 'finalUrl',
    required: true,
    validate: (v) => {
      try {
        new URL(v);
        return null;
      } catch {
        return 'URL inválida';
      }
    },
  },
  {
    field: 'headlines',
    required: true,
    validate: (v) => {
      const headlines = v.split('|').map(h => h.trim());
      if (headlines.length < 3) return 'Mínimo 3 headlines';
      if (headlines.some(h => h.length > 30)) return 'Headlines devem ter máximo 30 caracteres';
      return null;
    },
  },
];
```

### Template Download

```typescript
function generateTemplate(): Buffer {
  const template = [
    ['nome_campanha', 'orcamento', 'palavras_chave', 'titulos', 'descricoes', 'url_destino', 'localizacoes'],
    ['Campanha Exemplo', '50', 'palavra1, palavra2, palavra3', 'Título 1|Título 2|Título 3', 'Descrição 1|Descrição 2', 'https://exemplo.com', 'São Paulo, Rio de Janeiro'],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(template);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Campanhas');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
```

### Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Papa Parse | Less features than csv-parse, no streaming |
| ExcelJS | More complex API, xlsx is simpler for read-only |
| Manual CSV parsing | Edge cases (quotes, commas, newlines) are complex |

---

## Environment Variables Required

```bash
# .env.example additions

# Google Ads API
GOOGLE_ADS_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=your-client-secret
GOOGLE_ADS_DEVELOPER_TOKEN=your-developer-token
GOOGLE_ADS_CALLBACK_URL=http://localhost:3001/google/oauth/callback

# Redis (for BullMQ job queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## Next Steps

1. Criar `data-model.md` com schema do banco de dados
2. Criar `contracts/` com especificações das APIs
3. Criar `quickstart.md` com guia de setup
4. Executar `/speckit.tasks` para gerar tasks.md
