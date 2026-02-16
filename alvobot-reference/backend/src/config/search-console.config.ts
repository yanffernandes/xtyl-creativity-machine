import { ConfigService } from "@nestjs/config";

export interface SearchConsoleConfig {
  indexingQuotaDaily: number;
  inspectionQuotaDaily: number;
}

export function getSearchConsoleConfig(
  configService: ConfigService,
): SearchConsoleConfig {
  const indexingQuotaDaily = Number(
    configService.get<string>("INDEXING_QUOTA_DAILY") || "200",
  );
  const inspectionQuotaDaily = Number(
    configService.get<string>("INSPECTION_QUOTA_DAILY") || "2000",
  );

  if (!Number.isFinite(indexingQuotaDaily) || indexingQuotaDaily <= 0) {
    throw new Error("INDEXING_QUOTA_DAILY must be a positive number");
  }

  if (!Number.isFinite(inspectionQuotaDaily) || inspectionQuotaDaily <= 0) {
    throw new Error("INSPECTION_QUOTA_DAILY must be a positive number");
  }

  return {
    indexingQuotaDaily,
    inspectionQuotaDaily,
  };
}
