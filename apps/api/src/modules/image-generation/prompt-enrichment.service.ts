import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { projects } from '../../database/drizzle/schema';
import { OpenRouterService } from '../../integrations/openrouter';

/**
 * Prompt Enrichment Service
 *
 * Enriches user prompts with brand context and creative concept modifiers.
 * Used to generate more consistent and on-brand images.
 *
 * Migration from: backend/services/prompt_enrichment_service.py
 */
@Injectable()
export class PromptEnrichmentService {
  /**
   * Global visual quality rules appended to every enriched prompt.
   * Rule 3 (CONTRAST) intentionally references strong contrast generically —
   * brand colors are already injected via the brand context section of the
   * prompt (see getBrandContext), so T013 is covered without duplication.
   */
  private static readonly GLOBAL_VISUAL_RULES = `

GLOBAL VISUAL QUALITY RULES:
1. HIGH QUALITY: Sharp details, professional photography or illustration quality, no artifacts.
2. TYPOGRAPHY: Any text in the image must be legible on mobile (min 48pt headlines, 28pt body). When in doubt, make text BIGGER.
3. CONTRAST: Text must contrast strongly against background. Dark text on light bg or vice versa.
4. HIERARCHY: One clear dominant element. Intentional foreground/midground/background separation.
5. NO CLUTTER: Maximum 3 focal elements. Use negative space purposefully.
6. STYLE UNITY: Single consistent aesthetic. No mixing photography with flat design.
7. AVOID: blurry edges, watermarks, text artifacts, oversaturation, unrealistic proportions.`;

  constructor(
    @Inject(DATABASE) private readonly db: any,
    private readonly openRouterService: OpenRouterService,
  ) {}

  /**
   * Enrich prompt with creative concept and brand context.
   *
   * @param prompt - User's original prompt
   * @param projectId - Project ID for brand context
   * @param concept - Creative concept object (optional)
   * @returns Enriched prompt string
   */
  async enrichPrompt(
    prompt: string,
    projectId?: string,
    concept?: any,
  ): Promise<string> {
    let enrichedPrompt = prompt;

    // 1. Add creative concept directive if provided
    if (concept) {
      const conceptDirective = this.buildConceptDirective(concept);
      enrichedPrompt = `${conceptDirective} ${prompt}`;
    }

    // 2. Add brand context if project is provided
    if (projectId) {
      const brandContext = await this.getBrandContext(projectId);
      if (brandContext) {
        enrichedPrompt = `${enrichedPrompt}. ${brandContext}`;
      }
    }

    // Always append global visual quality rules
    enrichedPrompt = `${enrichedPrompt}${PromptEnrichmentService.GLOBAL_VISUAL_RULES}`;

    return enrichedPrompt;
  }

  /**
   * Refine a raw assembled prompt through an LLM to produce coherent, high-quality prose.
   * Falls back to the original prompt if the LLM call fails.
   *
   * @param rawPrompt - The concatenated prompt with brand context, global rules, etc.
   * @param modelId - OpenRouter model ID to use for refinement
   * @returns Refined prompt string
   */
  async refineWithLLM(rawPrompt: string, modelId: string): Promise<string> {
    const systemPrompt = `You are an expert image generation prompt engineer. Your task is to take a raw assembled image generation brief and rewrite it as a single, fluent, highly descriptive paragraph optimized for AI image generation.

Rules:
- Preserve ALL brand colors, typography rules, visual requirements, and creative directives
- Combine fragmented instructions into natural, flowing prose
- Keep ALL technical quality directives (contrast, hierarchy, typography sizes, etc.)
- Preserve negative quality indicators (things to avoid) if present
- Output ONLY the refined prompt, no explanations, no preamble, no labels
- Maximum 400 words

STRICT — remove or do NOT introduce:
- Brand logo, wordmark, or brand mark instructions of any kind (logos are passed as reference images, not described in text)
- Target audience demographics, professions, or age groups
- Marketing objectives, business context, or platform descriptions`;

    try {
      const result = await this.openRouterService.chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawPrompt },
        ],
        modelId,
        { temperature: 0.3, maxTokens: 600 },
      );
      const refined = result.choices[0]?.message?.content;
      return refined && refined.trim() ? refined.trim() : rawPrompt;
    } catch (error) {
      console.error('LLM prompt refinement failed, using raw prompt:', error);
      return rawPrompt;
    }
  }

  /**
   * Get brand context for a project.
   * Extracts brand-related settings (colors, tone, industry) from project.settings.
   *
   * @param projectId - Project ID
   * @returns Brand context string or null
   */
  private async getBrandContext(projectId: string): Promise<string | null> {
    try {
      const project = await this.db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project || project.length === 0) {
        return null;
      }

      const settings = project[0].settings || {};
      const brandIdentity = (settings.brand_identity as any) || {};

      // Extract brand-related fields from correct schema paths
      const colorPalette: string[] = Array.isArray(brandIdentity.color_palette) ? brandIdentity.color_palette : [];
      const typography = brandIdentity.typography || {};
      const brandVoice: string = (settings.brand_voice_custom as string) || (settings.brand_voice as string) || '';
      const targetAudience: string = (settings.target_audience as string) || '';
      const clientName: string = (settings.client_name as string) || '';
      const description: string = (settings.description as string) || '';

      // Build context string
      const contextParts: string[] = [];

      if (clientName) {
        contextParts.push(`Brand: ${clientName}`);
      }

      if (colorPalette.length > 0) {
        contextParts.push(`Brand colors: ${colorPalette.join(', ')}`);
      }

      const fonts = [typography.primary, typography.secondary].filter(Boolean);
      if (fonts.length > 0) {
        contextParts.push(`Typography: ${fonts.join(', ')}`);
      }

      if (brandVoice) {
        contextParts.push(`Visual style: ${brandVoice}`);
      }

      if (targetAudience) {
        contextParts.push(`Target audience: ${targetAudience}`);
      }

      if (description) {
        contextParts.push(`Brand context: ${description}`);
      }

      if (contextParts.length === 0) {
        return null;
      }

      return contextParts.join('. ');
    } catch (error) {
      console.error('Failed to get brand context:', error);
      return null;
    }
  }

  /**
   * Build a structured concept directive from a creative concept object.
   * Extracts fields from `prompt_template_json` (composition, requirements,
   * visual_description) as explicit directives. Falls back to plain
   * `promptModifier` / `prompt_modifier` when JSON data is not available.
   *
   * @param concept - Creative concept object (any shape, snake_case or camelCase)
   * @returns Formatted directive string
   */
  private buildConceptDirective(concept: any): string {
    const parts: string[] = [];

    if (concept.name) {
      parts.push(`Concept: "${concept.name}".`);
    }

    const json = (concept.prompt_template_json ?? concept.promptTemplateJson) as Record<string, unknown> | null;

    if (json?.composition) {
      const c = json.composition as Record<string, unknown>;
      const compParts = [
        c.layout && `layout: ${c.layout}`,
        c.style && `style: ${c.style}`,
        c.main_element && `main element: ${c.main_element}`,
      ].filter(Boolean);
      if (compParts.length) parts.push(`Composition (${compParts.join(', ')}).`);
    }

    if (Array.isArray(json?.requirements) && (json.requirements as string[]).length > 0) {
      parts.push(`Visual requirements: ${(json.requirements as string[]).join(', ')}.`);
    }

    if (json?.visual_description) {
      parts.push(`Visual reference: ${json.visual_description}.`);
    }

    // Fallback to plain modifier if no JSON data was found
    if (parts.length <= 1 && (concept.promptModifier || concept.prompt_modifier)) {
      return `${concept.promptModifier ?? concept.prompt_modifier}.`;
    }

    if (concept.promptModifier || concept.prompt_modifier) {
      parts.push(`Style: ${concept.promptModifier ?? concept.prompt_modifier}.`);
    }

    return parts.join(' ');
  }

  /**
   * Build a prompt addition describing how visual context assets should be applied.
   *
   * @param assets - Array of assets with their mode and metadata
   * @returns Prompt addition string, or empty string if no assets
   */
  buildVisualContextAddition(
    assets: Array<{
      title?: string | null;
      assetCategory?: string | null;
      aiDescription?: string | null;
      assetTags?: string[] | null;
      mode: 'style' | 'compose' | 'base';
    }>,
  ): string {
    if (!assets.length) return '';

    const parts: string[] = [];

    const baseAssets = assets.filter((a) => a.mode === 'base');
    const composeAssets = assets.filter((a) => a.mode === 'compose');
    const styleAssets = assets.filter((a) => a.mode === 'style');

    if (baseAssets.length > 0) {
      parts.push('Build upon and refine the provided base image(s) as the starting point');
    }

    for (const asset of composeAssets) {
      const label = asset.title || 'element';
      const category = asset.assetCategory ? ` (${asset.assetCategory})` : '';
      const desc = asset.aiDescription ? `: ${asset.aiDescription}` : '';
      parts.push(
        `Include the provided ${label}${category} exactly as shown in the reference image${desc}`,
      );
    }

    for (const asset of styleAssets) {
      const label = asset.title || 'reference';
      const desc = asset.aiDescription ? `. Description: ${asset.aiDescription}` : '';
      const tags =
        asset.assetTags?.length ? `. Style tags: ${asset.assetTags.join(', ')}` : '';
      parts.push(`Use the visual style and aesthetic of the provided ${label}${desc}${tags}`);
    }

    return parts.join('. ');
  }

  /**
   * Resolve template variables in creative concept prompt_template.
   *
   * @param template - Template string with {{variable}} placeholders
   * @param variables - Variable values map
   * @returns Resolved template string or null if any variable is missing
   */
  resolveTemplate(template: string, variables: Record<string, string>): string | null {
    let resolved = template;
    let allResolved = true;

    // Replace all {{variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
      if (!value) {
        allResolved = false;
        break;
      }
      resolved = resolved.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    if (!allResolved) {
      return null; // Return null if any variable is missing
    }

    return resolved;
  }

  /**
   * Build variable map from project settings.
   *
   * @param project - Project object
   * @returns Variable map for template resolution
   */
  buildVariableMap(project: any): Record<string, string> {
    const settings = project.settings || {};

    return {
      project_name: project.name || '',
      client_name: settings.client_name || '',
      description: settings.description || project.description || '',
      target_audience: settings.target_audience || '',
      brand_voice: settings.brand_voice || '',
    };
  }
}
