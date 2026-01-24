'use client';

/**
 * Visual Generation Studio Page
 * Feature 029: Image Studio Evolution - fal.ai Migration
 *
 * Tab-based interface with:
 * - Criar: Generate images from prompts (with creative prompt generator)
 * - Editar: Brush inpainting and natural language editing
 * - Ajustar: Quick functions (remove BG, upscale, enhance)
 * - Vídeo: Placeholder for future video generation
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ImageIcon } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { useProjectBootstrap } from '@/hooks/useProjectBootstrap';
import type { BootstrapData } from '@/types/image-studio';
import { Button } from '@/components/ui/button';

// New unified Image Studio component with tabs
import { ImageStudio } from '@/components/image-studio/ImageStudio';

export default function StudioPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const projectId = params.projectId as string;

  const { session, isLoading: authLoading } = useAuthStore();

  // Fetch bootstrap data (models, presets, etc.)
  const { data, isLoading: bootstrapLoading } = useProjectBootstrap(projectId);
  const bootstrapData = data as BootstrapData | undefined;

  // Filter presets by type
  const allPresets = bootstrapData?.style_presets || [];
  const visualStylePresets = allPresets.filter((p) => p.preset_type === 'visual_style');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login');
    }
  }, [authLoading, session, router]);

  const handleBack = () => {
    router.push(`/workspace/${workspaceId}/project/${projectId}`);
  };

  // Loading state
  if (authLoading || bootstrapLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="text-gray-500 dark:text-gray-400">Carregando estúdio...</span>
        </div>
      </div>
    );
  }

  const defaultImageModel =
    bootstrapData?.models?.default_image_model || bootstrapData?.models?.image?.[0]?.id;

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10">
      {/* Header */}
      <header className="flex-shrink-0 h-16 border-b border-gray-200/50 dark:border-gray-800/50 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70">
        <div className="h-full max-w-[1800px] mx-auto px-6 flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <ImageIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Estúdio Visual
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {bootstrapData?.project?.name || 'Projeto'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - ImageStudio with tabs */}
      <main className="flex-1 overflow-y-auto">
        <div className="h-full max-w-[1400px] mx-auto p-6">
          <ImageStudio
            projectId={projectId}
            imageModels={bootstrapData?.models?.image || []}
            visualStylePresets={visualStylePresets}
            layoutPresets={[]}
            defaultModel={defaultImageModel}
            isLoading={bootstrapLoading}
          />
        </div>
      </main>
    </div>
  );
}
