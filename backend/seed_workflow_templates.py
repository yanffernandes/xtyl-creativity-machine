"""
Seed Script for System Workflow Templates

Creates 3 example workflow templates:
1. Facebook Ads Campaign - Generate ad copy and creative
2. Instagram Posts - Generate post with image
3. Blog Article with Featured Image - Generate article and header image
"""

import sys
import uuid
from database import SessionLocal
from models import WorkflowTemplate

def create_facebook_ads_template(db):
    """Facebook Ads Campaign workflow"""
    template_id = str(uuid.uuid4())

    nodes = [
        {
            "id": "start_1",
            "type": "start",
            "position": {"x": 100, "y": 100},
            "data": {"label": "Start"}
        },
        {
            "id": "generate_headline",
            "type": "generate_copy",
            "position": {"x": 300, "y": 100},
            "data": {
                "label": "Generate Ad Headline",
                "prompt": "Create a compelling Facebook ad headline for: {product_description}\n\nTarget audience: {target_audience}\nKey benefit: {key_benefit}\n\nMake it attention-grabbing, under 40 characters.",
                "model": "openai/gpt-4",
                "temperature": 0.8,
                "title": "Ad Headline"
            }
        },
        {
            "id": "generate_body",
            "type": "generate_copy",
            "position": {"x": 500, "y": 100},
            "data": {
                "label": "Generate Ad Body",
                "prompt": "Create Facebook ad body copy for: {product_description}\n\nTarget audience: {target_audience}\nKey benefit: {key_benefit}\nHeadline: {generate_headline}\n\nWrite 2-3 sentences that drive action. Include a clear CTA.",
                "model": "openai/gpt-4",
                "temperature": 0.7,
                "title": "Ad Body Copy"
            }
        },
        {
            "id": "generate_image",
            "type": "generate_image",
            "position": {"x": 700, "y": 100},
            "data": {
                "label": "Generate Ad Creative",
                "prompt": "Professional Facebook ad creative for {product_description}. {visual_style}. High quality, eye-catching, on-brand.",
                "model": "google/gemini-2.5-flash-image-preview",
                "aspect_ratio": "1:1",
                "quality": "standard",
                "title": "Ad Creative"
            }
        },
        {
            "id": "attach_image",
            "type": "attach",
            "position": {"x": 900, "y": 100},
            "data": {
                "label": "Attach Creative to Copy",
                "document_ref": "generate_body",
                "image_ref": "generate_image",
                "is_primary": True
            }
        },
        {
            "id": "end_1",
            "type": "end",
            "position": {"x": 1100, "y": 100},
            "data": {"label": "Complete"}
        }
    ]

    edges = [
        {"id": "e1", "source": "start_1", "target": "generate_headline"},
        {"id": "e2", "source": "generate_headline", "target": "generate_body"},
        {"id": "e3", "source": "generate_body", "target": "generate_image"},
        {"id": "e4", "source": "generate_image", "target": "attach_image"},
        {"id": "e5", "source": "attach_image", "target": "end_1"}
    ]

    default_params = {
        "product_description": "Your product or service",
        "target_audience": "Your target audience",
        "key_benefit": "Main benefit or value proposition",
        "visual_style": "modern, vibrant"
    }

    template = WorkflowTemplate(
        id=template_id,
        workspace_id=None,  # System templates don't belong to a workspace
        name="Facebook Ads Campaign",
        description="Generate complete Facebook ad campaign with headline, body copy, and creative image. Perfect for paid advertising.",
        category="paid_ads",
        nodes_json=nodes,
        edges_json=edges,
        default_params_json=default_params,
        is_system=True,
        usage_count=0,
        created_by=None
    )

    db.add(template)
    print(f"✓ Created Facebook Ads Campaign template (ID: {template_id})")


def create_instagram_post_template(db):
    """Instagram Post workflow"""
    template_id = str(uuid.uuid4())

    nodes = [
        {
            "id": "start_1",
            "type": "start",
            "position": {"x": 100, "y": 100},
            "data": {"label": "Start"}
        },
        {
            "id": "generate_image",
            "type": "generate_image",
            "position": {"x": 300, "y": 100},
            "data": {
                "label": "Generate Instagram Image",
                "prompt": "{image_description}. Instagram-worthy, high quality, {style}. Professional photography look.",
                "model": "google/gemini-2.5-flash-image-preview",
                "aspect_ratio": "1:1",
                "quality": "standard",
                "title": "Instagram Post Image"
            }
        },
        {
            "id": "generate_caption",
            "type": "generate_copy",
            "position": {"x": 500, "y": 100},
            "data": {
                "label": "Generate Caption",
                "prompt": "Create an engaging Instagram caption for this post:\n\nTopic: {topic}\nBrand voice: {brand_voice}\nTarget audience: {target_audience}\n\nInclude:\n- Compelling hook\n- 3-5 relevant hashtags\n- Call to action\n\nKeep it authentic and conversational.",
                "model": "openai/gpt-4",
                "temperature": 0.8,
                "title": "Instagram Caption"
            }
        },
        {
            "id": "attach_image",
            "type": "attach",
            "position": {"x": 700, "y": 100},
            "data": {
                "label": "Attach Image to Post",
                "document_ref": "generate_caption",
                "image_ref": "generate_image",
                "is_primary": True
            }
        },
        {
            "id": "end_1",
            "type": "end",
            "position": {"x": 900, "y": 100},
            "data": {"label": "Complete"}
        }
    ]

    edges = [
        {"id": "e1", "source": "start_1", "target": "generate_image"},
        {"id": "e2", "source": "generate_image", "target": "generate_caption"},
        {"id": "e3", "source": "generate_caption", "target": "attach_image"},
        {"id": "e4", "source": "attach_image", "target": "end_1"}
    ]

    default_params = {
        "topic": "Your post topic",
        "image_description": "Description of the image to generate",
        "style": "vibrant, modern",
        "brand_voice": "friendly, professional",
        "target_audience": "Your target audience"
    }

    template = WorkflowTemplate(
        id=template_id,
        workspace_id=None,
        name="Instagram Post",
        description="Create complete Instagram post with AI-generated image and engaging caption. Perfect for social media marketing.",
        category="social_media",
        nodes_json=nodes,
        edges_json=edges,
        default_params_json=default_params,
        is_system=True,
        usage_count=0,
        created_by=None
    )

    db.add(template)
    print(f"✓ Created Instagram Post template (ID: {template_id})")


def create_blog_article_template(db):
    """Blog Article with Featured Image workflow"""
    template_id = str(uuid.uuid4())

    nodes = [
        {
            "id": "start_1",
            "type": "start",
            "position": {"x": 100, "y": 150},
            "data": {"label": "Start"}
        },
        {
            "id": "generate_outline",
            "type": "generate_copy",
            "position": {"x": 300, "y": 150},
            "data": {
                "label": "Generate Outline",
                "prompt": "Create a detailed blog post outline for: {blog_topic}\n\nTarget audience: {target_audience}\nTarget length: {target_length} words\nKeywords to include: {keywords}\n\nInclude:\n- Compelling title\n- Introduction hook\n- 4-6 main sections with subheadings\n- Conclusion with CTA",
                "model": "openai/gpt-4",
                "temperature": 0.7,
                "title": "Blog Outline"
            }
        },
        {
            "id": "generate_article",
            "type": "generate_copy",
            "position": {"x": 500, "y": 150},
            "data": {
                "label": "Write Article",
                "prompt": "Write a complete blog article based on this outline:\n\n{generate_outline}\n\nTopic: {blog_topic}\nTone: {tone}\nTarget audience: {target_audience}\n\nWrite engaging, SEO-optimized content. Use clear headings, short paragraphs, and include practical examples.",
                "model": "openai/gpt-4",
                "temperature": 0.7,
                "title": "Blog Article"
            }
        },
        {
            "id": "generate_featured_image",
            "type": "generate_image",
            "position": {"x": 500, "y": 50},
            "data": {
                "label": "Generate Featured Image",
                "prompt": "Professional blog header image for article about {blog_topic}. {image_style}. High quality, suitable for blog post.",
                "model": "google/gemini-2.5-flash-image-preview",
                "aspect_ratio": "16:9",
                "quality": "standard",
                "title": "Featured Image"
            }
        },
        {
            "id": "attach_image",
            "type": "attach",
            "position": {"x": 700, "y": 150},
            "data": {
                "label": "Attach Featured Image",
                "document_ref": "generate_article",
                "image_ref": "generate_featured_image",
                "is_primary": True
            }
        },
        {
            "id": "review_article",
            "type": "review",
            "position": {"x": 900, "y": 150},
            "data": {
                "label": "Review Quality",
                "content_ref": "generate_article",
                "criteria": "Review for:\n1. SEO optimization (keywords, headings)\n2. Readability and flow\n3. Factual accuracy\n4. Grammar and spelling\n5. CTA effectiveness\n\nProvide score and specific improvement suggestions.",
                "model": "openai/gpt-4"
            }
        },
        {
            "id": "end_1",
            "type": "end",
            "position": {"x": 1100, "y": 150},
            "data": {"label": "Complete"}
        }
    ]

    edges = [
        {"id": "e1", "source": "start_1", "target": "generate_outline"},
        {"id": "e2", "source": "generate_outline", "target": "generate_article"},
        {"id": "e3", "source": "generate_outline", "target": "generate_featured_image"},
        {"id": "e4", "source": "generate_article", "target": "attach_image"},
        {"id": "e5", "source": "generate_featured_image", "target": "attach_image"},
        {"id": "e6", "source": "attach_image", "target": "review_article"},
        {"id": "e7", "source": "review_article", "target": "end_1"}
    ]

    default_params = {
        "blog_topic": "Your blog topic",
        "target_audience": "Your target readers",
        "target_length": "1500",
        "keywords": "relevant, keywords, here",
        "tone": "professional, informative",
        "image_style": "modern, professional, clean"
    }

    template = WorkflowTemplate(
        id=template_id,
        workspace_id=None,
        name="Blog Article with Featured Image",
        description="Generate complete blog article with outline, content, featured image, and quality review. Perfect for content marketing.",
        category="blog",
        nodes_json=nodes,
        edges_json=edges,
        default_params_json=default_params,
        is_system=True,
        usage_count=0,
        created_by=None
    )

    db.add(template)
    print(f"✓ Created Blog Article template (ID: {template_id})")


def create_email_campaign_template(db):
    """Email Marketing Campaign workflow"""
    template_id = str(uuid.uuid4())

    nodes = [
        {
            "id": "start_1",
            "type": "start",
            "position": {"x": 100, "y": 150},
            "data": {"label": "Start"}
        },
        {
            "id": "generate_subject_lines",
            "type": "generate_copy",
            "position": {"x": 300, "y": 150},
            "data": {
                "label": "Generate Subject Lines (5 variations)",
                "prompt": "Generate 5 compelling email subject line variations for: {campaign_goal}\n\nTarget audience: {target_audience}\nTone: {tone}\n\nMake them attention-grabbing, personalized, and under 50 characters. Test different approaches (curiosity, urgency, value prop, personalization, question).",
                "model": "openai/gpt-5.1",
                "temperature": 0.9,
                "title": "Subject Lines"
            }
        },
        {
            "id": "generate_preview_text",
            "type": "generate_copy",
            "position": {"x": 500, "y": 100},
            "data": {
                "label": "Generate Preview Text",
                "prompt": "Create preview text for email about: {campaign_goal}\n\nBest subject line: {generate_subject_lines}\nTarget audience: {target_audience}\n\nWrite 1-2 sentences (under 100 chars) that complements the subject and entices opens.",
                "model": "openai/gpt-5.1",
                "temperature": 0.7,
                "title": "Preview Text"
            }
        },
        {
            "id": "generate_email_body",
            "type": "generate_copy",
            "position": {"x": 700, "y": 150},
            "data": {
                "label": "Generate Email Body",
                "prompt": "Write email body copy for: {campaign_goal}\n\nSubject: {generate_subject_lines}\nTarget audience: {target_audience}\nTone: {tone}\nKey points: {key_points}\n\nStructure: Hook → Value → CTA. Keep scannable, conversational, mobile-friendly. Include clear call-to-action.",
                "model": "openai/gpt-5.1",
                "temperature": 0.7,
                "title": "Email Body"
            }
        },
        {
            "id": "generate_header_image",
            "type": "generate_image",
            "position": {"x": 500, "y": 250},
            "data": {
                "label": "Generate Header Image",
                "prompt": "Email header image for {campaign_goal}. {visual_style}. Professional, eye-catching, brand-appropriate. Wide banner format.",
                "model": "google/gemini-3-pro-image-preview",
                "aspect_ratio": "16:9",
                "quality": "standard",
                "title": "Header Image"
            }
        },
        {
            "id": "attach_header",
            "type": "attach",
            "position": {"x": 900, "y": 150},
            "data": {
                "label": "Attach Header to Email",
                "document_ref": "generate_email_body",
                "image_ref": "generate_header_image",
                "is_primary": True
            }
        },
        {
            "id": "end_1",
            "type": "end",
            "position": {"x": 1100, "y": 150},
            "data": {"label": "Complete"}
        }
    ]

    edges = [
        {"id": "e1", "source": "start_1", "target": "generate_subject_lines"},
        {"id": "e2", "source": "generate_subject_lines", "target": "generate_preview_text"},
        {"id": "e3", "source": "generate_subject_lines", "target": "generate_email_body"},
        {"id": "e4", "source": "generate_preview_text", "target": "generate_email_body"},
        {"id": "e5", "source": "start_1", "target": "generate_header_image"},
        {"id": "e6", "source": "generate_email_body", "target": "attach_header"},
        {"id": "e7", "source": "generate_header_image", "target": "attach_header"},
        {"id": "e8", "source": "attach_header", "target": "end_1"}
    ]

    default_params = {
        "campaign_goal": "Your campaign objective",
        "target_audience": "Your target subscribers",
        "tone": "friendly, conversational",
        "key_points": "Main message points or benefits",
        "visual_style": "modern, vibrant, professional"
    }

    template = WorkflowTemplate(
        id=template_id,
        workspace_id=None,
        name="Email Marketing Campaign",
        description="Complete email campaign with A/B tested subject lines, preview text, engaging body copy, and header image. Optimized for deliverability and conversions.",
        category="email",
        nodes_json=nodes,
        edges_json=edges,
        default_params_json=default_params,
        is_system=True,
        usage_count=0,
        created_by=None
    )

    db.add(template)
    print(f"✓ Created Email Campaign template (ID: {template_id})")


def create_landing_page_hero_template(db):
    """Landing Page Hero Section workflow"""
    template_id = str(uuid.uuid4())

    nodes = [
        {
            "id": "start_1",
            "type": "start",
            "position": {"x": 100, "y": 200},
            "data": {"label": "Start"}
        },
        {
            "id": "generate_headline",
            "type": "generate_copy",
            "position": {"x": 300, "y": 150},
            "data": {
                "label": "Generate Headline",
                "prompt": "Create a powerful headline for landing page about: {product_service}\n\nTarget audience: {target_audience}\nMain benefit: {main_benefit}\n\nMake it compelling, benefit-focused, under 10 words. Test clarity over cleverness.",
                "model": "openai/gpt-5.1",
                "temperature": 0.8,
                "title": "Hero Headline"
            }
        },
        {
            "id": "generate_subheadline",
            "type": "generate_copy",
            "position": {"x": 500, "y": 150},
            "data": {
                "label": "Generate Subheadline",
                "prompt": "Write subheadline for: {product_service}\n\nHeadline: {generate_headline}\nTarget audience: {target_audience}\nKey features: {key_features}\n\nExpand on headline, add specificity, 1-2 sentences max.",
                "model": "openai/gpt-5.1",
                "temperature": 0.7,
                "title": "Subheadline"
            }
        },
        {
            "id": "generate_cta_copy",
            "type": "generate_copy",
            "position": {"x": 700, "y": 150},
            "data": {
                "label": "Generate CTA Copy",
                "prompt": "Create call-to-action button text for: {product_service}\n\nHeadline: {generate_headline}\nGoal: {conversion_goal}\n\nMake it action-oriented, specific, urgent. 2-4 words max.",
                "model": "openai/gpt-5.1",
                "temperature": 0.7,
                "title": "CTA Button"
            }
        },
        {
            "id": "generate_hero_image",
            "type": "generate_image",
            "position": {"x": 300, "y": 300},
            "data": {
                "label": "Generate Hero Image",
                "prompt": "Hero section background image for {product_service}. {visual_style}. Professional, high-quality, aspirational. Wide banner, leave space for text overlay.",
                "model": "google/gemini-3-pro-image-preview",
                "aspect_ratio": "16:9",
                "quality": "standard",
                "title": "Hero Background"
            }
        },
        {
            "id": "generate_product_image",
            "type": "generate_image",
            "position": {"x": 500, "y": 300},
            "data": {
                "label": "Generate Product/Feature Image",
                "prompt": "Product showcase image for {product_service}. {visual_style}. Clean, modern, show product in use or key feature. Transparent or white background.",
                "model": "google/gemini-3-pro-image-preview",
                "aspect_ratio": "1:1",
                "quality": "standard",
                "title": "Product Image"
            }
        },
        {
            "id": "combine_elements",
            "type": "attach",
            "position": {"x": 900, "y": 200},
            "data": {
                "label": "Combine Hero Elements",
                "document_ref": "generate_cta_copy",
                "image_ref": "generate_hero_image",
                "is_primary": True
            }
        },
        {
            "id": "end_1",
            "type": "end",
            "position": {"x": 1100, "y": 200},
            "data": {"label": "Complete"}
        }
    ]

    edges = [
        {"id": "e1", "source": "start_1", "target": "generate_headline"},
        {"id": "e2", "source": "generate_headline", "target": "generate_subheadline"},
        {"id": "e3", "source": "generate_subheadline", "target": "generate_cta_copy"},
        {"id": "e4", "source": "start_1", "target": "generate_hero_image"},
        {"id": "e5", "source": "start_1", "target": "generate_product_image"},
        {"id": "e6", "source": "generate_cta_copy", "target": "combine_elements"},
        {"id": "e7", "source": "generate_hero_image", "target": "combine_elements"},
        {"id": "e8", "source": "generate_product_image", "target": "combine_elements"},
        {"id": "e9", "source": "combine_elements", "target": "end_1"}
    ]

    default_params = {
        "product_service": "Your product or service name",
        "target_audience": "Your ideal customer",
        "main_benefit": "Primary value proposition",
        "key_features": "Top 2-3 features or benefits",
        "conversion_goal": "sign up, purchase, demo, etc.",
        "visual_style": "modern, professional, vibrant"
    }

    template = WorkflowTemplate(
        id=template_id,
        workspace_id=None,
        name="Landing Page Hero Section",
        description="Complete hero section with headline, subheadline, CTA, hero background, and product image. Conversion-optimized copy and visuals.",
        category="landing_page",
        nodes_json=nodes,
        edges_json=edges,
        default_params_json=default_params,
        is_system=True,
        usage_count=0,
        created_by=None
    )

    db.add(template)
    print(f"✓ Created Landing Page Hero template (ID: {template_id})")


def main():
    """Run the seed script"""
    print("\n🌱 Seeding workflow templates...\n")

    db = SessionLocal()
    try:
        # Check if system templates already exist
        existing = db.query(WorkflowTemplate).filter(
            WorkflowTemplate.is_system == True
        ).count()

        if existing > 0:
            print(f"⚠️  Found {existing} existing system templates. Skipping seed to avoid duplicates.")
            print("   To re-seed, delete existing system templates first.\n")
            return

        # Create templates
        create_facebook_ads_template(db)
        create_instagram_post_template(db)
        create_blog_article_template(db)
        create_email_campaign_template(db)
        create_landing_page_hero_template(db)

        # Commit all templates
        db.commit()

        print("\n✅ Successfully seeded 5 workflow templates!")
        print("   - Facebook Ads Campaign")
        print("   - Instagram Post")
        print("   - Blog Article with Featured Image")
        print("   - Email Marketing Campaign")
        print("   - Landing Page Hero Section\n")

    except Exception as e:
        print(f"\n❌ Error seeding templates: {str(e)}\n")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
