import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { projects } from '../../database/drizzle/schema';

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
  constructor(@Inject(DATABASE) private readonly db: any) {}

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

    // 1. Add creative concept modifier if provided
    if (concept && concept.promptModifier) {
      enrichedPrompt = `${concept.promptModifier}. ${prompt}`;
    }

    // 2. Add brand context if project is provided
    if (projectId) {
      const brandContext = await this.getBrandContext(projectId);
      if (brandContext) {
        enrichedPrompt = `${enrichedPrompt}. ${brandContext}`;
      }
    }

    return enrichedPrompt;
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
