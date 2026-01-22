-- Migration 027: Style Presets for Visual Generation Studio
-- Feature: 027 - Visual Generation Studio
-- Created: 2025-12-12

-- Create style_presets table
CREATE TABLE IF NOT EXISTS style_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    name_pt VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    prompt_modifier TEXT NOT NULL,
    thumbnail_url TEXT,
    category VARCHAR(50) DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE style_presets IS 'Predefined style presets for image generation studio';
COMMENT ON COLUMN style_presets.name IS 'English name of the style';
COMMENT ON COLUMN style_presets.name_pt IS 'Portuguese name of the style';
COMMENT ON COLUMN style_presets.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN style_presets.prompt_modifier IS 'Text to append to user prompts for this style';
COMMENT ON COLUMN style_presets.thumbnail_url IS 'Example image URL for preview';
COMMENT ON COLUMN style_presets.category IS 'Style category (realistic, artistic, digital, design, style)';
COMMENT ON COLUMN style_presets.sort_order IS 'Display order in UI';
COMMENT ON COLUMN style_presets.is_active IS 'Whether preset is available for selection';

-- Create index for active presets query
CREATE INDEX IF NOT EXISTS idx_style_presets_active ON style_presets(is_active, sort_order) WHERE is_active = true;

-- Insert default style presets
INSERT INTO style_presets (name, name_pt, slug, prompt_modifier, category, sort_order) VALUES
('Photographic', 'Fotográfico', 'photographic', 'professional photography, high resolution, natural lighting, sharp focus, realistic, photorealistic', 'realistic', 1),
('Watercolor', 'Aquarela', 'watercolor', 'watercolor painting style, soft brushstrokes, flowing colors, artistic, hand-painted aesthetic, delicate washes', 'artistic', 2),
('3D Render', 'Render 3D', '3d-render', '3D render, octane render, volumetric lighting, highly detailed, CGI, digital art, ray tracing', 'digital', 3),
('Illustration', 'Ilustração', 'illustration', 'digital illustration, vector art style, clean lines, vibrant colors, graphic design, flat design', 'artistic', 4),
('Minimalist', 'Minimalista', 'minimalist', 'minimalist design, clean composition, negative space, simple elements, elegant, modern, less is more', 'design', 5),
('Vibrant', 'Vibrante', 'vibrant', 'vibrant colors, high saturation, bold, dynamic, energetic, eye-catching, vivid, colorful', 'style', 6),
('Vintage', 'Vintage', 'vintage', 'vintage aesthetic, retro style, film grain, muted colors, nostalgic, 70s/80s inspired, analog feel', 'style', 7),
('Cinematic', 'Cinematográfico', 'cinematic', 'cinematic lighting, movie scene, dramatic, widescreen composition, film quality, professional color grading, depth of field', 'realistic', 8)
ON CONFLICT (slug) DO NOTHING;
