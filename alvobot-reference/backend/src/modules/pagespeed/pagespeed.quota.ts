import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PageSpeedRepository } from "./pagespeed.repository";

@Injectable()
export class PageSpeedQuota {
  constructor(
    private readonly repo: PageSpeedRepository,
    private readonly configService: ConfigService,
  ) {}

  private getDailyLimit(): number {
    // With API key: ~25,000/day; without: ~400/day safe
    const hasApiKey = !!this.configService.get<string>("PAGESPEED_API_KEY");
    return hasApiKey ? 5000 : 400;
  }

  async checkAndIncrement(workspaceId: string, date: string): Promise<boolean> {
    const limit = this.getDailyLimit();
    const usage = await this.repo.getQuotaUsage(workspaceId, date);

    if (usage && usage.requests_count >= limit) {
      return false;
    }

    const newCount = (usage?.requests_count || 0) + 1;
    await this.repo.upsertQuotaUsage(workspaceId, date, newCount, limit);
    return true;
  }

  async getUsage(workspaceId: string, date: string) {
    return this.repo.getQuotaUsage(workspaceId, date);
  }

  async getRemainingQuota(workspaceId: string, date: string): Promise<number> {
    const limit = this.getDailyLimit();
    const usage = await this.repo.getQuotaUsage(workspaceId, date);
    const used = usage?.requests_count || 0;
    return Math.max(0, limit - used);
  }
}
