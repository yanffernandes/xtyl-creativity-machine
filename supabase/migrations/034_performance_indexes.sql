-- Migration: 034_performance_indexes.sql
-- Feature: 030-performance-optimization
-- Created: 2026-01-25
-- Purpose: Add performance indexes for common query patterns

-- FR-013: Optimize context file queries
-- Query pattern: WHERE project_id = ? AND is_context = TRUE AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_context
ON documents(project_id, is_context)
WHERE deleted_at IS NULL;

-- FR-014: Optimize image relationship lookups
-- Query pattern: WHERE original_image_id = ? AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_original_image
ON documents(original_image_id)
WHERE deleted_at IS NULL;

-- FR-015: Optimize visual asset queries
-- Query pattern: WHERE project_id = ? AND is_reference_asset = TRUE AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_reference_asset
ON documents(project_id, is_reference_asset)
WHERE deleted_at IS NULL;

-- FR-016: Optimize attachment image lookups
-- Query pattern: WHERE image_id = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attachments_image
ON document_attachments(image_id);

-- FR-017: Optimize share token lookups
-- Query pattern: WHERE share_token = ? AND is_public = TRUE AND deleted_at IS NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_share_token
ON documents(share_token)
WHERE is_public = TRUE AND deleted_at IS NULL;
