import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { DATABASE } from '../../database/database.module';
import {
  campaignPackages,
  projects,
  workspaceUsers,
} from '../../database/drizzle/schema';

@Injectable()
export class CampaignsService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project || project.length === 0) {
      throw new NotFoundException('Project not found');
    }

    const projectData = project[0];

    // Verify user has access to this project's workspace
    const membership = await this.db
      .select()
      .from(workspaceUsers)
      .where(
        and(
          eq(workspaceUsers.workspaceId, projectData.workspaceId),
          eq(workspaceUsers.userId, userId),
        ),
      )
      .limit(1);

    if (!membership || membership.length === 0) {
      throw new ForbiddenException('Access denied to this project');
    }

    return projectData;
  }

  async listCampaigns(userId: string, projectId: string, channel?: string) {
    await this.verifyProjectAccess(userId, projectId);

    const conditions = [eq(campaignPackages.projectId, projectId)];

    if (channel) {
      conditions.push(eq(campaignPackages.channel, channel));
    }

    const campaigns = await this.db
      .select()
      .from(campaignPackages)
      .where(and(...conditions))
      .orderBy(desc(campaignPackages.createdAt));

    return {
      items: campaigns,
      total: campaigns.length,
    };
  }

  async createCampaign(
    userId: string,
    projectId: string,
    dto: { name: string; channel?: string; metadata?: Record<string, any> },
  ) {
    await this.verifyProjectAccess(userId, projectId);

    // Validate input
    if (dto.name.length > 255) {
      throw new BadRequestException('Name must be 255 characters or less');
    }
    if (dto.channel && dto.channel.length > 100) {
      throw new BadRequestException('Channel must be 100 characters or less');
    }

    const result = await this.db
      .insert(campaignPackages)
      .values({
        projectId,
        name: dto.name,
        channel: dto.channel,
        campaignMetadata: dto.metadata || {},
      })
      .returning();

    return result[0];
  }

  async getCampaign(userId: string, projectId: string, campaignId: string) {
    await this.verifyProjectAccess(userId, projectId);

    const campaign = await this.db
      .select()
      .from(campaignPackages)
      .where(
        and(
          eq(campaignPackages.id, campaignId),
          eq(campaignPackages.projectId, projectId),
        ),
      )
      .limit(1);

    if (!campaign || campaign.length === 0) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign[0];
  }

  async updateCampaign(
    userId: string,
    projectId: string,
    campaignId: string,
    dto: { name?: string; channel?: string; metadata?: Record<string, any> },
  ) {
    await this.verifyProjectAccess(userId, projectId);

    // Check if campaign exists
    const existing = await this.db
      .select()
      .from(campaignPackages)
      .where(
        and(
          eq(campaignPackages.id, campaignId),
          eq(campaignPackages.projectId, projectId),
        ),
      )
      .limit(1);

    if (!existing || existing.length === 0) {
      throw new NotFoundException('Campaign not found');
    }

    // Validate input
    if (dto.name && dto.name.length > 255) {
      throw new BadRequestException('Name must be 255 characters or less');
    }
    if (dto.channel && dto.channel.length > 100) {
      throw new BadRequestException('Channel must be 100 characters or less');
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.channel !== undefined) updateData.channel = dto.channel;
    if (dto.metadata !== undefined)
      updateData.campaignMetadata = dto.metadata;

    const result = await this.db
      .update(campaignPackages)
      .set(updateData)
      .where(
        and(
          eq(campaignPackages.id, campaignId),
          eq(campaignPackages.projectId, projectId),
        ),
      )
      .returning();

    return result[0];
  }

  async deleteCampaign(userId: string, projectId: string, campaignId: string) {
    await this.verifyProjectAccess(userId, projectId);

    const result = await this.db
      .delete(campaignPackages)
      .where(
        and(
          eq(campaignPackages.id, campaignId),
          eq(campaignPackages.projectId, projectId),
        ),
      );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundException('Campaign not found');
    }
  }
}
