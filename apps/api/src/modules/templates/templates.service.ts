import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, or, ilike, desc, count } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import { templates } from '../../database/drizzle/schema';

interface TemplateVariable {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

interface CreateTemplateDto {
  name: string;
  description?: string;
  category: string;
  icon?: string;
  prompt: string;
  variables?: TemplateVariable[];
  initialMessage?: string;
  expertName?: string;
  estimatedOutputs?: string;
  tags?: string[];
}

interface UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  prompt?: string;
  variables?: TemplateVariable[];
  initialMessage?: string;
  expertName?: string;
  estimatedOutputs?: string;
  tags?: string[];
}

@Injectable()
export class TemplatesService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  async listTemplates(options: {
    category?: string;
    search?: string;
    isFeatured?: boolean;
    includeSystem?: boolean;
    limit?: number;
    offset?: number;
    userId?: string;
  }) {
    const {
      category,
      search,
      isFeatured,
      includeSystem = true,
      limit = 50,
      offset = 0,
      userId,
    } = options;

    // Build WHERE conditions
    const conditions: any[] = [eq(templates.isActive, true)];

    // Filter: system templates OR user's own templates
    if (includeSystem) {
      if (userId) {
        conditions.push(
          or(eq(templates.isSystem, true), eq(templates.userId, userId)),
        );
      } else {
        conditions.push(eq(templates.isSystem, true));
      }
    } else if (userId) {
      conditions.push(eq(templates.userId, userId));
    }

    // Filter by category
    if (category) {
      conditions.push(eq(templates.category, category));
    }

    // Filter by featured
    if (isFeatured !== undefined) {
      conditions.push(eq(templates.isFeatured, isFeatured));
    }

    // Search by name/description
    if (search) {
      conditions.push(
        or(
          ilike(templates.name, `%${search}%`),
          ilike(templates.description, `%${search}%`),
        ),
      );
    }

    // Get total count
    const [countResult] = await this.db
      .select({ count: count() })
      .from(templates)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Get templates with ordering
    const results = await this.db
      .select()
      .from(templates)
      .where(and(...conditions))
      .orderBy(
        desc(templates.isFeatured),
        desc(templates.usageCount),
        templates.name,
      )
      .limit(limit)
      .offset(offset);

    return {
      templates: results,
      total,
    };
  }

  async listCategories(userId?: string) {
    const categories = [
      { id: 'trafego_pago', name: 'Trafego Pago', icon: 'target' },
      { id: 'social_media', name: 'Social Media', icon: 'smartphone' },
      { id: 'email', name: 'Email Marketing', icon: 'mail' },
      { id: 'copy', name: 'Copywriting', icon: 'pen-tool' },
      { id: 'seo', name: 'SEO & Blog', icon: 'file-text' },
      { id: 'criativo', name: 'Criativo', icon: 'palette' },
    ];

    // Get counts for each category
    for (const cat of categories) {
      const conditions = [
        eq(templates.isActive, true),
        eq(templates.category, cat.id),
      ];

      if (userId) {
        conditions.push(
          or(eq(templates.isSystem, true), eq(templates.userId, userId))!,
        );
      } else {
        conditions.push(eq(templates.isSystem, true));
      }

      const [result] = await this.db
        .select({ count: count() })
        .from(templates)
        .where(and(...conditions));

      (cat as any).count = result?.count ?? 0;
    }

    return { categories };
  }

  async listSystemTemplates(options: { limit?: number; offset?: number }) {
    const { limit = 50, offset = 0 } = options;

    const results = await this.db
      .select()
      .from(templates)
      .where(and(eq(templates.isActive, true), eq(templates.isSystem, true)))
      .orderBy(
        desc(templates.isFeatured),
        desc(templates.usageCount),
        templates.name,
      )
      .limit(limit)
      .offset(offset);

    return { templates: results };
  }

  async listFeaturedTemplates(options: { limit?: number; offset?: number }) {
    const { limit = 50, offset = 0 } = options;

    const results = await this.db
      .select()
      .from(templates)
      .where(
        and(eq(templates.isActive, true), eq(templates.isFeatured, true)),
      )
      .orderBy(desc(templates.usageCount), templates.name)
      .limit(limit)
      .offset(offset);

    return { templates: results };
  }

  async getTemplate(templateId: string, userId?: string) {
    const [template] = await this.db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check access: system templates are public, others need ownership
    if (!template.isSystem && template.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return template;
  }

  async createTemplate(dto: CreateTemplateDto, userId?: string) {
    const id = `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const [template] = await this.db
      .insert(templates)
      .values({
        id,
        userId,
        name: dto.name,
        description: dto.description,
        category: dto.category,
        icon: dto.icon,
        prompt: dto.prompt,
        variables: dto.variables ?? [],
        initialMessage: dto.initialMessage,
        expertName: dto.expertName,
        estimatedOutputs: dto.estimatedOutputs,
        tags: dto.tags ?? [],
        isSystem: false,
        isActive: true,
        isFeatured: false,
        usageCount: 0,
        createdAt: new Date(),
      })
      .returning();

    return template;
  }

  async updateTemplate(
    templateId: string,
    dto: UpdateTemplateDto,
    userId?: string,
  ) {
    const [template] = await this.db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.isSystem) {
      throw new ForbiddenException('Cannot modify system templates');
    }

    if (template.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = {
      ...dto,
      updatedAt: new Date(),
    };

    const [updated] = await this.db
      .update(templates)
      .set(updateData)
      .where(eq(templates.id, templateId))
      .returning();

    return updated;
  }

  async deleteTemplate(templateId: string, userId?: string) {
    const [template] = await this.db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (template.isSystem) {
      throw new ForbiddenException('Cannot delete system templates');
    }

    if (template.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.db.delete(templates).where(eq(templates.id, templateId));

    return { success: true, message: 'Template deleted' };
  }
}
