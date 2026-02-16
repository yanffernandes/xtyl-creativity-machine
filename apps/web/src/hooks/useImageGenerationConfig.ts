/**
 * useImageGenerationConfig Hook - Smart Image Generation (Feature 026)
 *
 * Hook for fetching and updating image generation variation configuration
 * from the admin panel.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ImageGenerationConfig,
  ImageGenerationConfigUpdate,
} from "@/types/image-variations";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Fetch current image generation config
 */
async function fetchConfig(): Promise<ImageGenerationConfig> {
  const response = await fetch(`${API_BASE}/admin/config/image-generation`, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized - admin access required");
    }
    throw new Error("Failed to fetch image generation config");
  }

  return response.json();
}

/**
 * Update image generation config
 */
async function updateConfig(
  update: ImageGenerationConfigUpdate
): Promise<ImageGenerationConfig> {
  const response = await fetch(`${API_BASE}/admin/config/image-generation`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(update),
  });

  if (!response.ok) {
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(error.detail || "Invalid configuration");
    }
    throw new Error("Failed to update image generation config");
  }

  return response.json();
}

export interface UseImageGenerationConfigReturn {
  config: ImageGenerationConfig | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  updateConfig: (update: ImageGenerationConfigUpdate) => Promise<void>;
  isUpdating: boolean;
  updateError: Error | null;
}

export function useImageGenerationConfig(): UseImageGenerationConfigReturn {
  const queryClient = useQueryClient();

  // Query for current config
  const {
    data: config,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["imageGenerationConfig"],
    queryFn: fetchConfig,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Mutation for updating config
  const mutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: (newConfig) => {
      // Update cache with new config
      queryClient.setQueryData(["imageGenerationConfig"], newConfig);
    },
  });

  return {
    config,
    isLoading,
    isError,
    error: error as Error | null,
    updateConfig: async (update: ImageGenerationConfigUpdate) => {
      await mutation.mutateAsync(update);
    },
    isUpdating: mutation.isPending,
    updateError: mutation.error as Error | null,
  };
}

export default useImageGenerationConfig;
