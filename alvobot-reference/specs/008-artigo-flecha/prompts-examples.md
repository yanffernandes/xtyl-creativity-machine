# Arrow Article Content Generation Prompts

## Base System Prompt

```
You are an expert content writer specializing in conversion-optimized blog articles. Your goal is to create engaging, SEO-friendly content that drives user actions while maintaining natural readability and providing genuine value.

Key principles:
- Write for humans first, search engines second
- Use the primary keyword naturally throughout the content
- Incorporate secondary keywords where relevant
- Structure content with clear headings and subheadings
- Include actionable insights and practical examples
- Place CTAs strategically without being overly promotional
- Match the specified tone and template structure
```

## Template-Specific Prompts

### Listicle Template

```
Create a {target_word_count}-word listicle article with the following specifications:

Title: {title}
Meta Description: {meta_description}
Primary Keyword: {primary_keyword}
Secondary Keywords: {secondary_keywords}

Structure Requirements:
- Engaging introduction (150-200 words) that establishes the value proposition
- Main list of {list_count} items (minimum 5, maximum 15)
- Each list item should include:
  * Clear, benefit-driven subheading
  * Detailed explanation (100-150 words)
  * Practical example or use case
  * Supporting data or statistics when relevant
- Conclusion (100-150 words) with key takeaways

SEO Requirements:
- Include primary keyword "{primary_keyword}" with {keyword_density_target}% density
- Naturally incorporate secondary keywords: {secondary_keywords}
- Use keyword in H1, first paragraph, and at least 2 H2 headings
- Include internal linking opportunities (mark with [INTERNAL-LINK: anchor text])

CTA Placement:
- Type: {cta_type}
- Position: {cta_position}
- Text: {cta_text}
{cta_position === 'middle' ? 'Place CTA after item ' + Math.floor(list_count/2) : ''}

Tone: Professional yet conversational, authoritative but accessible
Format: HTML with semantic tags (h2, h3, p, ul, ol, strong, em)
```

### How-To Guide Template

```
Create a comprehensive {target_word_count}-word how-to guide with the following specifications:

Title: {title}
Meta Description: {meta_description}
Primary Keyword: {primary_keyword}
Secondary Keywords: {secondary_keywords}

Structure Requirements:
- Introduction (200-250 words):
  * Hook: Common problem or pain point
  * What the reader will learn
  * Why this method works
  * Prerequisites or requirements

- Main Steps (5-10 detailed steps):
  * Each step should have:
    - Clear action-oriented heading (H2)
    - Detailed instructions (150-200 words)
    - Visual description (when applicable)
    - Pro tips or common mistakes to avoid
    - Expected outcome

- Additional Resources (optional):
  * Tools or materials needed
  * Related guides or further reading

- Conclusion (150-200 words):
  * Summary of key steps
  * Expected results
  * Next steps or advanced techniques

SEO Requirements:
- Include primary keyword "{primary_keyword}" in title, introduction, and conclusion
- Target density: {keyword_density_target}%
- Use secondary keywords naturally in step descriptions
- Include question-based subheadings (H3) for FAQ-style content

CTA Placement:
- Type: {cta_type}
- Position: {cta_position}
- Text: {cta_text}

Tone: Instructional yet encouraging, patient and detailed
Format: HTML with step numbers, clear headings, and formatted lists
```

### Product Review Template

```
Create an in-depth {target_word_count}-word product review with the following specifications:

Title: {title}
Meta Description: {meta_description}
Primary Keyword: {primary_keyword}
Secondary Keywords: {secondary_keywords}

Structure Requirements:
- Introduction (150-200 words):
  * Product overview
  * Who it's for
  * Key claim or unique selling point

- Quick Verdict (100 words):
  * Overall rating (5-star system)
  * Best for / Not ideal for
  * Price point positioning

- Detailed Analysis:
  * Features & Benefits (200-300 words)
  * Pros (150-200 words, bullet points with explanations)
  * Cons (100-150 words, honest limitations)
  * Performance & Testing (200-250 words)
  * Value for Money (100-150 words)

- Comparison:
  * How it compares to 2-3 alternatives
  * When to choose this over competitors

- Conclusion (150-200 words):
  * Final recommendation
  * Who should buy
  * Where to buy (include CTA)

SEO Requirements:
- Primary keyword "{primary_keyword}" in title, introduction, and conclusion
- Target density: {keyword_density_target}%
- Include "vs [competitor]" secondary keywords
- Use schema-friendly formatting for ratings and pricing

CTA Placement:
- Type: {cta_type}
- Position: {cta_position}
- Text: {cta_text}
- Additional CTA in "Where to Buy" section

Tone: Balanced and trustworthy, thorough but not overly technical
Format: HTML with tables for comparisons, formatted lists for pros/cons
```

### Comparison Template

```
Create a detailed {target_word_count}-word comparison article with the following specifications:

Title: {title}
Meta Description: {meta_description}
Primary Keyword: {primary_keyword}
Secondary Keywords: {secondary_keywords}

Structure Requirements:
- Introduction (200 words):
  * What's being compared and why
  * Who this comparison helps
  * Key decision criteria

- Quick Comparison Table:
  * Side-by-side feature matrix
  * Pricing comparison
  * Rating overview

- Detailed Breakdown by Criteria (5-7 criteria):
  Each criterion section should include:
  * Criterion heading (H2)
  * How Product/Option A performs (100-150 words)
  * How Product/Option B performs (100-150 words)
  * Winner for this criterion and why (50 words)

- Overall Verdict:
  * Best for [use case A]: Product A
  * Best for [use case B]: Product B
  * Our recommendation

- Decision Framework:
  * Questions to ask yourself
  * Final thoughts

SEO Requirements:
- Primary keyword "{primary_keyword}" includes "vs" or "comparison"
- Target density: {keyword_density_target}%
- Use entity-based keywords for products being compared
- Include question-based headers (H3)

CTA Placement:
- Type: {cta_type}
- Position: {cta_position}
- Text: {cta_text}
- Optional CTAs after each product section

Tone: Objective and analytical, helpful without bias
Format: HTML with comparison tables, clear visual hierarchy
```

### Ultimate Guide Template

```
Create a comprehensive {target_word_count}-word ultimate guide with the following specifications:

Title: {title}
Meta Description: {meta_description}
Primary Keyword: {primary_keyword}
Secondary Keywords: {secondary_keywords}

Structure Requirements:
- Introduction (300-400 words):
  * Scope of the guide
  * Who it's for (beginners, intermediate, advanced)
  * What readers will achieve
  * How to use this guide

- Table of Contents:
  * Clickable links to main sections
  * Estimated reading time per section

- Main Sections (5-8 major topics):
  Each section should include:
  * Section overview (100 words)
  * Subsections with detailed content (200-300 words each)
  * Key takeaways box
  * Practical examples or case studies
  * Common questions answered

- Supporting Elements:
  * Glossary of key terms
  * Checklist or action items
  * Resource list (tools, further reading)

- Conclusion (200-300 words):
  * Summary of main points
  * Implementation roadmap
  * Next steps

SEO Requirements:
- Primary keyword "{primary_keyword}" in title, introduction, and multiple H2s
- Target density: {keyword_density_target}%
- Comprehensive coverage of topic cluster
- Use semantic keywords and related entities
- Include jump links for better UX

CTA Placement:
- Type: {cta_type}
- Position: {cta_position}
- Text: {cta_text}
- Additional CTAs at section breaks (every 1000 words)

Tone: Authoritative and comprehensive, educational and empowering
Format: HTML with rich formatting (tables, callout boxes, lists, emphasis)
Length: Minimum 2000 words, maximum 5000 words
```

## CTA Integration Examples

### Button CTA
```html
<div class="cta-box" style="background: #f9fafb; border-left: 4px solid #fbbf24; padding: 20px; margin: 30px 0;">
  <h3 style="margin-top: 0;">Ready to Get Started?</h3>
  <p>{cta_description}</p>
  <a href="{cta_url}" class="cta-button" style="display: inline-block; background: #fbbf24; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
    {cta_text}
  </a>
</div>
```

### Form CTA
```html
<div class="cta-form" style="background: #f9fafb; border: 2px solid #fbbf24; padding: 30px; margin: 30px 0; border-radius: 8px;">
  <h3 style="margin-top: 0;">{cta_heading}</h3>
  <p>{cta_description}</p>
  <!-- Form integration placeholder -->
  <div class="form-placeholder">[FORM: {form_id}]</div>
</div>
```

### Inline Link CTA
```html
<p>
  ... and that's why {primary_keyword} is essential for your strategy.
  <a href="{cta_url}" style="color: #fbbf24; font-weight: 600; text-decoration: underline;">
    {cta_text}
  </a>
  to see how it can transform your results.
</p>
```

### Banner CTA
```html
<div class="cta-banner" style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000; padding: 40px; margin: 40px 0; border-radius: 8px; text-align: center;">
  <h2 style="margin: 0 0 15px 0; font-size: 28px;">{cta_heading}</h2>
  <p style="font-size: 18px; margin: 0 0 25px 0;">{cta_description}</p>
  <a href="{cta_url}" style="display: inline-block; background: #000; color: #fbbf24; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 18px;">
    {cta_text}
  </a>
</div>
```

## Keyword Integration Strategies

### High Density (2.0%+) - Informational Content
```
Placement:
- Title (1 time)
- H1 (1 time)
- First paragraph (1-2 times)
- H2 headings (2-3 times)
- Body paragraphs (every 100-150 words)
- Image alt text (1-2 times)
- Conclusion (1 time)
- Meta description (1 time)

Natural variations:
- Exact match: "{primary_keyword}"
- Plural: "{primary_keyword}s"
- Related: synonyms and semantic variations
```

### Medium Density (1.0-1.5%) - Balanced SEO + Readability
```
Placement:
- Title (1 time)
- First paragraph (1 time)
- H2 headings (1-2 times)
- Body paragraphs (every 200 words)
- Conclusion (1 time)
- Meta description (1 time)

Focus on semantic SEO:
- Use LSI keywords
- Answer related questions
- Cover topic comprehensively
```

### Low Density (0.5-1.0%) - User Experience Priority
```
Placement:
- Title (1 time)
- Introduction (1 time)
- One H2 heading
- Body (sparingly, only where natural)
- Conclusion (1 time)

Compensate with:
- Strong semantic relevance
- Comprehensive topic coverage
- High-quality external links
- Rich media (images, videos)
```

## Quality Checks (Post-Generation)

```typescript
interface QualityChecks {
  // SEO
  keywordDensity: number // Should match target ± 0.5%
  keywordInTitle: boolean // Must be true
  keywordInFirstParagraph: boolean // Must be true
  keywordInConclusion: boolean // Must be true
  metaDescriptionLength: number // 150-160 chars

  // Readability
  fleschReadingEase: number // 60-70 target (fairly easy)
  averageSentenceLength: number // 15-20 words
  paragraphLength: number // 3-5 sentences

  // Structure
  headingHierarchy: boolean // Proper H1 > H2 > H3
  listUsage: boolean // At least 2 lists
  wordCount: number // Within 10% of target

  // Conversion
  ctaPresent: boolean // Must be true
  ctaPlacement: string // Matches specified position
  internalLinks: number // 2-5 suggested

  // Content Quality
  uniqueIdeas: number // Manual review
  actionableInsights: number // Manual review
  dataPoints: number // At least 3 statistics/facts
}
```

## Example Generation Request (API Payload)

```json
{
  "arrow_article_id": "123e4567-e89b-12d3-a456-426614174000",
  "template_type": "listicle",
  "title": "10 Proven Strategies to Boost Your Email Marketing ROI",
  "meta_description": "Discover 10 data-backed strategies to increase email marketing ROI by up to 300%. Includes real examples, templates, and actionable tips.",
  "primary_keyword": "email marketing ROI",
  "secondary_keywords": [
    "email conversion rate",
    "email marketing metrics",
    "improve email performance",
    "email automation strategy"
  ],
  "keyword_density_target": 1.5,
  "target_word_count": 2000,
  "cta_config": {
    "type": "button",
    "text": "Start Your Free Email Campaign",
    "url": "https://example.com/signup",
    "position": "middle",
    "description": "Join 10,000+ marketers who've doubled their email ROI with our platform."
  },
  "advanced_options": {
    "tone": "professional",
    "perspective": "second-person",
    "include_sections": [
      "introduction",
      "list_items",
      "case_study",
      "conclusion"
    ]
  }
}
```

## Notes for Content Generator Service

- Always include HTML structure with semantic tags
- Generate alt text for suggested images (mark with `[IMAGE: description]`)
- Include internal link suggestions (mark with `[INTERNAL-LINK: anchor text]`)
- Add schema markup for articles, reviews, and how-tos
- Ensure mobile-friendly formatting (short paragraphs, bullet points)
- Include jump links for guides over 1500 words
- Add FAQ schema for question-based content
- Generate meta title (if not provided) optimized for CTR
- Include readability score in response metadata
- Flag if keyword density is outside acceptable range
