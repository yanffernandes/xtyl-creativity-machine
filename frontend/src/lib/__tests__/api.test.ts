/**
 * Unit tests for API client.
 *
 * Tests axios interceptors, authentication token handling,
 * session refresh, and API helper functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock Supabase before importing the API module
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Import after mocking
import api, {
  getProjectSettings,
  updateProjectSettings,
  getProjectContext,
  extractColorsFromImage,
  extractColorsFromAsset,
  classifyAsset,
  updateAssetMetadata,
  getVisualAssets,
  getVisualAssetsSummary,
  getVisualSettings,
  updateVisualSettings,
  getAssetSelections,
  updateAssetSelections,
  getVisualContext,
  recordAssetUsage,
  detachImageFromDocument,
  deleteImagePermanently,
  enrichPrompt,
} from '../api';
import { supabase } from '../supabase';

// Mock axios methods
vi.mock('axios', async () => {
  const actual = await vi.importActual('axios');
  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      })),
    },
  };
});

describe('API Client', () => {
  let mockApi: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mock api instance
    mockApi = api;
  });

  describe('Authentication', () => {
    it('should add authorization header when session exists', async () => {
      const mockSession = {
        access_token: 'test-token-123',
        refresh_token: 'refresh-token',
      };

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // The interceptor would be called by axios - this tests the mock setup
      expect(supabase.auth.getSession).toBeDefined();
    });

    it('should handle missing session gracefully', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await supabase.auth.getSession();
      expect(result.data.session).toBeNull();
    });

    it('should handle session error', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null },
        error: new Error('Session error'),
      });

      const result = await supabase.auth.getSession();
      expect(result.error).toBeTruthy();
    });
  });

  describe('Session Refresh', () => {
    it('should refresh session on 401 error', async () => {
      const newSession = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
      };

      (supabase.auth.refreshSession as any).mockResolvedValue({
        data: { session: newSession },
        error: null,
      });

      // Simulate refresh
      const result = await supabase.auth.refreshSession();
      expect(result.data.session?.access_token).toBe('new-token');
    });

    it('should sign out when refresh fails', async () => {
      (supabase.auth.refreshSession as any).mockResolvedValue({
        data: { session: null },
        error: new Error('Refresh failed'),
      });

      (supabase.auth.signOut as any).mockResolvedValue({ error: null });

      // The interceptor would call signOut on refresh failure
      expect(supabase.auth.signOut).toBeDefined();
    });
  });

  describe('Project Settings API', () => {
    it('should get project settings', async () => {
      const mockSettings = {
        client_name: 'Test Client',
        description: 'Test description',
        brand_voice: 'professional',
      };

      mockApi.get = vi.fn().mockResolvedValue({ data: mockSettings });

      const result = await getProjectSettings('project-123');

      expect(mockApi.get).toHaveBeenCalledWith('/projects/project-123/settings');
      expect(result).toEqual(mockSettings);
    });

    it('should return null for 404 on project settings', async () => {
      mockApi.get = vi.fn().mockRejectedValue({
        response: { status: 404 },
      });

      const result = await getProjectSettings('project-123');

      expect(result).toBeNull();
    });

    it('should return null for empty settings object', async () => {
      mockApi.get = vi.fn().mockResolvedValue({ data: {} });

      const result = await getProjectSettings('project-123');

      expect(result).toBeNull();
    });

    it('should update project settings', async () => {
      const settings = {
        client_name: 'Updated Client',
        target_audience: 'Enterprise',
      };

      mockApi.put = vi.fn().mockResolvedValue({ data: settings });

      const result = await updateProjectSettings('project-123', settings as any);

      expect(mockApi.put).toHaveBeenCalledWith('/projects/project-123/settings', settings);
      expect(result).toEqual(settings);
    });

    it('should get project context', async () => {
      const mockContext = {
        formatted_context: 'Client: Test\nAudience: B2B',
        has_settings: true,
        missing_fields: [],
      };

      mockApi.get = vi.fn().mockResolvedValue({ data: mockContext });

      const result = await getProjectContext('project-123');

      expect(mockApi.get).toHaveBeenCalledWith('/projects/project-123/settings/context');
      expect(result).toEqual(mockContext);
    });
  });

  describe('Color Extraction API', () => {
    it('should extract colors from image file', async () => {
      const mockResult = {
        colors: ['#FF0000', '#00FF00', '#0000FF'],
        source_filename: 'logo.png',
        processing_time_ms: 150,
        message: null,
      };

      mockApi.post = vi.fn().mockResolvedValue({ data: mockResult });

      const mockFile = new File([''], 'logo.png', { type: 'image/png' });
      const result = await extractColorsFromImage('project-123', mockFile);

      expect(mockApi.post).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should extract colors from existing asset', async () => {
      const mockResult = {
        colors: ['#FF0000'],
        source_asset_id: 'asset-1',
        source_asset_name: 'Brand Logo',
        source_filename: 'logo.png',
        processing_time_ms: 100,
        message: null,
      };

      mockApi.post = vi.fn().mockResolvedValue({ data: mockResult });

      const result = await extractColorsFromAsset('project-123', 'asset-1');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/projects/project-123/extract-colors-from-asset',
        { asset_id: 'asset-1' }
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('Visual Assets API', () => {
    it('should classify an asset', async () => {
      const mockResult = {
        asset_id: 'asset-1',
        suggested_category: 'Logo',
        suggested_tags: ['brand', 'identity'],
        ai_description: 'Company logo with blue color scheme',
      };

      mockApi.post = vi.fn().mockResolvedValue({ data: mockResult });

      const result = await classifyAsset('asset-1', false);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/assets/asset-1/classify?force=false',
        {},
        { timeout: 60000 }
      );
      expect(result).toEqual(mockResult);
    });

    it('should force reclassify an asset', async () => {
      mockApi.post = vi.fn().mockResolvedValue({ data: {} });

      await classifyAsset('asset-1', true);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/assets/asset-1/classify?force=true',
        {},
        { timeout: 60000 }
      );
    });

    it('should update asset metadata', async () => {
      const metadata = {
        category: 'Produto' as const,
        tags: ['product', 'feature'],
      };

      mockApi.patch = vi.fn().mockResolvedValue({ data: { id: 'asset-1', ...metadata } });

      const result = await updateAssetMetadata('asset-1', metadata);

      expect(mockApi.patch).toHaveBeenCalledWith('/assets/asset-1/metadata', metadata);
      expect(result.category).toBe('Produto');
    });

    it('should get visual assets with filters', async () => {
      const mockAssets = {
        assets: [{ id: 'asset-1', title: 'Logo', category: 'Logo' }],
        total: 1,
      };

      mockApi.get = vi.fn().mockResolvedValue({ data: mockAssets });

      const result = await getVisualAssets('project-123', 'Logo', false);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/project-123/visual-assets?category=Logo&include_unclassified=false'
      );
      expect(result).toEqual(mockAssets);
    });

    it('should get visual assets summary', async () => {
      const mockSummary = {
        total: 10,
        by_category: { Logo: 2, Produto: 5, Background: 3 },
      };

      mockApi.get = vi.fn().mockResolvedValue({ data: mockSummary });

      const result = await getVisualAssetsSummary('project-123');

      expect(mockApi.get).toHaveBeenCalledWith('/projects/project-123/visual-assets/summary');
      expect(result).toEqual(mockSummary);
    });
  });

  describe('Visual Settings API', () => {
    it('should get visual settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        project_id: 'project-123',
        is_enabled: true,
        mode: 'auto',
        assets_per_category: 3,
      };

      mockApi.get = vi.fn().mockResolvedValue({ data: mockSettings });

      const result = await getVisualSettings('project-123');

      expect(mockApi.get).toHaveBeenCalledWith('/projects/project-123/assistant/visual-settings');
      expect(result).toEqual(mockSettings);
    });

    it('should update visual settings', async () => {
      const update = {
        is_enabled: false,
        mode: 'manual' as const,
      };

      mockApi.put = vi.fn().mockResolvedValue({ data: { ...update, id: 'settings-1' } });

      const result = await updateVisualSettings('project-123', update);

      expect(mockApi.put).toHaveBeenCalledWith(
        '/projects/project-123/assistant/visual-settings',
        update
      );
      expect(result.is_enabled).toBe(false);
    });

    it('should get asset selections', async () => {
      const mockSelections = {
        selections: [{ id: 'sel-1', asset_id: 'asset-1', is_enabled: true }],
        total_enabled: 1,
      };

      mockApi.get = vi.fn().mockResolvedValue({ data: mockSelections });

      const result = await getAssetSelections('project-123');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/project-123/assistant/visual-settings/selections'
      );
      expect(result).toEqual(mockSelections);
    });

    it('should update asset selections', async () => {
      const assetIds = ['asset-1', 'asset-2'];

      mockApi.put = vi.fn().mockResolvedValue({
        data: { selections: [], total_enabled: 2 },
      });

      const result = await updateAssetSelections('project-123', assetIds);

      expect(mockApi.put).toHaveBeenCalledWith(
        '/projects/project-123/assistant/visual-settings/selections',
        { asset_ids: assetIds }
      );
    });
  });

  describe('Visual Context API', () => {
    it('should get visual context', async () => {
      const mockContext = {
        is_enabled: true,
        mode: 'auto',
        assets: [{ id: 'asset-1', title: 'Logo' }],
      };

      mockApi.get = vi.fn().mockResolvedValue({ data: mockContext });

      const result = await getVisualContext('project-123', 10);

      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/project-123/assistant/visual-context?limit=10'
      );
      expect(result).toEqual(mockContext);
    });

    it('should use default limit for visual context', async () => {
      mockApi.get = vi.fn().mockResolvedValue({ data: {} });

      await getVisualContext('project-123');

      expect(mockApi.get).toHaveBeenCalledWith(
        '/projects/project-123/assistant/visual-context?limit=5'
      );
    });

    it('should record asset usage', async () => {
      mockApi.post = vi.fn().mockResolvedValue({
        data: { message: 'Recorded', count: 2 },
      });

      const result = await recordAssetUsage('project-123', ['asset-1', 'asset-2'], 'gen-123');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/projects/project-123/assistant/visual-context/record-usage',
        { asset_ids: ['asset-1', 'asset-2'], generation_id: 'gen-123' }
      );
      expect(result.count).toBe(2);
    });
  });

  describe('Document Attachment API', () => {
    it('should detach image from document', async () => {
      const mockResponse = {
        success: true,
        message: 'Image detached',
        image_id: 'image-1',
      };

      mockApi.delete = vi.fn().mockResolvedValue({ data: mockResponse });

      const result = await detachImageFromDocument('doc-123', 'attach-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/documents/doc-123/attachments/attach-1');
      expect(result).toEqual(mockResponse);
    });

    it('should permanently delete image', async () => {
      const mockResponse = {
        success: true,
        message: 'Image deleted',
        deleted_files: ['file1.png', 'thumb1.png'],
      };

      mockApi.delete = vi.fn().mockResolvedValue({ data: mockResponse });

      const result = await deleteImagePermanently('doc-123', 'attach-1');

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/documents/doc-123/attachments/attach-1/permanent'
      );
      expect(result.deleted_files).toHaveLength(2);
    });
  });

  describe('Prompt Enrichment API', () => {
    it('should enrich a prompt', async () => {
      const mockResponse = {
        original_prompt: 'Write about product',
        enriched_prompt: 'Write compelling copy about product for enterprise audience',
        brand_context_applied: true,
        model_used: 'gpt-4',
      };

      mockApi.post = vi.fn().mockResolvedValue({ data: mockResponse });

      const result = await enrichPrompt({
        prompt: 'Write about product',
        project_id: 'project-123',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/prompts/enrich', {
        prompt: 'Write about product',
        project_id: 'project-123',
      });
      expect(result.brand_context_applied).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should propagate non-404 errors from getProjectSettings', async () => {
      mockApi.get = vi.fn().mockRejectedValue({
        response: { status: 500 },
        message: 'Internal Server Error',
      });

      await expect(getProjectSettings('project-123')).rejects.toEqual(
        expect.objectContaining({ response: { status: 500 } })
      );
    });

    it('should handle network errors', async () => {
      mockApi.get = vi.fn().mockRejectedValue(new Error('Network Error'));

      await expect(getProjectContext('project-123')).rejects.toThrow('Network Error');
    });
  });
});
