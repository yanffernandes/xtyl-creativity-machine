-- Migration 029: Add preset_type column to style_presets
-- Feature: 027 - Visual Generation Studio (Enhancement)
-- Created: 2025-12-13
-- Description: Separates presets into visual_style (aesthetic) and layout (structure/diagramming)

-- Add preset_type column with default 'visual_style'
ALTER TABLE style_presets
ADD COLUMN IF NOT EXISTS preset_type VARCHAR(50) DEFAULT 'visual_style';

-- Update existing visual style presets (original 8)
UPDATE style_presets SET preset_type = 'visual_style'
WHERE slug IN ('photographic', 'watercolor', '3d-render', 'illustration', 'minimalist', 'vibrant', 'vintage', 'cinematic');

-- Update marketing/layout presets
UPDATE style_presets SET preset_type = 'layout'
WHERE slug IN (
    'social-feed',
    'vertical-story',
    'banner-cta',
    'carousel-slide',
    'corporate-pro',
    'startup-tech',
    'ecommerce-product',
    'influencer-lifestyle',
    'sale-promo',
    'launch-announcement',
    'testimonial-quote',
    'behind-scenes'
);

-- Create index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_style_presets_type ON style_presets(preset_type);
