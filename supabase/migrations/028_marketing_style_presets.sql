-- Migration 028: Marketing Style Presets for Visual Generation Studio
-- Feature: 027 - Visual Generation Studio (Enhancement)
-- Created: 2025-12-13
-- Description: Adds marketing-focused style presets for social media and advertising

-- Insert marketing style presets (starting from sort_order 10 to not conflict with existing)
INSERT INTO style_presets (name, name_pt, slug, prompt_modifier, category, sort_order) VALUES
-- Social Media Formats
('Social Feed Post', 'Post para Feed', 'social-feed', 'professional social media post, clean design, brand-friendly, engaging visual content, optimized for Instagram/Facebook feed, modern marketing aesthetic, high engagement potential', 'design', 10),
('Vertical Story', 'Story Vertical', 'vertical-story', 'vertical story format, 9:16 aspect ratio optimized, mobile-first design, Instagram/TikTok story style, dynamic composition, attention-grabbing, swipe-up friendly', 'design', 11),
('Banner CTA', 'Banner com CTA', 'banner-cta', 'advertising banner, call-to-action focused, bold typography space, promotional design, conversion-optimized, marketing campaign style, eye-catching, professional advertising', 'design', 12),
('Carousel Slide', 'Slide para Carrossel', 'carousel-slide', 'carousel post slide, consistent branding, educational content style, swipe-worthy, clean layout, numbered sequence friendly, social media carousel optimized', 'design', 13),

-- Marketing Aesthetics
('Corporate Professional', 'Corporativo Profissional', 'corporate-pro', 'corporate professional aesthetic, business-friendly, trustworthy, clean and modern, executive style, LinkedIn-ready, premium business look, polished', 'design', 14),
('Startup Tech', 'Startup Tech', 'startup-tech', 'tech startup aesthetic, innovative, modern SaaS style, gradient backgrounds, futuristic elements, digital-first, silicon valley inspired, clean tech design', 'digital', 15),
('E-commerce Product', 'Produto E-commerce', 'ecommerce-product', 'e-commerce product photography style, white background, professional product shot, clean composition, commercial ready, sales-focused, high-quality product display', 'realistic', 16),
('Influencer Lifestyle', 'Lifestyle Influencer', 'influencer-lifestyle', 'influencer lifestyle aesthetic, aspirational, authentic feel, Instagram-worthy, lifestyle marketing, relatable yet premium, personal branding friendly', 'style', 17),

-- Campaign Styles
('Sale Promo', 'Promoção de Venda', 'sale-promo', 'promotional sale design, discount-focused, urgency elements, bold colors, special offer style, black friday aesthetic, clearance sale look, attention-grabbing promo', 'design', 18),
('Launch Announcement', 'Anúncio de Lançamento', 'launch-announcement', 'product launch announcement style, exciting reveal, coming soon aesthetic, anticipation building, dramatic unveiling, new release marketing, premiere look', 'design', 19),
('Testimonial Quote', 'Citação Testimonial', 'testimonial-quote', 'testimonial design, quote-friendly layout, customer review style, social proof aesthetic, trust-building, endorsement look, clean quote presentation', 'design', 20),
('Behind The Scenes', 'Bastidores', 'behind-scenes', 'behind the scenes aesthetic, authentic moments, candid style, brand transparency, human element, genuine feel, documentary style marketing', 'style', 21)
ON CONFLICT (slug) DO NOTHING;
