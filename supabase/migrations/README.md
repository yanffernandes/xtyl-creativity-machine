# Database Migrations

## Feature 019: Default System Templates

This migration seeds the database with professional marketing templates for AI assistants and workflows.

### Quick Start

```bash
cd backend
source venv/bin/activate
python migrations/seed_default_templates.py
```

### What It Does

- ✅ Seeds 51 AI assistant templates across 6 categories
- ✅ Seeds 18 workflow templates for multi-step campaigns
- ✅ Idempotent - safe to run multiple times
- ✅ Uses deterministic UUIDs for consistent IDs

### Template Categories

**AI Assistant Templates (51 total)**:
- `ads`: 15 templates (Google Ads, Facebook/Instagram, LinkedIn)
- `social_media`: 7 templates (Instagram, Facebook, LinkedIn, Twitter)
- `email`: 8 templates (Welcome sequences, nurture campaigns)
- `seo`: 7 templates (Blog posts, meta tags, SEO optimization)
- `landing_page`: 7 templates (Hero sections, CTAs, value propositions)
- `creative`: 7 templates (Brand stories, product descriptions)

**Workflow Templates (18 total)**:
- `paid_ads`: 3 workflows (Full ad campaigns with images)
- `social_media`: 3 workflows (Content calendars, product launches)
- `email`: 3 workflows (Welcome series, cart abandonment)
- `seo`: 3 workflows (Content hubs, topic clusters)
- `blog`: 3 workflows (Blog series generation)
- `creative`: 3 workflows (Multi-channel campaigns)

### Verification

After running the migration, verify templates were inserted:

```bash
# Check AI templates
SELECT category, COUNT(*)
FROM templates
WHERE is_system = true
GROUP BY category;

# Check workflow templates
SELECT category, COUNT(*)
FROM workflow_templates
WHERE is_system = true
GROUP BY category;
```

Expected output:
```
AI Templates:
  ads: 15
  social_media: 7
  email: 8
  seo: 7
  landing_page: 7
  creative: 7

Workflow Templates:
  paid_ads: 3
  social_media: 3
  email: 3
  seo: 3
  blog: 3
  creative: 3
```

### Idempotency

The migration is idempotent and safe to run multiple times. It will:
- ✅ Skip templates that already exist (same name + category)
- ✅ Only insert new templates
- ✅ Use deterministic UUIDs (same input = same UUID)

### Rollback

To remove all system templates:

```sql
DELETE FROM templates WHERE is_system = true;
DELETE FROM workflow_templates WHERE is_system = true;
```

### Expanding Templates

To add more templates, edit `/Users/yanfernandes/GitHub/xtyl-creativity-machine/backend/migrations/data/ai_templates.json`:

```json
[
  {
    "name": "Template Name",
    "description": "What it does",
    "category": "ads|social_media|email|seo|landing_page|creative",
    "icon": "📝",
    "prompt": "Full prompt with {{variables}}",
    "tags": ["tag1", "tag2", "tag3"]
  }
]
```

Then re-run the migration script.

### Files Structure

```
backend/migrations/
├── 019_seed_default_templates.sql   # SQL migration placeholder
├── seed_default_templates.py        # Main migration script
├── data/
│   ├── ai_templates.json            # AI template definitions
│   └── workflow_templates.json      # Workflow template definitions (TODO)
└── README.md                        # This file
```

### Development Status

- ✅ Phase 1: Infrastructure complete
- ✅ Phase 2: Idempotency tested and working
- 🚧 Phase 3: 15/51 AI templates added (ads category complete)
- ⏳ Phase 4: 0/18 workflow templates (pending)
- ⏳ Phase 5: Remaining AI template categories (social_media, email, seo, landing_page, creative)

### Next Steps

1. **Expand ai_templates.json** with remaining 36 templates
2. **Create workflow_templates.json** with 18 workflow definitions
3. **Update migration script** to load and insert workflows
4. **Test all templates** by generating sample content
5. **Deploy to staging** and verify user experience

### Related Documentation

- **Feature Spec**: `/specs/019-default-templates/spec.md`
- **Implementation Plan**: `/specs/019-default-templates/plan.md`
- **Quickstart Guide**: `/specs/019-default-templates/quickstart.md`
- **Research**: `/specs/019-default-templates/research.md`
- **Task List**: `/specs/019-default-templates/tasks.md`
