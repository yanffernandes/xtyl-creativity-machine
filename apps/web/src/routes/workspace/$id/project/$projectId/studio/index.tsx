import { createFileRoute, useParams } from '@tanstack/react-router';
import { ImageStudio } from '@/components/image-studio';

function StudioPage() {
  const { projectId } = useParams({ from: '/workspace/$id/project/$projectId/studio/' });

  return (
    <div className="p-6 lg:p-8">
      <ImageStudio projectId={projectId} />
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/project/$projectId/studio/')({
  component: StudioPage,
});
