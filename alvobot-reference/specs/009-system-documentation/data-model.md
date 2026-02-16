# Data Model: Missing & New Tables

**Date**: 2024-12-17
**Branch**: `009-system-documentation`

## Overview

This document defines the data model for tables that are **missing** or **need to be created** to complete the AlvoBot 2 system.

## 1. Notifications Table (MISSING - Causes Backend Errors)

### Purpose
Store user notifications for system events (articles published, tasks due, invites, etc.)

### Schema

```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only backend can create notifications (service role)
CREATE POLICY "Service can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);
```

### Entity Definition

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | No | Primary key |
| `user_id` | UUID | No | FK to auth.users |
| `type` | TEXT | No | Notification type enum |
| `title` | TEXT | No | Short notification title |
| `message` | TEXT | Yes | Detailed message (optional) |
| `data` | JSONB | Yes | Context data (article_id, etc.) |
| `read_at` | TIMESTAMPTZ | Yes | When user read it (null = unread) |
| `created_at` | TIMESTAMPTZ | No | Creation timestamp |

### Type Enum Values

```typescript
type NotificationType =
  | 'article_published'    // Article successfully published to WordPress
  | 'article_failed'       // Article publish failed
  | 'task_due'             // Task due date approaching
  | 'task_overdue'         // Task past due date
  | 'workspace_invite'     // Invited to workspace
  | 'workspace_joined'     // User joined workspace
  | 'credit_low'           // Credits running low
  | 'credit_depleted'      // Credits exhausted
  | 'flow_completed'       // Workflow execution completed
  | 'flow_failed'          // Workflow execution failed
  | 'system'               // System announcement
```

---

## 2. User Credits Table (NEW - For Monetization)

### Purpose
Track user credit balance and subscription status.

### Schema

```sql
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  plan_type TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_credits UNIQUE (user_id)
);

-- Index
CREATE INDEX idx_user_credits_stripe ON user_credits(stripe_customer_id);

-- RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
ON user_credits FOR SELECT
USING (auth.uid() = user_id);

-- Only backend can modify credits (service role)
CREATE POLICY "Service can manage credits"
ON user_credits FOR ALL
WITH CHECK (true);

-- Function to create credits on user signup
CREATE OR REPLACE FUNCTION create_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, total_credits, plan_type)
  VALUES (NEW.id, 10, 'free'); -- 10 free credits on signup
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_credits();
```

### Entity Definition

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | No | Primary key |
| `user_id` | UUID | No | FK to auth.users (unique) |
| `total_credits` | INTEGER | No | Total credits available |
| `used_credits` | INTEGER | No | Credits consumed |
| `plan_type` | TEXT | No | Subscription plan |
| `stripe_customer_id` | TEXT | Yes | Stripe customer ID |
| `stripe_subscription_id` | TEXT | Yes | Active subscription |
| `current_period_start` | TIMESTAMPTZ | Yes | Billing period start |
| `current_period_end` | TIMESTAMPTZ | Yes | Billing period end |
| `created_at` | TIMESTAMPTZ | No | Record creation |
| `updated_at` | TIMESTAMPTZ | No | Last update |

### Plan Types

| Plan | Credits/Month | Price |
|------|---------------|-------|
| `free` | 10 | R$ 0 |
| `starter` | 100 | R$ 49/month |
| `pro` | 500 | R$ 149/month |
| `enterprise` | Unlimited | Custom |

### Computed Field

```typescript
// Available credits
available_credits = total_credits - used_credits
```

---

## 3. Credit Transactions Table (NEW - Audit Trail)

### Purpose
Log all credit operations for auditing and debugging.

### Schema

```sql
CREATE TABLE credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positive = add, Negative = consume
  operation TEXT NOT NULL,
  reference_type TEXT, -- 'article', 'keyword_batch', etc.
  reference_id INTEGER, -- ID of related entity
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at DESC);

-- RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON credit_transactions FOR SELECT
USING (auth.uid() = user_id);
```

### Entity Definition

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | No | Primary key |
| `user_id` | UUID | No | FK to auth.users |
| `amount` | INTEGER | No | Credits added (+) or consumed (-) |
| `operation` | TEXT | No | Operation type |
| `reference_type` | TEXT | Yes | Related entity type |
| `reference_id` | INTEGER | Yes | Related entity ID |
| `balance_after` | INTEGER | No | Balance after transaction |
| `created_at` | TIMESTAMPTZ | No | Transaction timestamp |

### Operation Types

```typescript
type CreditOperation =
  | 'signup_bonus'        // Initial free credits
  | 'subscription_renewal'// Monthly credit reset
  | 'manual_add'          // Admin adjustment
  | 'article_generation'  // Arrow/Base article created
  | 'keyword_mining'      // Keyword batch mined
  | 'ai_title_generation' // Title generation
  | 'refund'              // Credit refund
```

---

## 4. Activity Logs Table (NEW - User Activity Tracking)

### Purpose
Track user actions for dashboard activity feed and analytics.

### Schema

```sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_workspace ON activity_logs(workspace_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
ON activity_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Workspace members can view workspace activity"
ON activity_logs FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);
```

### Entity Definition

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | SERIAL | No | Primary key |
| `user_id` | UUID | No | FK to auth.users |
| `workspace_id` | INTEGER | Yes | FK to workspaces |
| `action` | TEXT | No | Action performed |
| `entity_type` | TEXT | No | Type of entity affected |
| `entity_id` | INTEGER | Yes | ID of affected entity |
| `entity_name` | TEXT | Yes | Name for display |
| `metadata` | JSONB | Yes | Additional context |
| `created_at` | TIMESTAMPTZ | No | Action timestamp |

### Action Types

```typescript
type ActivityAction =
  | 'created' | 'updated' | 'deleted' | 'archived'
  | 'published' | 'scheduled' | 'imported' | 'exported'
  | 'invited' | 'joined' | 'left'
  | 'started' | 'completed' | 'failed'
```

### Entity Types

```typescript
type EntityType =
  | 'article' | 'project' | 'task' | 'keyword'
  | 'flow' | 'trigger' | 'workspace' | 'member'
```

---

## 5. User Settings Table (NEW - Persist Settings)

### Purpose
Store user preferences and settings (currently mocked in SettingsPage).

### Schema

```sql
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT false,
  weekly_digest BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'pt-BR',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  theme TEXT DEFAULT 'light',
  dashboard_layout JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_settings UNIQUE (user_id)
);

-- RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own settings"
ON user_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create settings on user signup
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_settings();
```

### Entity Definition

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| `id` | SERIAL | No | - | Primary key |
| `user_id` | UUID | No | - | FK to auth.users (unique) |
| `email_notifications` | BOOLEAN | No | true | Receive email notifications |
| `push_notifications` | BOOLEAN | No | false | Browser push notifications |
| `weekly_digest` | BOOLEAN | No | true | Weekly summary email |
| `language` | TEXT | No | 'pt-BR' | UI language |
| `timezone` | TEXT | No | 'America/Sao_Paulo' | User timezone |
| `theme` | TEXT | No | 'light' | UI theme |
| `dashboard_layout` | JSONB | Yes | {} | Custom dashboard widgets |
| `created_at` | TIMESTAMPTZ | No | NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | No | NOW() | Last update |

---

## Entity Relationship Diagram (New Tables)

```text
                    ┌─────────────────┐
                    │   auth.users    │
                    │       (id)      │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  notifications  │ │  user_credits   │ │  user_settings  │
│    (user_id)    │ │    (user_id)    │ │    (user_id)    │
└─────────────────┘ └────────┬────────┘ └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │credit_transactions│
                    │    (user_id)    │
                    └─────────────────┘

┌─────────────────┐
│  activity_logs  │
│ (user_id, workspace_id) │
└─────────────────┘
```

---

## Migration Script

```sql
-- Migration: Create missing tables
-- Version: 2024-12-17

-- 1. Notifications (fixes backend errors)
CREATE TABLE IF NOT EXISTS notifications (...);

-- 2. User credits (enables monetization)
CREATE TABLE IF NOT EXISTS user_credits (...);

-- 3. Credit transactions (audit trail)
CREATE TABLE IF NOT EXISTS credit_transactions (...);

-- 4. Activity logs (dashboard feed)
CREATE TABLE IF NOT EXISTS activity_logs (...);

-- 5. User settings (persist preferences)
CREATE TABLE IF NOT EXISTS user_settings (...);

-- Create initial records for existing users
INSERT INTO user_credits (user_id, total_credits, plan_type)
SELECT id, 10, 'free' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
```

---

## TypeScript Types

```typescript
// types/database.ts

export interface Notification {
  id: number;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface UserCredits {
  id: number;
  user_id: string;
  total_credits: number;
  used_credits: number;
  plan_type: PlanType;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: number;
  user_id: string;
  amount: number;
  operation: CreditOperation;
  reference_type: string | null;
  reference_id: number | null;
  balance_after: number;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: string;
  workspace_id: number | null;
  action: ActivityAction;
  entity_type: EntityType;
  entity_id: number | null;
  entity_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserSettings {
  id: number;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  weekly_digest: boolean;
  language: string;
  timezone: string;
  theme: 'light' | 'dark';
  dashboard_layout: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
```
