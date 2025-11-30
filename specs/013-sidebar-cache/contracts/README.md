# Contracts: Sidebar Cache

**Feature**: 013-sidebar-cache
**Date**: 2025-11-30

## No API Changes Required

This feature is **frontend-only** and does not require any backend API changes.

The sidebar cache uses:
- Existing `/projects` endpoint (via Supabase client)
- Existing `/workspaces` endpoint (via Supabase client)
- Existing `/projects/{id}/assets` endpoint
- Existing `documentService.listForSidebar()` Supabase query

All data persistence is handled client-side via `localStorage`.

## Client-Side Interfaces

See [data-model.md](../data-model.md) for TypeScript interfaces used in the cache implementation.
