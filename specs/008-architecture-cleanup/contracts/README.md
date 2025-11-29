# API Contracts: Architecture Cleanup

**Feature**: 008-architecture-cleanup
**Date**: 2025-11-28

## Not Applicable

This feature is a documentation and configuration cleanup effort. It does not introduce or modify any API endpoints.

**No API contracts are required for this feature.**

## Reference

For the canonical API contracts of the hybrid Supabase architecture, see:
- Backend REST API: `/backend/main.py` → `/docs` endpoint
- Supabase Client API: Frontend directly calls Supabase for CRUD operations
- Python Backend API: AI/LLM operations only (chat, image generation, workflows)
