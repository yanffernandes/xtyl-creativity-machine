/**
 * Bulk Operation Job Entity
 * Tracks bulk campaign creation operations
 */

export type BulkOperationType =
  | "bulk_location"
  | "bulk_product"
  | "spreadsheet"
  | "duplicate";

export type BulkOperationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "partial";

export interface BulkOperationJob {
  id: string;
  user_id: string;

  // Job Type
  type: BulkOperationType;

  // Status
  status: BulkOperationStatus;

  // Configuration (varies by type)
  config:
    | BulkLocationConfig
    | BulkProductConfig
    | SpreadsheetConfig
    | DuplicateConfig;

  // Progress
  total_items: number;
  completed_items: number;
  failed_items: number;

  // Credits
  estimated_credits: number;
  consumed_credits: number;

  // Error tracking
  error_log: BulkErrorLogEntry[];

  // Timestamps
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface BulkErrorLogEntry {
  item_index: number;
  template_id?: string;
  error: string;
  code: string;
  timestamp?: string;
}

// Configuration interfaces
export interface BulkLocationConfig {
  connection_id: string;
  base_template: {
    campaign: {
      name: string;
      goal?: string; // Deprecated: goal is UI-only in Google Ads, not used in API
      budget: number;
      budget_type: "daily" | "total";
      bidding_strategy?: string;
      languages?: string[];
    };
    ad_group: {
      name: string;
      keywords: Array<{
        text: string;
        match_type: "BROAD" | "PHRASE" | "EXACT";
      }>;
      ads: Array<{
        headlines: string[];
        descriptions: string[];
        final_url: string;
        path1?: string;
        path2?: string;
      }>;
    };
    extensions?: {
      sitelinks?: Array<{
        text: string;
        url: string;
        description1?: string;
        description2?: string;
      }>;
      callouts?: string[];
    };
  };
  locations: Array<{
    code: string;
    name: string;
    custom_budget?: number;
    custom_keywords?: string[];
  }>;
  variations: {
    include_location_in_name: boolean;
    include_location_in_keywords: boolean;
    include_location_in_ads: boolean;
    name_template?: string;
    keyword_template?: string;
    headline_template?: string;
  };
}

export interface BulkProductConfig {
  connection_id: string;
  products: Array<{
    name: string;
    description?: string;
    url: string;
    price?: number;
    category?: string;
    image_url?: string;
  }>;
  ai_settings: {
    generate_keywords: boolean;
    generate_headlines: boolean;
    generate_descriptions: boolean;
    keywords_per_product: number;
    headlines_per_product: number;
    descriptions_per_product: number;
    keyword_match_types?: ("BROAD" | "PHRASE" | "EXACT")[];
    tone?: "professional" | "casual" | "urgent" | "friendly";
  };
  campaign_defaults: {
    goal?: string;
    budget: number;
    budget_type: "daily" | "total";
    bidding_strategy?: string;
    locations?: string[];
    languages?: string[];
  };
}

export interface SpreadsheetConfig {
  connection_id: string;
  file_name: string;
  file_url?: string;
  column_mapping: {
    campaign_name: string;
    budget?: string;
    keywords?: string;
    headlines?: string;
    descriptions?: string;
    final_url?: string;
    locations?: string;
    [key: string]: string | undefined;
  };
  defaults: {
    budget?: number;
    budget_type?: "daily" | "total";
    goal?: string;
    bidding_strategy?: string;
    locations?: string[];
    languages?: string[];
  };
}

export interface DuplicateConfig {
  connection_id: string;
  source_template_id: string;
  copies: number;
  variations: {
    append_suffix: boolean;
    suffix_template?: string;
    modify_budget?: {
      type: "fixed" | "percentage";
      value: number;
    };
  };
}

// DTOs for creating/updating jobs
export interface CreateBulkOperationJobDto {
  user_id: string;
  type: BulkOperationType;
  config:
    | BulkLocationConfig
    | BulkProductConfig
    | SpreadsheetConfig
    | DuplicateConfig;
  total_items: number;
  estimated_credits: number;
}

export interface UpdateBulkOperationJobDto {
  status?: BulkOperationStatus;
  completed_items?: number;
  failed_items?: number;
  consumed_credits?: number;
  error_log?: BulkErrorLogEntry[];
  started_at?: string;
  completed_at?: string;
}

// View type with calculated fields
export interface BulkJobWithProgress extends BulkOperationJob {
  progress_percentage: number;
  duration_seconds: number | null;
  pending_items: number;
  processing_items: number;
}
