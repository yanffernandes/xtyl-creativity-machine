import { Injectable } from "@nestjs/common";
import { SearchConsoleRepository } from "./search-console.repository";

@Injectable()
export class SearchConsoleQuota {
  constructor(private readonly repo: SearchConsoleRepository) {}

  async getOrCreateDailyQuota(
    connectionId: string,
    date: string,
    defaults: {
      publishQuota: number;
      inspectionQuota: number;
    },
  ) {
    const existing = await this.repo.getQuotaUsage(connectionId, date);
    if (existing) return existing;

    return this.repo.createQuotaUsage(connectionId, date, {
      publish_quota_limit: defaults.publishQuota,
      inspection_quota_limit: defaults.inspectionQuota,
    });
  }

  async incrementPublish(connectionId: string, date: string, amount = 1) {
    return this.repo.incrementQuotaUsage(connectionId, date, {
      publish_quota_used: amount,
    });
  }

  async incrementInspection(connectionId: string, date: string, amount = 1) {
    return this.repo.incrementQuotaUsage(connectionId, date, {
      inspection_quota_used: amount,
    });
  }
}
