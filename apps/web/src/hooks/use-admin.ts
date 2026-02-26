'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface AIModelConfig {
  defaults: Record<string, string>;
  fallbacks: Record<string, string>;
  visible_models: string[];  // Deprecated - use visible_text_models/visible_image_models
  visible_text_models: string[];
  visible_image_models: string[];
}

export interface AIModelConfigUpdate {
  defaults?: Record<string, string>;
  fallbacks?: Record<string, string>;
  visible_models?: string[];  // Deprecated - use visible_text_models/visible_image_models
  visible_text_models?: string[];
  visible_image_models?: string[];
}

export interface AvailableModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing_prompt?: string;
  pricing_completion?: string;
  top_provider?: string;
  output_modalities?: string[];
}

export interface ModelValidationResult {
  valid: boolean;
  model_id: string;
  model_name?: string;
  message: string;
}

// Model types available in the system
export const MODEL_TYPES = [
  { key: 'chat', label: 'Chat / Assistant', description: 'Default model for conversations' },
  { key: 'embedding', label: 'Embeddings', description: 'Model for generating text embeddings (RAG)' },
  { key: 'vision', label: 'Vision', description: 'Model for analyzing images' },
  { key: 'document', label: 'Document Analysis', description: 'Model for analyzing documents and files' },
  { key: 'image_generation', label: 'Image Generation', description: 'Model for generating images' },
  { key: 'image_naming', label: 'Image Naming', description: 'Model for auto-generating image titles' },
  { key: 'prompt_enrichment', label: 'Prompt Enrichment', description: 'Model for enriching image prompts with brand context' },
] as const;

// =============================================================================
// useAdminModels Hook
// =============================================================================

export function useAdminModels() {
  const [config, setConfig] = useState<AIModelConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current configuration
  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<AIModelConfig>('/admin/models/config');
      setConfig(response.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load model configuration';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch available models from OpenRouter
  const fetchAvailableModels = useCallback(async () => {
    try {
      setIsLoadingModels(true);
      const response = await api.get<AvailableModel[]>('/admin/models/available');
      setAvailableModels(response.data);
    } catch (err: unknown) {
      console.error('Failed to load available models:', err);
      // Don't set error - this is not critical
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback(async (update: AIModelConfigUpdate) => {
    try {
      setIsSaving(true);
      setError(null);
      const response = await api.put<AIModelConfig>('/admin/models/config', update);
      setConfig(response.data);
      return { success: true, data: response.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update configuration';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Validate a model ID
  const validateModel = useCallback(async (modelId: string): Promise<ModelValidationResult> => {
    try {
      const response = await api.post<ModelValidationResult>('/admin/models/validate', {
        model_id: modelId,
      });
      return response.data;
    } catch (err: unknown) {
      return {
        valid: false,
        model_id: modelId,
        message: err instanceof Error ? err.message : 'Validation failed',
      };
    }
  }, []);

  // Update a single default model
  const updateDefaultModel = useCallback(
    async (modelType: string, modelId: string) => {
      return updateConfig({
        defaults: { [modelType]: modelId },
      });
    },
    [updateConfig]
  );

  // Update a single fallback model
  const updateFallbackModel = useCallback(
    async (modelType: string, modelId: string) => {
      return updateConfig({
        fallbacks: { [modelType]: modelId },
      });
    },
    [updateConfig]
  );

  // Update visible models list (deprecated)
  const updateVisibleModels = useCallback(
    async (modelIds: string[]) => {
      return updateConfig({
        visible_models: modelIds,
      });
    },
    [updateConfig]
  );

  // Update visible text models list
  const updateVisibleTextModels = useCallback(
    async (modelIds: string[]) => {
      return updateConfig({
        visible_text_models: modelIds,
      });
    },
    [updateConfig]
  );

  // Update visible image models list
  const updateVisibleImageModels = useCallback(
    async (modelIds: string[]) => {
      return updateConfig({
        visible_image_models: modelIds,
      });
    },
    [updateConfig]
  );

  // Initial fetch
  useEffect(() => {
    fetchConfig();
    fetchAvailableModels();
  }, [fetchConfig, fetchAvailableModels]);

  return {
    // State
    config,
    availableModels,
    isLoading,
    isLoadingModels,
    isSaving,
    error,

    // Actions
    fetchConfig,
    fetchAvailableModels,
    updateConfig,
    validateModel,
    updateDefaultModel,
    updateFallbackModel,
    updateVisibleModels,
    updateVisibleTextModels,
    updateVisibleImageModels,
  };
}

// =============================================================================
// User Types (Phase 4)
// =============================================================================

export interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  is_super_admin: boolean;
  is_blocked: boolean;
  created_at?: string;
  last_login?: string;
}

export interface AdminUserDetails extends AdminUser {
  blocked_at?: string;
  blocked_by?: string;
  stats: {
    workspace_count: number;
    owned_workspace_count: number;
    conversation_count: number;
    document_count: number;
  };
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

// =============================================================================
// useAdminUsers Hook (Phase 4)
// =============================================================================

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch users with pagination and filters
  const fetchUsers = useCallback(
    async (options?: {
      skip?: number;
      limit?: number;
      search?: string;
      is_blocked?: boolean;
      is_super_admin?: boolean;
    }) => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (options?.skip !== undefined) params.set('skip', String(options.skip));
        if (options?.limit !== undefined) params.set('limit', String(options.limit));
        if (options?.search) params.set('search', options.search);
        if (options?.is_blocked !== undefined) params.set('is_blocked', String(options.is_blocked));
        if (options?.is_super_admin !== undefined) params.set('is_super_admin', String(options.is_super_admin));

        const response = await api.get<AdminUserListResponse>(`/admin/users?${params.toString()}`);
        setUsers(response.data.items);
        setTotal(response.data.total);
        setPage(response.data.page);
        return response.data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load users';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Get user details
  const getUserDetails = useCallback(async (userId: string): Promise<AdminUserDetails | null> => {
    try {
      const response = await api.get<AdminUserDetails>(`/admin/users/${userId}`);
      return response.data;
    } catch (err: unknown) {
      console.error('Failed to get user details:', err);
      return null;
    }
  }, []);

  // Block user
  const blockUser = useCallback(
    async (userId: string) => {
      try {
        setIsActioning(true);
        await api.post(`/admin/users/${userId}/block`);
        // Refresh user list
        await fetchUsers();
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to block user';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsActioning(false);
      }
    },
    [fetchUsers]
  );

  // Unblock user
  const unblockUser = useCallback(
    async (userId: string) => {
      try {
        setIsActioning(true);
        await api.post(`/admin/users/${userId}/unblock`);
        // Refresh user list
        await fetchUsers();
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to unblock user';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsActioning(false);
      }
    },
    [fetchUsers]
  );

  // Promote to admin
  const promoteUser = useCallback(
    async (userId: string) => {
      try {
        setIsActioning(true);
        await api.post(`/admin/users/${userId}/promote`);
        // Refresh user list
        await fetchUsers();
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to promote user';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsActioning(false);
      }
    },
    [fetchUsers]
  );

  // Demote from admin
  const demoteUser = useCallback(
    async (userId: string) => {
      try {
        setIsActioning(true);
        await api.post(`/admin/users/${userId}/demote`);
        // Refresh user list
        await fetchUsers();
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to demote user';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsActioning(false);
      }
    },
    [fetchUsers]
  );

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    // State
    users,
    total,
    page,
    isLoading,
    isActioning,
    error,

    // Actions
    fetchUsers,
    getUserDetails,
    blockUser,
    unblockUser,
    promoteUser,
    demoteUser,
  };
}

// =============================================================================
// Workspace Types (Phase 5)
// =============================================================================

export interface AdminWorkspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  owner_email?: string;
  owner_name?: string;
  member_count: number;
  project_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceMember {
  user_id: string;
  email: string;
  full_name?: string;
  role: string;
  joined_at?: string;
}

export interface AdminWorkspaceDetails extends AdminWorkspace {
  members: WorkspaceMember[];
  stats: {
    document_count: number;
    conversation_count: number;
    storage_used_bytes: number;
  };
}

export interface AdminWorkspaceListResponse {
  items: AdminWorkspace[];
  total: number;
  page: number;
  limit: number;
}

// =============================================================================
// useAdminWorkspaces Hook (Phase 5)
// =============================================================================

export function useAdminWorkspaces() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspaces with pagination and filters
  const fetchWorkspaces = useCallback(
    async (options?: {
      skip?: number;
      limit?: number;
      search?: string;
      owner_id?: string;
    }) => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (options?.skip !== undefined) params.set('skip', String(options.skip));
        if (options?.limit !== undefined) params.set('limit', String(options.limit));
        if (options?.search) params.set('search', options.search);
        if (options?.owner_id) params.set('owner_id', options.owner_id);

        const response = await api.get<AdminWorkspaceListResponse>(`/admin/workspaces?${params.toString()}`);
        setWorkspaces(response.data.items);
        setTotal(response.data.total);
        setPage(response.data.page);
        return response.data;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load workspaces';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Get workspace details
  const getWorkspaceDetails = useCallback(async (workspaceId: string): Promise<AdminWorkspaceDetails | null> => {
    try {
      const response = await api.get<AdminWorkspaceDetails>(`/admin/workspaces/${workspaceId}`);
      return response.data;
    } catch (err: unknown) {
      console.error('Failed to get workspace details:', err);
      return null;
    }
  }, []);

  // Remove member from workspace
  const removeMember = useCallback(
    async (workspaceId: string, userId: string) => {
      try {
        setIsActioning(true);
        await api.delete(`/admin/workspaces/${workspaceId}/members/${userId}`);
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove member';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsActioning(false);
      }
    },
    []
  );

  // Transfer workspace ownership
  const transferOwnership = useCallback(
    async (workspaceId: string, newOwnerId: string) => {
      try {
        setIsActioning(true);
        await api.post(`/admin/workspaces/${workspaceId}/transfer`, { new_owner_id: newOwnerId });
        // Refresh workspace list
        await fetchWorkspaces();
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to transfer ownership';
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsActioning(false);
      }
    },
    [fetchWorkspaces]
  );

  // Initial fetch
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return {
    // State
    workspaces,
    total,
    page,
    isLoading,
    isActioning,
    error,

    // Actions
    fetchWorkspaces,
    getWorkspaceDetails,
    removeMember,
    transferOwnership,
  };
}

// =============================================================================
// Dashboard Types (Phase 6)
// =============================================================================

export interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    new: number;
  };
  workspaces: {
    total: number;
    active: number;
  };
  conversations: {
    total: number;
    in_period: number;
  };
  documents: {
    total: number;
    in_period: number;
  };
  period_days: number;
}

export interface ActivityDataPoint {
  date: string;
  count: number;
}

export interface ActivityTrends {
  users: ActivityDataPoint[];
  conversations: ActivityDataPoint[];
  documents: ActivityDataPoint[];
  period_days: number;
}

export interface RecentUser {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
}

export interface RecentConversation {
  id: string;
  title?: string;
  user_id?: string;
  created_at?: string;
}

export interface RecentDocument {
  id: string;
  title?: string;
  type?: string;
  created_at?: string;
}

export interface RecentActivity {
  users: RecentUser[];
  conversations: RecentConversation[];
  documents: RecentDocument[];
}

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  created_at?: string;
}

export interface AuditLogsResponse {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

// =============================================================================
// useAdminDashboard Hook (Phase 6)
// =============================================================================

export function useAdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activity, setActivity] = useState<ActivityTrends | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard metrics
  const fetchMetrics = useCallback(async (periodDays: number = 30) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<DashboardMetrics>(
        `/admin/dashboard/metrics?period_days=${periodDays}`
      );
      setMetrics(response.data);
      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load metrics';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch activity trends
  const fetchActivityTrends = useCallback(async (periodDays: number = 30) => {
    try {
      const response = await api.get<ActivityTrends>(
        `/admin/dashboard/activity?period_days=${periodDays}`
      );
      setActivity(response.data);
      return response.data;
    } catch (err: unknown) {
      console.error('Failed to load activity trends:', err);
      return null;
    }
  }, []);

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async (limit: number = 10) => {
    try {
      const response = await api.get<RecentActivity>(
        `/admin/dashboard/recent-activity?limit=${limit}`
      );
      setRecentActivity(response.data);
      return response.data;
    } catch (err: unknown) {
      console.error('Failed to load recent activity:', err);
      return null;
    }
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(
    async (options?: {
      skip?: number;
      limit?: number;
      action?: string;
      admin_id?: string;
    }) => {
      try {
        const params = new URLSearchParams();
        if (options?.skip !== undefined) params.set('skip', String(options.skip));
        if (options?.limit !== undefined) params.set('limit', String(options.limit));
        if (options?.action) params.set('action', options.action);
        if (options?.admin_id) params.set('admin_id', options.admin_id);

        const response = await api.get<AuditLogsResponse>(`/admin/audit?${params.toString()}`);
        setAuditLogs(response.data.items);
        setAuditTotal(response.data.total);
        return response.data;
      } catch (err: unknown) {
        console.error('Failed to load audit logs:', err);
        return null;
      }
    },
    []
  );

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(
    async (periodDays: number = 30) => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchMetrics(periodDays),
          fetchActivityTrends(periodDays),
          fetchRecentActivity(),
        ]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchMetrics, fetchActivityTrends, fetchRecentActivity]
  );

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    // State
    metrics,
    activity,
    recentActivity,
    auditLogs,
    auditTotal,
    isLoading,
    error,

    // Actions
    fetchMetrics,
    fetchActivityTrends,
    fetchRecentActivity,
    fetchAuditLogs,
    fetchDashboardData,
  };
}

// =============================================================================
// Settings Types (Phase 7)
// =============================================================================

export interface LimitSettings {
  max_workspaces_per_user: number;
  max_members_per_workspace: number;
  max_projects_per_workspace: number;
  max_documents_per_project: number;
  max_file_size_mb: number;
}

export interface FeatureSettings {
  enable_image_generation: boolean;
  enable_document_analysis: boolean;
  enable_rag: boolean;
  enable_workflows: boolean;
  enable_public_sharing: boolean;
}

export interface ApiSettings {
  rate_limit_per_minute: number;
  max_tokens_per_request: number;
}

export interface SystemSettings {
  limits: LimitSettings;
  features: FeatureSettings;
  api: ApiSettings;
}

// =============================================================================
// useAdminSettings Hook (Phase 7)
// =============================================================================

export function useAdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all settings
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<SystemSettings>('/admin/settings');
      setSettings(response.data);
      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update all settings
  const updateSettings = useCallback(async (update: Partial<SystemSettings>) => {
    try {
      setIsSaving(true);
      setError(null);
      const response = await api.put<SystemSettings>('/admin/settings', update);
      setSettings(response.data);
      return { success: true, data: response.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update settings';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update limit settings
  const updateLimits = useCallback(async (limits: Partial<LimitSettings>) => {
    try {
      setIsSaving(true);
      setError(null);
      const response = await api.put<LimitSettings>('/admin/settings/limits', limits);
      setSettings((prev) =>
        prev ? { ...prev, limits: response.data } : null
      );
      return { success: true, data: response.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update limits';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Update feature flags
  const updateFeatures = useCallback(async (features: Partial<FeatureSettings>) => {
    try {
      setIsSaving(true);
      setError(null);
      const response = await api.put<FeatureSettings>('/admin/settings/features', features);
      setSettings((prev) =>
        prev ? { ...prev, features: response.data } : null
      );
      return { success: true, data: response.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update features';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    // State
    settings,
    isLoading,
    isSaving,
    error,

    // Actions
    fetchSettings,
    updateSettings,
    updateLimits,
    updateFeatures,
  };
}

// =============================================================================
// Memory Configuration Types (Feature 024)
// =============================================================================

export interface MemoryStatistics {
  total_memories: number;
  unique_users: number;
  unique_projects: number;
  avg_memories_per_user: number;
  by_category: Record<string, number>;
}

export interface MemoryConfig {
  extraction_model: string;
  system_enabled: boolean;
  max_memories_per_project: number;
  statistics: MemoryStatistics;
}

export interface MemoryConfigUpdate {
  extraction_model?: string;
  system_enabled?: boolean;
  max_memories_per_project?: number;
}

// =============================================================================
// useAdminMemoryConfig Hook (Feature 024)
// =============================================================================

export function useAdminMemoryConfig() {
  const [config, setConfig] = useState<MemoryConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch memory config
  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<MemoryConfig>('/admin/config/memory');
      setConfig(response.data);
      return response.data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load memory configuration';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update memory config
  const updateConfig = useCallback(async (update: MemoryConfigUpdate) => {
    try {
      setIsSaving(true);
      setError(null);
      const response = await api.put<MemoryConfig>('/admin/config/memory', update);
      setConfig(response.data);
      return { success: true, data: response.data };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update memory configuration';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Toggle memory system
  const toggleMemorySystem = useCallback(
    async (enabled: boolean) => {
      return updateConfig({ system_enabled: enabled });
    },
    [updateConfig]
  );

  // Update extraction model
  const updateExtractionModel = useCallback(
    async (model: string) => {
      return updateConfig({ extraction_model: model });
    },
    [updateConfig]
  );

  // Update max memories
  const updateMaxMemories = useCallback(
    async (max: number) => {
      return updateConfig({ max_memories_per_project: max });
    },
    [updateConfig]
  );

  // Initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    // State
    config,
    isLoading,
    isSaving,
    error,

    // Actions
    fetchConfig,
    updateConfig,
    toggleMemorySystem,
    updateExtractionModel,
    updateMaxMemories,
  };
}
