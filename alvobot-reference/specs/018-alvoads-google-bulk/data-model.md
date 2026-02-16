# Data Model: AlvoADS Google - Campanhas em Massa

**Feature**: 018-alvoads-google-bulk
**Date**: 2025-12-15

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────────┐
│   auth.users        │       │    google_connections   │
├─────────────────────┤       ├─────────────────────────┤
│ id (UUID) PK        │◄──────│ user_id (UUID) FK       │
│ email               │       │ id (UUID) PK            │
│ ...                 │       │ customer_id             │
└─────────────────────┘       │ access_token            │
         │                    │ refresh_token           │
         │                    │ ...                     │
         │                    └─────────────────────────┘
         │
         │                    ┌─────────────────────────┐
         │                    │ google_campaign_templates│
         ├───────────────────►├─────────────────────────┤
         │                    │ id (UUID) PK            │
         │                    │ user_id (UUID) FK       │
         │                    │ connection_id (UUID) FK │
         │                    │ name                    │
         │                    │ status                  │
         │                    │ network_type            │
         │                    │ creation_mode           │
         │                    │ bulk_job_id (UUID) FK   │
         │                    │ ...                     │
         │                    └─────────────────────────┘
         │
         │                    ┌─────────────────────────┐
         │                    │   bulk_operation_jobs   │
         ├───────────────────►├─────────────────────────┤
         │                    │ id (UUID) PK            │
         │                    │ user_id (UUID) FK       │
         │                    │ type                    │
         │                    │ status                  │
         │                    │ config (JSONB)          │
         │                    │ ...                     │
         │                    └───────────┬─────────────┘
         │                                │
         │                                │ 1:N
         │                                ▼
         │                    ┌─────────────────────────┐
         │                    │  bulk_operation_items   │
         │                    ├─────────────────────────┤
         │                    │ id (UUID) PK            │
         │                    │ job_id (UUID) FK        │
         │                    │ template_id (UUID) FK   │
         │                    │ status                  │
         │                    │ error_message           │
         │                    │ ...                     │
         │                    └─────────────────────────┘
```

---

## Tables

### 1. google_connections

Armazena conexões OAuth com contas Google Ads.

```sql
CREATE TABLE public.google_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Google Ads Account Info
    customer_id TEXT NOT NULL,           -- 10-digit Google Ads customer ID (e.g., '1234567890')
    customer_name TEXT,                   -- Display name of the account
    login_customer_id TEXT,              -- MCC manager account ID (if applicable)

    -- OAuth Tokens (encrypted at rest via Supabase)
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,

    -- Account metadata
    currency_code TEXT DEFAULT 'BRL',    -- Account currency
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    account_type TEXT DEFAULT 'standard', -- 'standard' | 'manager'

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    error_message TEXT,                  -- Last error if any

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_google_connections_user_id ON public.google_connections(user_id);
CREATE INDEX idx_google_connections_customer_id ON public.google_connections(customer_id);
CREATE UNIQUE INDEX idx_google_connections_user_customer ON public.google_connections(user_id, customer_id);

-- RLS
ALTER TABLE public.google_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections"
    ON public.google_connections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
    ON public.google_connections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
    ON public.google_connections FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
    ON public.google_connections FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
    ON public.google_connections FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER google_connections_updated_at
    BEFORE UPDATE ON public.google_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. google_campaign_templates (EXTEND EXISTING)

Extensão da tabela existente para suportar criação em massa.

```sql
-- Add new columns to existing table
ALTER TABLE public.google_campaign_templates
    ADD COLUMN IF NOT EXISTS connection_id UUID REFERENCES public.google_connections(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS creation_mode TEXT DEFAULT 'single',
    ADD COLUMN IF NOT EXISTS bulk_job_id UUID,
    ADD COLUMN IF NOT EXISTS location_variation TEXT,  -- For bulk_location mode
    ADD COLUMN IF NOT EXISTS product_variation TEXT,   -- For bulk_product mode
    ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES public.google_campaign_templates(id),
    ADD COLUMN IF NOT EXISTS credits_consumed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS publish_attempts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_publish_error TEXT;

-- Add check constraint for creation_mode
ALTER TABLE public.google_campaign_templates
    ADD CONSTRAINT check_creation_mode
    CHECK (creation_mode IN ('single', 'bulk_location', 'bulk_product', 'spreadsheet', 'duplicate'));

-- Add index for bulk operations
CREATE INDEX IF NOT EXISTS idx_google_templates_bulk_job
    ON public.google_campaign_templates(bulk_job_id);

CREATE INDEX IF NOT EXISTS idx_google_templates_creation_mode
    ON public.google_campaign_templates(creation_mode);

CREATE INDEX IF NOT EXISTS idx_google_templates_connection
    ON public.google_campaign_templates(connection_id);
```

### 3. bulk_operation_jobs

Rastreia operações de criação em massa.

```sql
CREATE TABLE public.bulk_operation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Job Type
    type TEXT NOT NULL CHECK (type IN ('bulk_location', 'bulk_product', 'spreadsheet', 'duplicate')),

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'partial')),

    -- Configuration (varies by type)
    config JSONB NOT NULL DEFAULT '{}',
    /*
    For bulk_location:
    {
      "base_template": {...},
      "locations": [{"code": "1001773", "name": "São Paulo", "custom_budget": 50}],
      "variations": {"include_location_in_name": true, ...}
    }

    For bulk_product:
    {
      "products": [{"name": "Produto 1", "url": "...", "description": "..."}],
      "ai_settings": {"generate_keywords": true, "keywords_per_product": 10, ...},
      "campaign_defaults": {...}
    }

    For spreadsheet:
    {
      "file_name": "campanhas.xlsx",
      "column_mapping": {"campaignName": "nome", "budget": "orcamento", ...},
      "defaults": {...}
    }

    For duplicate:
    {
      "source_template_id": "uuid",
      "copies": 5,
      "variations": {"append_suffix": true, "suffix_template": " - Cópia {{n}}"}
    }
    */

    -- Progress
    total_items INTEGER NOT NULL DEFAULT 0,
    completed_items INTEGER NOT NULL DEFAULT 0,
    failed_items INTEGER NOT NULL DEFAULT 0,

    -- Credits
    estimated_credits INTEGER NOT NULL DEFAULT 0,
    consumed_credits INTEGER NOT NULL DEFAULT 0,

    -- Error tracking
    error_log JSONB DEFAULT '[]',
    /*
    [
      {"item_index": 3, "template_id": "uuid", "error": "Invalid budget", "code": "VALIDATION_ERROR"},
      ...
    ]
    */

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_bulk_jobs_user_id ON public.bulk_operation_jobs(user_id);
CREATE INDEX idx_bulk_jobs_status ON public.bulk_operation_jobs(status);
CREATE INDEX idx_bulk_jobs_type ON public.bulk_operation_jobs(type);
CREATE INDEX idx_bulk_jobs_created ON public.bulk_operation_jobs(created_at DESC);

-- RLS
ALTER TABLE public.bulk_operation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
    ON public.bulk_operation_jobs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
    ON public.bulk_operation_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
    ON public.bulk_operation_jobs FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
    ON public.bulk_operation_jobs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```

### 4. bulk_operation_items

Itens individuais de cada operação em massa.

```sql
CREATE TABLE public.bulk_operation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.bulk_operation_jobs(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.google_campaign_templates(id) ON DELETE SET NULL,

    -- Item identification
    item_index INTEGER NOT NULL,  -- Order in the batch
    item_name TEXT,               -- Display name (e.g., location name, product name)

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),

    -- Input data
    input_data JSONB NOT NULL DEFAULT '{}',
    /*
    For bulk_location: {"location_code": "1001773", "location_name": "São Paulo"}
    For bulk_product: {"product_name": "Camiseta", "product_url": "..."}
    For spreadsheet: {"row_number": 5, "row_data": {...}}
    For duplicate: {"copy_number": 2}
    */

    -- Output
    google_campaign_id TEXT,      -- Google Ads campaign ID after publishing
    google_ad_group_id TEXT,
    google_ad_id TEXT,

    -- Error handling
    error_message TEXT,
    error_code TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Credits
    credits_cost INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_bulk_items_job_id ON public.bulk_operation_items(job_id);
CREATE INDEX idx_bulk_items_status ON public.bulk_operation_items(status);
CREATE INDEX idx_bulk_items_template ON public.bulk_operation_items(template_id);

-- RLS (inherit from parent job)
ALTER TABLE public.bulk_operation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items via job"
    ON public.bulk_operation_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bulk_operation_jobs
            WHERE id = bulk_operation_items.job_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Service role full access"
    ON public.bulk_operation_items FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```

### 5. google_geo_targets (Reference Table)

Cache de geo targets do Google Ads para lookup rápido.

```sql
CREATE TABLE public.google_geo_targets (
    id BIGINT PRIMARY KEY,               -- Google's geo_target_constant ID
    canonical_name TEXT NOT NULL,        -- Full name (e.g., "São Paulo, São Paulo, Brazil")
    name TEXT NOT NULL,                  -- Short name (e.g., "São Paulo")
    country_code TEXT,                   -- e.g., "BR"
    target_type TEXT NOT NULL,           -- "Country", "Region", "City", etc.
    parent_id BIGINT,                    -- Parent geo target
    status TEXT DEFAULT 'active',

    -- Search optimization
    search_terms TSVECTOR,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_geo_targets_country ON public.google_geo_targets(country_code);
CREATE INDEX idx_geo_targets_type ON public.google_geo_targets(target_type);
CREATE INDEX idx_geo_targets_search ON public.google_geo_targets USING GIN(search_terms);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION update_geo_target_search()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_terms = to_tsvector('portuguese', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.canonical_name, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER geo_target_search_update
    BEFORE INSERT OR UPDATE ON public.google_geo_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_geo_target_search();

-- No RLS - public read access
-- Seed with Brazilian locations (run separately)
```

---

## Views

### 1. user_google_connections_summary

```sql
CREATE OR REPLACE VIEW public.user_google_connections_summary AS
SELECT
    gc.id,
    gc.user_id,
    gc.customer_id,
    gc.customer_name,
    gc.account_type,
    gc.is_active,
    gc.last_used_at,
    gc.error_message,
    gc.created_at,
    -- Stats
    (SELECT COUNT(*) FROM public.google_campaign_templates gct
     WHERE gct.connection_id = gc.id) as total_templates,
    (SELECT COUNT(*) FROM public.google_campaign_templates gct
     WHERE gct.connection_id = gc.id AND gct.status = 'published') as published_campaigns
FROM public.google_connections gc
WHERE gc.is_active = true;
```

### 2. bulk_jobs_with_progress

```sql
CREATE OR REPLACE VIEW public.bulk_jobs_with_progress AS
SELECT
    boj.id,
    boj.user_id,
    boj.type,
    boj.status,
    boj.total_items,
    boj.completed_items,
    boj.failed_items,
    boj.estimated_credits,
    boj.consumed_credits,
    boj.created_at,
    boj.started_at,
    boj.completed_at,
    -- Calculated fields
    CASE
        WHEN boj.total_items > 0
        THEN ROUND((boj.completed_items::DECIMAL / boj.total_items) * 100, 1)
        ELSE 0
    END as progress_percentage,
    CASE
        WHEN boj.started_at IS NOT NULL AND boj.completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (boj.completed_at - boj.started_at))
        ELSE NULL
    END as duration_seconds,
    -- Item summary
    (SELECT COUNT(*) FROM public.bulk_operation_items boi
     WHERE boi.job_id = boj.id AND boi.status = 'pending') as pending_items,
    (SELECT COUNT(*) FROM public.bulk_operation_items boi
     WHERE boi.job_id = boj.id AND boi.status = 'processing') as processing_items
FROM public.bulk_operation_jobs boj;
```

---

## JSONB Schemas

### bulk_location Config

```typescript
interface BulkLocationConfig {
  base_template: {
    campaign: {
      name: string;
      goal: string;
      budget: number;
      budget_type: 'daily' | 'total';
      bidding_strategy: string;
      languages: string[];
    };
    ad_group: {
      name: string;
      keywords: Array<{
        text: string;
        match_type: 'BROAD' | 'PHRASE' | 'EXACT';
      }>;
      ads: Array<{
        headlines: string[];
        descriptions: string[];
        final_url: string;
      }>;
    };
    extensions: {
      sitelinks: Array<{text: string; url: string}>;
      callouts: string[];
    };
  };
  locations: Array<{
    code: string;            // Geo target constant ID
    name: string;            // Display name
    custom_budget?: number;  // Override budget
    custom_keywords?: string[];  // Additional keywords
  }>;
  variations: {
    include_location_in_name: boolean;
    include_location_in_keywords: boolean;
    include_location_in_ads: boolean;
    name_template: string;      // e.g., "{{campaign}} - {{cidade}}"
    keyword_template: string;   // e.g., "{{keyword}} em {{cidade}}"
    headline_template: string;  // e.g., "{{headline}} {{cidade}}"
  };
}
```

### bulk_product Config

```typescript
interface BulkProductConfig {
  products: Array<{
    name: string;
    description?: string;
    url: string;
    price?: number;
    category?: string;
    image_url?: string;
  }>;
  ai_settings: {
    generate_keywords: boolean;
    generate_headlines: boolean;
    generate_descriptions: boolean;
    keywords_per_product: number;   // 5-50
    headlines_per_product: number;  // 3-15
    descriptions_per_product: number; // 2-4
    keyword_match_types: ('BROAD' | 'PHRASE' | 'EXACT')[];
    tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
  };
  campaign_defaults: {
    goal: string;
    budget: number;
    budget_type: 'daily' | 'total';
    bidding_strategy: string;
    locations: string[];
    languages: string[];
  };
}
```

---

## Migration SQL

```sql
-- Migration: 005_google_ads_bulk.sql
-- Date: 2025-12-15

-- 1. Create google_connections table
-- (SQL from above)

-- 2. Extend google_campaign_templates
-- (SQL from above)

-- 3. Create bulk_operation_jobs
-- (SQL from above)

-- 4. Create bulk_operation_items
-- (SQL from above)

-- 5. Create google_geo_targets
-- (SQL from above)

-- 6. Create views
-- (SQL from above)

-- 7. Seed Brazilian geo targets (partial)
INSERT INTO public.google_geo_targets (id, canonical_name, name, country_code, target_type) VALUES
(2076, 'Brazil', 'Brasil', 'BR', 'Country'),
(20106, 'Sao Paulo, Brazil', 'São Paulo', 'BR', 'Region'),
(1001773, 'Sao Paulo, Sao Paulo, Brazil', 'São Paulo', 'BR', 'City'),
(20111, 'Rio de Janeiro, Brazil', 'Rio de Janeiro', 'BR', 'Region'),
(1001774, 'Rio de Janeiro, Rio de Janeiro, Brazil', 'Rio de Janeiro', 'BR', 'City'),
(20105, 'Minas Gerais, Brazil', 'Minas Gerais', 'BR', 'Region'),
(1001768, 'Belo Horizonte, Minas Gerais, Brazil', 'Belo Horizonte', 'BR', 'City'),
(20107, 'Parana, Brazil', 'Paraná', 'BR', 'Region'),
(1001769, 'Curitiba, Parana, Brazil', 'Curitiba', 'BR', 'City'),
(20112, 'Rio Grande do Sul, Brazil', 'Rio Grande do Sul', 'BR', 'Region'),
(1001780, 'Porto Alegre, Rio Grande do Sul, Brazil', 'Porto Alegre', 'BR', 'City')
ON CONFLICT (id) DO NOTHING;
```
