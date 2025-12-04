# Feature Specification: Default System Templates Migration

**Feature Branch**: `019-default-templates`
**Created**: 2025-12-04
**Status**: Draft
**Input**: User description: "Agora eu quero criar uma migration com os templates que vao aparecer para todos os usuarios. Tanto templates de workflows como os templates que podem ser utilizados no assistente de IA. Utilize nomes de especialistas, melhores tecnicas do mercado. Pense em templates que vao ajudar ao maximo agencias de marketing, assesoria de trafego pago... especialistas em marketing digital. Pense em todas as categorias que existem atualmente na aba templates e templates de workflow."

## Clarifications

### Session 2025-12-04

- Q: Who will create the actual template content (prompts and workflow definitions)? → A: Developer creates all templates based on research and marketing frameworks
- Q: How should the migration detect duplicate templates to ensure idempotency (FR-018)? → A: Check name + category combination

## User Scenarios & Testing

### User Story 1 - Marketing Agency Discovers Pre-built Templates (Priority: P1)

A marketing agency team member opens the platform for the first time and immediately finds professional, ready-to-use templates that match their common use cases (paid ads campaigns, social media content, email sequences). They can select a template and start producing content within minutes without having to create prompts from scratch.

**Why this priority**: This is the first user experience and directly impacts time-to-value. Users should immediately see the platform's capabilities and value proposition through high-quality templates.

**Independent Test**: Can be fully tested by creating a new account, navigating to the templates section, and verifying that all default templates are visible and usable. Delivers immediate value by reducing time to first content generation from 30 minutes to under 2 minutes.

**Acceptance Scenarios**:

1. **Given** a new user logs into the platform, **When** they navigate to the Templates section, **Then** they see 30+ professionally crafted templates organized by category
2. **Given** a user is viewing templates, **When** they filter by "Paid Ads" category, **Then** they see templates specifically designed for Google Ads, Meta Ads, LinkedIn Ads campaigns
3. **Given** a user selects a template, **When** they read the description, **Then** they see the expert technique and use case explained clearly
4. **Given** a user applies a template in the AI assistant, **When** they provide minimal input variables, **Then** the system generates professional marketing content following industry best practices

---

### User Story 2 - Traffic Manager Uses Workflow Templates (Priority: P1)

A paid traffic specialist needs to create multiple ad variations quickly. They access the workflow templates section and find pre-built automation workflows (e.g., "Complete Ad Campaign Generator") that take a single brief and produce headlines, descriptions, images, and landing page copy in one execution.

**Why this priority**: Workflow automation is a key differentiator and provides exponential value. This enables users to scale content production dramatically.

**Independent Test**: Can be tested by navigating to the Workflows section, selecting a system workflow template, providing input variables, executing the workflow, and verifying all expected outputs are generated. Delivers value by reducing manual work from 2 hours to 10 minutes per campaign.

**Acceptance Scenarios**:

1. **Given** a user navigates to workspace workflows, **When** they click "Browse Templates", **Then** they see 15+ pre-built workflow automation templates
2. **Given** a user views a workflow template (e.g., "Social Media Content Calendar"), **When** they click "Use Template", **Then** the workflow is copied to their project with all nodes and connections intact
3. **Given** a user executes a workflow template, **When** they provide required inputs, **Then** the workflow generates multiple interconnected content pieces (text + images)
4. **Given** a workflow template includes best practices, **When** a user inspects the nodes, **Then** they see pre-configured prompts using proven frameworks (AIDA, PAS, BAB)

---

### User Story 3 - SEO Specialist Leverages Content Templates (Priority: P2)

An SEO content strategist needs to produce blog posts optimized for search engines. They find templates specifically designed for SEO content (keyword-rich articles, meta descriptions, featured snippets) created by SEO experts using current best practices.

**Why this priority**: SEO is a critical use case for digital marketing agencies and requires specialized knowledge. Templates encode expert techniques that non-experts can leverage.

**Independent Test**: Can be tested by selecting an SEO template, providing a target keyword and topic, and verifying the output follows SEO best practices (keyword density, structure, readability). Delivers value by enabling non-SEO experts to produce optimized content.

**Acceptance Scenarios**:

1. **Given** a user filters templates by "SEO & Blog" category, **When** they review available templates, **Then** they see templates for blog posts, meta descriptions, title tags, and structured data
2. **Given** a user uses an SEO blog post template, **When** they provide a target keyword, **Then** the generated content naturally incorporates the keyword with appropriate density
3. **Given** a user generates content from an SEO template, **When** they review the output, **Then** the content follows a clear structure (H1, H2, H3 hierarchy) optimized for featured snippets

---

### User Story 4 - Email Marketer Finds Conversion-Optimized Templates (Priority: P2)

An email marketing specialist needs to create email sequences for different customer journey stages (welcome, nurture, conversion, retention). They discover templates based on proven email marketing frameworks (AIDA, PAS, storytelling) created by conversion copywriting experts.

**Why this priority**: Email marketing is high-ROI and requires specific copywriting techniques. Templates provide frameworks that significantly improve conversion rates.

**Independent Test**: Can be tested by selecting email templates for different funnel stages, generating content, and verifying each follows appropriate conversion frameworks. Delivers value by improving email performance and reducing creation time.

**Acceptance Scenarios**:

1. **Given** a user filters by "Email Marketing" category, **When** they browse templates, **Then** they see templates for different email types (welcome, abandoned cart, product launch, newsletter)
2. **Given** a user selects a conversion-focused email template, **When** they review the prompt structure, **Then** they see it uses a proven framework (e.g., AIDA: Attention, Interest, Desire, Action)
3. **Given** a user generates an email from template, **When** they review the output, **Then** the email includes a clear CTA, benefit-focused copy, and urgency elements

---

### User Story 5 - Creative Director Uses Visual Asset Workflows (Priority: P3)

A creative director needs to produce consistent visual content (social media graphics, ad creatives) that matches brand guidelines. They use workflow templates that combine text generation + image generation to create complete campaigns with visual consistency.

**Why this priority**: While important, visual workflows are an enhancement to text-based templates. The core value is in the prompts; visual integration amplifies it.

**Independent Test**: Can be tested by executing a workflow that includes both text and image generation nodes, and verifying the outputs are cohesive. Delivers value by maintaining brand consistency across text and visual assets.

**Acceptance Scenarios**:

1. **Given** a user selects a "Complete Social Campaign" workflow template, **When** they execute it, **Then** the workflow generates both copy and matching image prompts
2. **Given** a workflow includes image generation nodes, **When** the workflow completes, **Then** generated images reflect the tone and message of the generated text
3. **Given** a user wants to maintain brand consistency, **When** they use creative workflow templates, **Then** all visual outputs follow a cohesive style defined in the workflow configuration

---

### Edge Cases

- What happens when a template uses a model that is no longer available or has been deprecated?
- How does the system handle templates when new categories are added in the future?
- What happens if a workflow template references node types that have been removed or changed?
- How are templates updated when prompt engineering best practices evolve?
- What happens if a user tries to modify a system template (should it create a copy)?
- How does the system handle versioning if templates need to be updated after users have already used them?

## Requirements

### Functional Requirements

#### AI Assistant Templates (Prompt Templates)

- **FR-001**: System MUST create 30-40 default AI assistant templates covering all existing categories (ads, landing_page, email, social_media, seo, creative)
- **FR-002**: Each template MUST include name, description, category, icon/emoji, complete prompt text, and relevant tags
- **FR-003**: All templates MUST be marked as `is_system=true` and `workspace_id=null` to make them globally available
- **FR-004**: Templates MUST use expert-level prompt engineering techniques and proven marketing frameworks (AIDA, PAS, BAB, StoryBrand, etc.)
- **FR-005**: Each template MUST clearly indicate in the description what specific use case it serves and what expertise it encodes

#### Workflow Templates

- **FR-006**: System MUST create 15-20 default workflow templates covering categories (social_media, paid_ads, blog, email, seo, creative)
- **FR-007**: Each workflow template MUST include name, description, category, complete nodes_json (workflow graph), edges_json (connections), and be marked as `is_system=true`
- **FR-008**: Workflow templates MUST use all available node types meaningfully (text_generation, image_generation, processing, conditional, loop where appropriate)
- **FR-009**: Each workflow node MUST have pre-configured prompts that demonstrate best practices for that workflow stage
- **FR-010**: Workflow templates MUST be marked as `is_recommended=true` for featured/popular templates that demonstrate platform capabilities

#### Content Quality Standards

- **FR-011**: All template prompts MUST be written in Portuguese (Brazilian) to match the platform's primary language
- **FR-012**: Template names MUST reference specific marketing techniques or frameworks (e.g., "Anúncio Google Ads - Fórmula AIDA", "Post Instagram - Storytelling Emocional")
- **FR-013**: Template descriptions MUST explain the marketing context, ideal use case, and expected output format
- **FR-014**: Templates MUST incorporate variable placeholders (e.g., {{product_name}}, {{target_audience}}) where dynamic content is needed
- **FR-015**: Each category MUST have at least 5 templates to provide meaningful variety

#### Migration Implementation

- **FR-016**: System MUST provide a database migration script that seeds both `templates` and `workflow_templates` tables
- **FR-017**: Migration MUST be idempotent (can run multiple times without creating duplicates)
- **FR-018**: Migration MUST check for existing system templates by name AND category combination before inserting to avoid duplicates (allows same name in different categories)
- **FR-019**: Migration MUST generate UUIDs for template IDs consistently (use deterministic UUID generation based on template name + category)
- **FR-020**: Migration MUST set appropriate timestamps (`created_at`) and default values (`usage_count=0`, `is_active=true`)

### Key Entities

- **AI Template**: System-wide prompt template with category, prompt text, description, icon, tags, and usage tracking. Marked as `is_system=true` with `workspace_id=null`.

- **Workflow Template**: System-wide workflow automation template containing nodes (workflow steps), edges (connections), category, description. Marked as `is_system=true` with `workspace_id=null` and `is_recommended` flag for featured templates.

- **Template Category**: Logical grouping of templates by marketing function. AI templates use: ads, landing_page, email, social_media, seo, creative. Workflow templates use: social_media, paid_ads, blog, email, seo, creative.

## Success Criteria

### Measurable Outcomes

- **SC-001**: New users can find and use their first template within 2 minutes of account creation (reduces time-to-first-content from 30 minutes to 2 minutes)
- **SC-002**: All 6 template categories contain at least 5 high-quality templates each for both AI assistant and workflows (minimum 30 AI templates + 15 workflow templates)
- **SC-003**: Template usage rate reaches 80% (at least 8 out of 10 new users use a template within their first session)
- **SC-004**: Users successfully generate content from templates on the first attempt 90% of the time (well-structured prompts with clear variable placeholders)
- **SC-005**: Workflow templates successfully execute end-to-end without errors 95% of the time (all nodes are properly configured)
- **SC-006**: Average time to create a complete marketing campaign (text + images) reduces from 2 hours to under 15 minutes using workflow templates
- **SC-007**: Templates demonstrate at least 5 different marketing frameworks/techniques (AIDA, PAS, BAB, StoryBrand, Problem-Agitate-Solve, etc.)
- **SC-008**: Zero duplicate system templates after migration runs multiple times (idempotent migration)

## Scope & Boundaries

### In Scope

- Database migration script to seed system templates
- AI assistant prompt templates (30-40 templates across 6 categories)
- Workflow automation templates (15-20 workflows across 6 categories)
- Template content in Portuguese (Brazilian)
- Professional marketing frameworks and expert techniques
- Variable placeholders for dynamic content
- Category organization matching existing UI filters
- Idempotent migration with duplicate prevention

### Out of Scope

- UI changes to template display (existing UI already supports system templates)
- Template versioning system (future enhancement)
- Template marketplace or user-contributed templates
- Multi-language support for templates (Portuguese only in this feature)
- Template analytics dashboard (tracking is in place but reporting is separate)
- Template editing interface for system templates
- AI-powered template recommendations
- Custom template categories (using existing 6 categories)
- Template search/filtering improvements (existing filters work)
- Template preview functionality (existing UI handles this)

## Assumptions

- Existing `templates` and `workflow_templates` database tables have all required columns (`is_system`, `workspace_id`, `category`, etc.)
- The frontend already filters and displays system templates correctly (verified in existing code)
- Users understand Portuguese (Brazilian) as the platform's primary language
- Marketing agencies and traffic managers are the primary target audience
- Current node types (text_generation, image_generation, processing, conditional, loop) are sufficient for workflow templates
- Template usage is tracked via `usage_count` column which increments on each use
- Database supports JSONB for workflow nodes/edges storage
- Migration will run during deployment before users access the new version

## Dependencies

- PostgreSQL database with existing schema for `templates` and `workflow_templates` tables
- Supabase integration for data storage and retrieval
- Existing frontend template browsing and filtering components
- Backend API endpoints for template retrieval (already implemented)
- UUID generation function for template IDs
- Database migration system (Alembic or equivalent)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Template prompts produce low-quality content | High - Users lose trust in platform | Test all templates manually before migration, use proven frameworks, include clear examples |
| Migration creates duplicate templates | Medium - Database bloat, user confusion | Implement idempotent migration with name-based uniqueness checks |
| Workflow templates fail during execution | High - Poor user experience, low adoption | Test each workflow end-to-end, validate all node configurations, use simple reliable patterns |
| Templates don't match user needs | High - Low template adoption, wasted development | Research actual agency use cases, base templates on proven marketing strategies, gather user feedback post-launch |
| Portuguese translation is poor quality | Medium - Reduced usability for target market | Have native Brazilian Portuguese speaker review all template content |
| Templates become outdated as marketing best practices evolve | Medium - Declining template quality over time | Document template update process, plan for v2 migration with updated content in 6 months |

## Notes

This feature focuses purely on seeding high-quality default content. The infrastructure (database, UI, API) already exists to support system templates. The value is in the content quality and coverage of real-world marketing use cases.

**Content Creation**: Developer will create all template content (prompts and workflow definitions) based on extensive research of proven marketing copywriting frameworks (AIDA, PAS, BAB, StoryBrand, etc.) and best practices from digital marketing agencies. Each template should be tested to ensure it generates valuable, professional-grade content before inclusion in the migration.

**Duplicate Prevention**: The migration will check for existing templates using the combination of (name + category), allowing templates with the same name to exist in different categories while preventing true duplicates. UUID generation will be deterministic based on name + category to ensure consistency across migration runs.

The migration should be run as part of the deployment process to ensure all new and existing users have access to these templates immediately.
