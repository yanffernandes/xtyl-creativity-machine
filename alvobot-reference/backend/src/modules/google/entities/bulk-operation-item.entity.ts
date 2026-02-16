/**
 * Bulk Operation Item Entity
 * Individual items within a bulk operation job
 */

export type BulkItemStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export interface BulkOperationItem {
  id: string;
  job_id: string;
  template_id: string | null;

  // Item identification
  item_index: number;
  item_name: string | null;

  // Status
  status: BulkItemStatus;

  // Input data (varies by job type)
  input_data:
    | BulkLocationInputData
    | BulkProductInputData
    | SpreadsheetInputData
    | DuplicateInputData;

  // Output (Google Ads IDs after publishing)
  google_campaign_id: string | null;
  google_ad_group_id: string | null;
  google_ad_id: string | null;

  // Error handling
  error_message: string | null;
  error_code: string | null;
  retry_count: number;

  // Credits
  credits_cost: number;

  // Timestamps
  created_at: string;
  processed_at: string | null;
}

// Input data types
export interface BulkLocationInputData {
  location_code: string;
  location_name: string;
  custom_budget?: number;
  custom_keywords?: string[];
}

export interface BulkProductInputData {
  product_name: string;
  product_description?: string;
  product_url: string;
  product_price?: number;
  product_category?: string;
  generated_keywords?: string[];
  generated_headlines?: string[];
  generated_descriptions?: string[];
}

export interface SpreadsheetInputData {
  row_number: number;
  row_data: Record<string, string | number | boolean | null>;
}

export interface DuplicateInputData {
  copy_number: number;
  source_name?: string;
}

// DTOs
export interface CreateBulkOperationItemDto {
  job_id: string;
  item_index: number;
  item_name?: string;
  input_data:
    | BulkLocationInputData
    | BulkProductInputData
    | SpreadsheetInputData
    | DuplicateInputData;
  credits_cost?: number;
}

export interface UpdateBulkOperationItemDto {
  template_id?: string;
  status?: BulkItemStatus;
  google_campaign_id?: string;
  google_ad_group_id?: string;
  google_ad_id?: string;
  error_message?: string | null;
  error_code?: string | null;
  retry_count?: number;
  processed_at?: string;
}

// Batch update for efficiency
export interface BatchUpdateItemsDto {
  items: Array<{
    id: string;
    update: UpdateBulkOperationItemDto;
  }>;
}

// Item with job details
export interface BulkItemWithJob extends BulkOperationItem {
  job: {
    type: string;
    status: string;
    user_id: string;
  };
}
