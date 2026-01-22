-- Migration: Add document sharing fields
-- Description: Adds fields for public sharing functionality (share links)
-- Date: 2025-01-23

-- Add sharing columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS share_token VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index on share_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_share_token ON documents(share_token);

-- Create index on is_public for filtering
CREATE INDEX IF NOT EXISTS idx_documents_is_public ON documents(is_public);

COMMENT ON COLUMN documents.is_public IS 'Whether the document is publicly accessible';
COMMENT ON COLUMN documents.share_token IS 'Unique token for public access URL';
COMMENT ON COLUMN documents.share_expires_at IS 'Optional expiration date for share link';
