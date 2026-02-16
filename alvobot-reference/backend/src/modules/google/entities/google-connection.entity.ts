/**
 * Google Connection Entity
 * Uses the existing `connections` table with plataform_name = 'google'
 * This is NOT a separate table - it's a typed interface for Google connections
 */

// The existing connections table structure
export interface Connection {
  id: string;
  user_id: string;
  connection_name: string;
  plataform_name: "meta" | "google";
  platform_user_id: string | null;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  metadata: ConnectionMetadata;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  meta_app_id: string | null;
  // OAuth token management fields
  // @feature 20260202-oauth-token-management
  needs_reconnect?: boolean;
  last_refresh_error?: string | null;
  last_refresh_attempt?: string | null;
}

// Metadata specific to Google Ads connections
export interface GoogleConnectionMetadata {
  type: "ads" | "messages";
  user_name: string;
  user_email: string;
  user_picture?: string;
  scopes: string;
  // Google Ads specific fields (stored in metadata)
  customer_id?: string; // 10-digit Google Ads customer ID
  customer_name?: string; // Display name of the account
  login_customer_id?: string; // MCC manager account ID (if applicable)
  currency_code?: string; // Account currency (default: BRL)
  timezone?: string; // Account timezone (default: America/Sao_Paulo)
  account_type?: "standard" | "manager";
}

// Generic metadata type
export type ConnectionMetadata =
  | GoogleConnectionMetadata
  | Record<string, unknown>;

// Google Connection is just a Connection with specific filters
export interface GoogleConnection extends Omit<Connection, "metadata"> {
  plataform_name: "google";
  metadata: GoogleConnectionMetadata;
}

// Summary view for listing
export interface GoogleConnectionSummary {
  id: string;
  user_id: string;
  connection_name: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  // From metadata
  customer_id?: string;
  customer_name?: string;
  account_type?: "standard" | "manager";
  currency_code?: string;
  user_email: string;
}

// Google Ads Customer (from API response)
export interface GoogleCustomer {
  customer_id: string;
  name: string;
  currency: string;
  timezone: string;
  is_manager: boolean;
}

// Helper to check if a connection is Google
export function isGoogleConnection(
  connection: Connection,
): connection is GoogleConnection {
  return connection.plataform_name === "google";
}

// Helper to check if metadata has Google Ads info
export function hasGoogleAdsInfo(
  metadata: ConnectionMetadata,
): metadata is GoogleConnectionMetadata {
  return "type" in metadata && metadata.type === "ads";
}

// Helper to extract Google Ads customer info from connection
export function extractGoogleAdsInfo(connection: GoogleConnection): {
  customerId: string | undefined;
  customerName: string | undefined;
  accessToken: string;
  refreshToken: string | null;
  loginCustomerId: string | undefined;
} {
  return {
    customerId: connection.metadata.customer_id,
    customerName: connection.metadata.customer_name,
    accessToken: connection.access_token,
    refreshToken: connection.refresh_token,
    loginCustomerId: connection.metadata.login_customer_id,
  };
}
