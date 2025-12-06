-- Migration: 024_add_referencia_category.sql
-- Feature: 011-smart-visual-assets
-- Date: 2025-12-06
-- Description: Add 'Referência' category to visual asset classification

-- ============================================================================
-- UPDATE ASSET CATEGORY CONSTRAINT
-- ============================================================================

-- Remove o constraint antigo
ALTER TABLE documents DROP CONSTRAINT IF EXISTS chk_asset_category;

-- Adiciona o novo constraint com Referência
ALTER TABLE documents
ADD CONSTRAINT chk_asset_category
CHECK (asset_category IS NULL OR asset_category IN ('Logo', 'Pessoa', 'Background', 'Produto', 'Referência', 'Outro'));

-- Atualiza o comentário
COMMENT ON COLUMN documents.asset_category IS 'Visual asset category: Logo, Pessoa, Background, Produto, Referência, Outro';
