import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../common/supabase/supabase.service";

@Injectable()
export class SearchConsoleRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.getServiceRoleClient();
  }

  async getStatusByUrl(workspaceId: string, url: string) {
    const { data } = await this.client
      .from("search_console_indexing_status")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("url", url)
      .single();
    return data || null;
  }

  async upsertStatus(payload: Record<string, unknown>) {
    const { data, error } = await this.client
      .from("search_console_indexing_status")
      .upsert(payload, { onConflict: "url" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateStatusByUrl(
    workspaceId: string,
    url: string,
    payload: Record<string, unknown>,
  ) {
    const { data, error } = await this.client
      .from("search_console_indexing_status")
      .update(payload)
      .eq("workspace_id", workspaceId)
      .eq("url", url)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async insertStatus(payload: Record<string, unknown>) {
    const { data, error } = await this.client
      .from("search_console_indexing_status")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async createIndexingRequest(payload: Record<string, unknown>) {
    const { data, error } = await this.client
      .from("search_console_indexing_requests")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateIndexingRequest(id: string, payload: Record<string, unknown>) {
    const { data, error } = await this.client
      .from("search_console_indexing_requests")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async listQueuedRequests(connectionId: string, limit = 50) {
    const { data, error } = await this.client
      .from("search_console_indexing_requests")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("status", "queued")
      .order("requested_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async getQuotaUsage(connectionId: string, date: string) {
    const { data } = await this.client
      .from("search_console_quota_usage")
      .select("*")
      .eq("connection_id", connectionId)
      .eq("date", date)
      .single();
    return data || null;
  }

  async createQuotaUsage(
    connectionId: string,
    date: string,
    payload: Record<string, unknown>,
  ) {
    const { data, error } = await this.client
      .from("search_console_quota_usage")
      .insert({ connection_id: connectionId, date, ...payload })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async incrementQuotaUsage(
    connectionId: string,
    date: string,
    increments: { publish_quota_used?: number; inspection_quota_used?: number },
  ) {
    const existing = await this.getQuotaUsage(connectionId, date);
    if (!existing) return null;

    const payload: Record<string, unknown> = {};
    if (increments.publish_quota_used) {
      payload.publish_quota_used =
        (existing.publish_quota_used || 0) + increments.publish_quota_used;
    }
    if (increments.inspection_quota_used) {
      payload.inspection_quota_used =
        (existing.inspection_quota_used || 0) +
        increments.inspection_quota_used;
    }

    const { data, error } = await this.client
      .from("search_console_quota_usage")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async hasDuplicateRequest(connectionId: string, url: string, date: string) {
    const { data } = await this.client
      .from("search_console_indexing_requests")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("url", url)
      .gte("requested_at", `${date}T00:00:00Z`)
      .lte("requested_at", `${date}T23:59:59Z`)
      .limit(1);
    return (data || []).length > 0;
  }

  async listNonIndexedStatus(
    workspaceId: string,
    limit = 50,
    connectionId?: string,
  ) {
    let query = this.client
      .from("search_console_indexing_status")
      .select("*")
      .eq("workspace_id", workspaceId)
      .in("verdict", [
        "not_indexed",
        "fail",
        "verdict_unspecified",
        "unknown",
        "error",
      ])
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (connectionId) {
      query = query.eq("connection_id", connectionId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async listPendingReinspection(
    cutoffIso: string,
    limit = 200,
  ): Promise<any[]> {
    const { data, error } = await this.client
      .from("search_console_indexing_status")
      .select("*")
      .in("verdict", ["neutral", "pending"])
      .not("last_submitted_at", "is", null)
      .lt("last_submitted_at", cutoffIso)
      .order("last_submitted_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async listStaleForInspection(cutoffIso: string, limit = 200): Promise<any[]> {
    const { data, error } = await this.client
      .from("search_console_indexing_status")
      .select("*")
      .in("verdict", ["unknown", "not_indexed", "fail", "verdict_unspecified"])
      .or(`last_inspected_at.is.null,last_inspected_at.lt.${cutoffIso}`)
      .order("last_inspected_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  async updateConnectionMetadata(
    connectionId: string,
    metadata: Record<string, unknown>,
  ) {
    const { data, error } = await this.client
      .from("connections")
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq("id", connectionId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getConnection(connectionId: string) {
    const { data, error } = await this.client
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();
    if (error) throw error;
    return data;
  }

  async getPropertyById(propertyId: string) {
    const { data } = await this.client
      .from("search_console_properties")
      .select("*")
      .eq("id", propertyId)
      .single();
    return data || null;
  }

  async listPropertiesByConnection(connectionId: string) {
    const { data, error } = await this.client
      .from("search_console_properties")
      .select("site_url, is_active")
      .eq("connection_id", connectionId);
    if (error) throw error;
    return data || [];
  }

  async getArticleById(articleId: number) {
    const { data } = await this.client
      .from("articles")
      .select("id, project_id")
      .eq("id", articleId)
      .single();
    return data || null;
  }

  async upsertProperty(payload: Record<string, unknown>) {
    const { data, error } = await this.client
      .from("search_console_properties")
      .upsert(payload, { onConflict: "connection_id,site_url" })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
