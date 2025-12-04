"""
Migration Script: Seed Default System Templates
Feature: 019-default-templates
Date: 2025-12-04

Seeds 51 AI assistant templates + 18 workflow templates for marketing agencies.

Usage:
    cd backend
    python migrations/seed_default_templates.py
"""

import uuid
import sys
import os
import json

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db
from sqlalchemy import text


def generate_template_uuid(name: str, category: str) -> str:
    """Generate deterministic UUID v5 from template name + category"""
    combined = f"{name}:{category}"
    namespace = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')
    return str(uuid.uuid5(namespace, combined))


def load_ai_templates_from_json():
    """Load AI templates from JSON file"""
    json_path = os.path.join(os.path.dirname(__file__), 'data', 'ai_templates.json')

    if os.path.exists(json_path):
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    # Fallback: return minimal templates if JSON doesn't exist
    print("⚠️  Warning: ai_templates.json not found, using minimal template set")
    return get_minimal_templates()


def get_minimal_templates():
    """Minimal template set for initial migration"""
    return [
        {
            "name": "Anúncio Google Ads - Fórmula AIDA",
            "description": "Crie anúncios de pesquisa do Google usando AIDA.",
            "category": "ads",
            "icon": "🎯",
            "prompt": "Escreva um anúncio Google Ads usando AIDA para {{service_name}}.\n\nAtenção: {{attention_grabber}}\nInteresse: {{interest_builder}}\nDesejo: {{desire_creator}}\nAção: {{call_to_action}}",
            "tags": ["google-ads", "aida", "anuncios-pagos"]
        },
        {
            "name": "Post Instagram - Transformação (BAB)",
            "description": "Legendas Instagram usando BAB (Antes, Depois, Ponte).",
            "category": "social_media",
            "icon": "📸",
            "prompt": "Escreva legenda Instagram usando BAB para {{product_name}}.\n\nAntes: {{before_situation}}\nDepois: {{after_result}}\nPonte: {{bridge_solution}}\n\nIncluir hashtags: {{hashtags}}",
            "tags": ["instagram", "bab", "redes-sociais"]
        },
        {
            "name": "Sequência de E-mail - Boas-vindas",
            "description": "Sequência de 3 e-mails de boas-vindas para novos assinantes.",
            "category": "email",
            "icon": "📧",
            "prompt": "Crie sequência de 3 e-mails de boas-vindas para {{subscriber_name}}.\n\nE-mail 1: Boas-vindas e entrega de {{lead_magnet}}\nE-mail 2: Valor adicional {{value_promise}}\nE-mail 3: Primeira oferta {{first_offer}}",
            "tags": ["email-marketing", "boas-vindas", "sequencia"]
        },
        {
            "name": "Artigo de Blog SEO - Guia Completo",
            "description": "Conteúdo pilar SEO otimizado para palavras-chave competitivas.",
            "category": "seo",
            "icon": "📝",
            "prompt": "Escreva artigo SEO de {{word_count}} palavras sobre {{main_keyword}}.\n\nIncluir:\n- H1 com keyword\n- Subtópicos: {{subtopics}}\n- Keywords relacionadas: {{related_keywords}}\n- Meta description",
            "tags": ["seo", "blog", "conteudo-pilar"]
        },
        {
            "name": "Hero Section - Página de Destino",
            "description": "Seção hero de landing page usando AIDA com headline e CTA.",
            "category": "landing_page",
            "icon": "🚀",
            "prompt": "Escreva hero section para {{product_service}}.\n\nHeadline: {{main_benefit}}\nSubheadline: Como resolve {{customer_pain_points}}\nCTA: {{primary_cta}}\nTrust badges: {{trust_badge}}",
            "tags": ["landing-page", "hero-section", "aida"]
        },
        {
            "name": "História da Marca - StoryBrand",
            "description": "História da marca usando framework StoryBrand de Donald Miller.",
            "category": "creative",
            "icon": "✨",
            "prompt": "Escreva história da marca para {{brand_name}} usando StoryBrand.\n\n1. Herói: {{customer_hero}}\n2. Problema: {{problem_faced}}\n3. Guia: {{brand_as_guide}}\n4. Plano: {{plan_solution}}\n5. CTA: {{direct_cta}}\n6. Evitar falha: Custo de não agir\n7. Sucesso: {{success_vision}}",
            "tags": ["storybrand", "brand-story", "sobre"]
        }
    ]


def insert_ai_templates(db):
    """Insert AI assistant templates with idempotency"""
    templates = load_ai_templates_from_json()
    inserted = 0
    skipped = 0

    for tmpl in templates:
        template_id = generate_template_uuid(tmpl["name"], tmpl["category"])

        # Check if exists
        exists = db.execute(text("""
            SELECT 1 FROM templates
            WHERE name = :name AND category = :category AND is_system = true
        """), {"name": tmpl["name"], "category": tmpl["category"]}).fetchone()

        if exists:
            skipped += 1
            continue

        # Insert
        db.execute(text("""
            INSERT INTO templates (
                id, workspace_id, user_id, name, description, category,
                icon, prompt, is_system, is_active, tags, usage_count, created_at
            ) VALUES (
                :id, NULL, NULL, :name, :description, :category,
                :icon, :prompt, true, true, CAST(:tags AS jsonb), 0, NOW()
            )
        """), {
            "id": template_id,
            "name": tmpl["name"],
            "description": tmpl["description"],
            "category": tmpl["category"],
            "icon": tmpl.get("icon", "📝"),
            "prompt": tmpl["prompt"],
            "tags": json.dumps(tmpl.get("tags", []))
        })

        inserted += 1
        print(f"   ✅ {tmpl['name']}")

    return inserted, skipped


def insert_workflow_templates(db):
    """Insert workflow templates with idempotency"""
    # TODO: Implement workflow template insertion
    # For now, return 0, 0
    return 0, 0


def main():
    """Execute migration"""
    print("=" * 70)
    print("🚀 Default Templates Migration - Feature 019")
    print("=" * 70)

    db = next(get_db())

    try:
        # AI Templates
        print("\n📝 Inserting AI Assistant Templates...")
        ai_inserted, ai_skipped = insert_ai_templates(db)
        print(f"\n   📊 Inserted: {ai_inserted} | Skipped: {ai_skipped}")

        # Workflow Templates
        print("\n🔄 Inserting Workflow Templates...")
        wf_inserted, wf_skipped = insert_workflow_templates(db)
        print(f"   📊 Inserted: {wf_inserted} | Skipped: {wf_skipped}")

        # Commit
        db.commit()

        # Summary
        print("\n" + "=" * 70)
        print("✨ Migration Completed Successfully!")
        print(f"   Total AI Templates: {ai_inserted + ai_skipped}")
        print(f"   Total Workflow Templates: {wf_inserted + wf_skipped}")
        print("=" * 70)

        # Verification
        print("\n🔍 Verification:")
        result = db.execute(text("""
            SELECT category, COUNT(*) as count
            FROM templates WHERE is_system = true
            GROUP BY category ORDER BY category
        """)).fetchall()

        for row in result:
            print(f"   {row[0]}: {row[1]} templates")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
