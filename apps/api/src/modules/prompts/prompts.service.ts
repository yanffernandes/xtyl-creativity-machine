import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { projects } from '../../database/drizzle/schema';

@Injectable()
export class PromptsService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async enrichPrompt(prompt: string, projectId: string, _userId: string) {
    // Validate project exists
    const project = await this.db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project || project.length === 0) {
      throw new NotFoundException('Project not found');
    }

    // Get brand context from project settings
    const projectData = project[0];
    const settings = projectData.settings || {};

    // Simple enrichment logic (can be enhanced with AI later)
    let enrichedPrompt = prompt;

    // Add brand colors if available
    if (settings.brandColors && Array.isArray(settings.brandColors)) {
      const colorsText = settings.brandColors.join(', ');
      enrichedPrompt += `. Use brand colors: ${colorsText}`;
    }

    // Add typography if available
    if (settings.typography) {
      enrichedPrompt += `. Typography style: ${JSON.stringify(settings.typography)}`;
    }

    // Add quality descriptors
    enrichedPrompt +=
      '. High resolution, professional, detailed, high quality composition';

    return {
      original_prompt: prompt,
      enriched_prompt: enrichedPrompt,
      brand_context_applied: !!(
        settings.brandColors || settings.typography
      ),
      model_used: 'simple-enrichment-v1',
    };
  }
}
