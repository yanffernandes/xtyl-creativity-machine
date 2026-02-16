# Data Model: Google Search Console Indexing

## Entities

### search_console_connections
Represents OAuth connection per workspace.
- id (uuid, pk)
- workspace_id (uuid, fk)
- user_id (uuid, fk) — creator/owner
- provider (text, default: "google")
- access_token (text, encrypted)
- refresh_token (text, encrypted)
- token_expires_at (timestamptz)
- scopes (text[])
- status (text: active | revoked | error)
- last_checked_at (timestamptz)
- created_at (timestamptz)
- updated_at (timestamptz)

### search_console_properties
Authorized properties per connection.
- id (uuid, pk)
- connection_id (uuid, fk)
- site_url (text, unique per connection)
- property_type (text: domain | url_prefix)
- ownership (text: verified | unverified)
- created_at (timestamptz)

### search_console_indexing_status
Latest index status per article URL.
- id (uuid, pk)
- workspace_id (uuid, fk)
- project_id (uuid, fk, nullable)
- article_id (uuid, fk)
- url (text, unique per article)
- property_id (uuid, fk)
- verdict (text: indexed | not_indexed | unknown | error)
- coverage_state (text, nullable)
- last_inspected_at (timestamptz)
- last_inspection_result (jsonb)
- last_error (text, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)

### search_console_indexing_requests
Queue and history of indexing requests.
- id (uuid, pk)
- connection_id (uuid, fk)
- workspace_id (uuid, fk)
- article_id (uuid, fk)
- url (text)
- request_type (text: URL_UPDATED | URL_DELETED)
- status (text: queued | sent | succeeded | failed | blocked)
- blocked_reason (text, nullable)
- response_payload (jsonb, nullable)
- requested_at (timestamptz)
- processed_at (timestamptz)

### search_console_quota_usage
Daily quota usage per connection.
- id (uuid, pk)
- connection_id (uuid, fk)
- date (date)
- publish_quota_limit (int, default 200)
- publish_quota_used (int, default 0)
- inspection_quota_limit (int, default 2000)
- inspection_quota_used (int, default 0)
- updated_at (timestamptz)

## Relationships
- search_console_connections 1—N search_console_properties
- search_console_connections 1—N search_console_indexing_requests
- search_console_properties 1—N search_console_indexing_status
- articles 1—1 search_console_indexing_status
- search_console_connections 1—N search_console_quota_usage (by date)

## Validation Rules
- url must be absolute and belong to selected property for inspection
- enqueue only if not already requested same day (FR-014)
- block requests when URL not eligible (FR-016)
- enforce per-connection quota limits (FR-004, FR-013)

## State Transitions
- indexing_requests.status: queued → sent → succeeded | failed
- indexing_requests.status: queued → blocked (if ineligible/quota)
- connections.status: active → revoked | error
