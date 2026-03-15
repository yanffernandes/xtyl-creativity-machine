import axios from 'axios';
import { supabase } from '@/lib/supabase';

// ============================================================================
// Axios Client
// ============================================================================

/**
 * Axios API Client for the Admin Dashboard.
 *
 * Configured with:
 * - Base URL from VITE_API_URL environment variable
 * - Auth interceptor that injects Supabase session Bearer token
 * - Response error handler with automatic session refresh on 401
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Supabase access token
api.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 with session refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet, attempt session refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const {
          data: { session },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError || !session) {
          console.error('Session refresh failed, redirecting to login');
          await supabase.auth.signOut();
          window.location.href = '/';
          return Promise.reject(error);
        }

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Failed to refresh session:', refreshError);
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// ============================================================================
// Interfaces: Dashboard
// ============================================================================

export interface DashboardStats {
  users: {
    total: number;
    period: number;
  };
  workspaces: {
    total: number;
  };
  documents: {
    total: number;
    period: number;
  };
  conversations: {
    total: number;
    period: number;
  };
  aiUsage: {
    totalCost: number;
    totalTokens: number;
  };
  periodDays: number;
}

export interface ActivityTrend {
  date: string;
  conversations: number;
  documents: number;
  imageGenerations: number;
}

export interface RecentActivity {
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
  }>;
  conversations: Array<{
    id: string;
    title: string;
    userId: string;
    userEmail: string;
    createdAt: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    type: string;
    userId: string;
    userEmail: string;
    createdAt: string;
  }>;
}

// ============================================================================
// Interfaces: Users
// ============================================================================

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isBlocked?: boolean;
  status?: string;
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  isBlocked: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  workspaceCount: number;
}

export interface UserListResponse {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserDetails {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  isBlocked: boolean;
  blockedAt: string | null;
  blockedBy: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  stats: {
    workspaces: number;
    projects: number;
    conversations: number;
    documents: number;
  };
}

export interface UpdateUserData {
  fullName?: string;
  isSuperAdmin?: boolean;
}

// ============================================================================
// Interfaces: Workspaces
// ============================================================================

export interface ListWorkspacesParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface WorkspaceListItem {
  id: string;
  name: string;
  ownerEmail: string;
  memberCount: number;
  projectCount: number;
  createdAt: string;
}

export interface WorkspaceListResponse {
  workspaces: WorkspaceListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkspaceDetails {
  id: string;
  name: string;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    fullName: string;
  };
  members: Array<{
    userId: string;
    role: string;
    email: string;
    fullName: string;
  }>;
  stats: {
    memberCount: number;
    projectCount: number;
    documentCount: number;
  };
}

// ============================================================================
// Interfaces: Models
// ============================================================================

export interface VisibleImageModelConfig {
  id: string;
  name?: string;
  provider?: string;
  modelType?: 'text-to-image' | 'image-to-image';
  supportsMask?: boolean;
  maxImages?: number;
  parameters?: ModelSchema['parameters'];
}

export type VisibleImageModelValue = string | VisibleImageModelConfig;

export interface ModelConfig {
  defaults: {
    chat?: string;
    vision?: string;
    image_generation?: string;
    document?: string;
    embedding?: string;
    image_naming?: string;
    prompt_enrichment?: string;
  };
  fallbacks: Record<string, string>;
  visibleTextModels: string[];
  visibleImageModels: VisibleImageModelValue[];
}

export interface ModelSchema {
  supportsMask: boolean;
  maxImages: number;
  parameters: Array<{
    name: string;
    type: 'select' | 'number' | 'boolean' | 'string';
    label: string;
    description?: string;
    options?: { value: string; label: string }[];
    default: string | number | boolean;
    min?: number;
    max?: number;
    step?: number;
  }>;
}

export interface AvailableModel {
  id: string;
  name: string;
  provider: string;
  type: 'text' | 'image';
  hasVision: boolean;
  contextLength: number | null;
  pricing: {
    prompt: number;
    completion: number;
  } | null;
}

// ============================================================================
// Interfaces: System Settings
// ============================================================================

export interface SystemSetting {
  key: string;
  value: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  updatedAt: string;
}

// ============================================================================
// Interfaces: System Messages
// ============================================================================

export interface SystemMessage {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'maintenance';
  isActive: boolean;
  priority: number;
  dismissible: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSystemMessage {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'maintenance';
  isActive?: boolean;
  priority?: number;
  dismissible?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}


// ============================================================================
// Interfaces: Audit Log
// ============================================================================

export interface AuditLogParams {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Interfaces: AI Usage
// ============================================================================

export interface AiUsageSummary {
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  averageCostPerRequest: number;
  averageTokensPerRequest: number;
  periodDays: number;
}

export interface AiUsageByEntity {
  id: string;
  name: string;
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
}

// ============================================================================
// API Functions: Admin Verify
// ============================================================================

export async function verifyAdmin(): Promise<{ is_admin: boolean }> {
  const response = await api.get('/admin/verify');
  return response.data;
}

// ============================================================================
// API Functions: Dashboard
// ============================================================================

export async function getDashboardStats(
  periodDays?: number,
): Promise<DashboardStats> {
  const response = await api.get('/admin/dashboard', {
    params: periodDays !== undefined ? { periodDays } : undefined,
  });
  return response.data;
}

export async function getDashboardActivity(
  periodDays?: number,
): Promise<ActivityTrend[]> {
  const response = await api.get('/admin/dashboard/activity', {
    params: periodDays !== undefined ? { periodDays } : undefined,
  });
  return response.data;
}

export async function getRecentActivity(): Promise<RecentActivity> {
  const response = await api.get('/admin/dashboard/recent-activity');
  return response.data;
}

// ============================================================================
// API Functions: Users
// ============================================================================

export async function listUsers(
  params: ListUsersParams,
): Promise<UserListResponse> {
  const { page, limit = 20, ...rest } = params;
  const offset = page !== undefined ? (page - 1) * limit : 0;
  const response = await api.get('/admin/users', { params: { ...rest, limit, offset } });
  return response.data;
}

export async function getUserDetails(userId: string): Promise<UserDetails> {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data;
}

export async function updateUser(
  userId: string,
  data: UpdateUserData,
): Promise<void> {
  await api.put(`/admin/users/${userId}`, data);
}

export async function blockUser(userId: string): Promise<void> {
  await api.post(`/admin/users/${userId}/block`);
}

export async function unblockUser(userId: string): Promise<void> {
  await api.post(`/admin/users/${userId}/unblock`);
}

// ============================================================================
// API Functions: Workspaces
// ============================================================================

export async function listWorkspaces(
  params: ListWorkspacesParams,
): Promise<WorkspaceListResponse> {
  const { page, limit = 20, ...rest } = params;
  const offset = page !== undefined ? (page - 1) * limit : 0;
  const response = await api.get('/admin/workspaces', { params: { ...rest, limit, offset } });
  return response.data;
}

export async function getWorkspaceDetails(
  workspaceId: string,
): Promise<WorkspaceDetails> {
  const response = await api.get(`/admin/workspaces/${workspaceId}`);
  return response.data;
}

export async function transferWorkspace(
  workspaceId: string,
  newOwnerId: string,
): Promise<void> {
  await api.post(`/admin/workspaces/${workspaceId}/transfer`, {
    newOwnerId,
  });
}

export { transferWorkspace as transferWorkspaceOwnership };

// ============================================================================
// API Functions: Models
// ============================================================================

export async function getModelConfig(): Promise<ModelConfig> {
  const response = await api.get('/admin/models/config');
  return response.data;
}

export async function updateModelConfig(config: {
  defaults?: ModelConfig['defaults'];
  fallbacks?: Record<string, string>;
  visibleTextModels?: string[];
  visibleImageModels?: VisibleImageModelConfig[];
}): Promise<ModelConfig> {
  const response = await api.put('/admin/models/config', config);
  return response.data;
}

export async function getAvailableModels(): Promise<AvailableModel[]> {
  const response = await api.get('/admin/available-models');
  return response.data;
}

export async function getModelSchema(modelId: string): Promise<ModelSchema> {
  const response = await api.get('/admin/models/schema', { params: { modelId } });
  return response.data;
}

// ============================================================================
// API Functions: System Settings
// ============================================================================

export async function getSystemSettings(): Promise<SystemSetting[]> {
  const response = await api.get('/admin/system/settings');
  return response.data;
}

export async function updateSystemSettings(
  settings: Record<string, string>,
): Promise<void> {
  await api.put('/admin/system/settings', settings);
}

// ============================================================================
// API Functions: System Messages
// ============================================================================

export async function listSystemMessages(): Promise<SystemMessage[]> {
  const response = await api.get('/admin/system-messages');
  return response.data;
}

export async function createSystemMessage(
  data: CreateSystemMessage,
): Promise<SystemMessage> {
  const response = await api.post('/admin/system-messages', data);
  return response.data;
}

export async function updateSystemMessage(
  id: string,
  data: Partial<CreateSystemMessage>,
): Promise<SystemMessage> {
  const response = await api.put(`/admin/system-messages/${id}`, data);
  return response.data;
}

export async function deleteSystemMessage(id: string): Promise<void> {
  await api.delete(`/admin/system-messages/${id}`);
}

// ============================================================================
// API Functions: Audit Log
// ============================================================================

export async function getAuditLog(
  params: AuditLogParams,
): Promise<AuditLogResponse> {
  const response = await api.get('/admin/audit-log', { params });
  return response.data;
}

// ============================================================================
// API Functions: AI Usage
// ============================================================================

export async function getAiUsageSummary(
  periodDays?: number,
): Promise<AiUsageSummary> {
  const response = await api.get('/admin/ai-usage/summary', {
    params: periodDays !== undefined ? { periodDays } : undefined,
  });
  return response.data;
}

export async function getAiUsageByUser(
  periodDays?: number,
): Promise<AiUsageByEntity[]> {
  const response = await api.get('/admin/ai-usage/by-user', {
    params: periodDays !== undefined ? { periodDays } : undefined,
  });
  return response.data;
}

export async function getAiUsageByModel(
  periodDays?: number,
): Promise<AiUsageByEntity[]> {
  const response = await api.get('/admin/ai-usage/by-model', {
    params: periodDays !== undefined ? { periodDays } : undefined,
  });
  return response.data;
}
