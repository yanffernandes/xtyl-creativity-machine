import { createFileRoute } from '@tanstack/react-router';
import { ImageStudio } from '@/features/image-studio/ImageStudio';
import { useCreativeConcepts } from '@/hooks/useVisualAssets';
import type { CreativeConcept } from '@/types/image-studio';
import { Loader2 } from 'lucide-react';

/**
 * Visual Generation Studio Page
 * Full-featured image generation interface with:
 * - Text-to-image generation
 * - Image editing (brush inpainting)
 * - Quick adjustments (remove BG, upscale, enhance)
 * - Creative concepts integration
 */
function StudioPage() {
  const { projectId } = Route.useParams();

  // Load creative concepts
  const { data: concepts = [], isLoading: conceptsLoading } = useCreativeConcepts();

  // Loading state
  if (conceptsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#5B8DEF]" />
          <span className="text-slate-500">Loading studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <ImageStudio
        projectId={projectId}
        concepts={concepts as unknown as CreativeConcept[]}
        className="h-full w-full"
      />
    </div>
  );
}

export const Route = createFileRoute(
  '/workspace/$id/project/$projectId/studio/'
)({
  component: StudioPage,
});
