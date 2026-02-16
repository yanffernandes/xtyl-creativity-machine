/**
 * Copy Library API
 *
 * Types and API functions for the workspace-level copy library.
 * Copies are reusable text snippets that can be used as prompts for image generation.
 */

import api from './api';

// ============================================================================
// Types
// ============================================================================

export interface CopyLibraryItem {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CopyLibraryListResponse {
  items: CopyLibraryItem[];
  total: number;
}

export interface CreateCopyRequest {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateCopyRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface ListCopiesParams {
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// API Functions
// ============================================================================

export async function listCopies(
  workspaceId: string,
  params?: ListCopiesParams,
): Promise<CopyLibraryListResponse> {
  const response = await api.get(`/api/workspaces/${workspaceId}/copies`, {
    params,
  });
  return response.data;
}

export async function getCopy(
  workspaceId: string,
  copyId: string,
): Promise<CopyLibraryItem> {
  const response = await api.get(
    `/api/workspaces/${workspaceId}/copies/${copyId}`,
  );
  return response.data;
}

export async function createCopy(
  workspaceId: string,
  data: CreateCopyRequest,
): Promise<CopyLibraryItem> {
  const response = await api.post(
    `/api/workspaces/${workspaceId}/copies`,
    data,
  );
  return response.data;
}

export async function updateCopy(
  workspaceId: string,
  copyId: string,
  data: UpdateCopyRequest,
): Promise<CopyLibraryItem> {
  const response = await api.put(
    `/api/workspaces/${workspaceId}/copies/${copyId}`,
    data,
  );
  return response.data;
}

export async function deleteCopy(
  workspaceId: string,
  copyId: string,
): Promise<void> {
  await api.delete(`/api/workspaces/${workspaceId}/copies/${copyId}`);
}
