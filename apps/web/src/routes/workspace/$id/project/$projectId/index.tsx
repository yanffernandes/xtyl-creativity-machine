import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Image, Plus, Clock } from 'lucide-react';

function ProjectOverview() {
  const { projectId } = useParams({ from: '/workspace/$id/project/$projectId/' });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      return data ?? [];
    },
  });

  const textDocs = documents?.filter((d: any) => d.media_type !== 'image') ?? [];
  const imageDocs = documents?.filter((d: any) => d.media_type === 'image') ?? [];

  return (
    <div className="p-6 lg:p-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="glass-subtle">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-[#5B8DEF]/10 p-2.5">
              <FileText className="h-5 w-5 text-[#5B8DEF]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{textDocs.length}</p>
              <p className="text-xs text-slate-500">Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-subtle">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <Image className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{imageDocs.length}</p>
              <p className="text-xs text-slate-500">Images</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-subtle">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <Clock className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{documents?.length ?? 0}</p>
              <p className="text-xs text-slate-500">Total Items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Recent Documents</h3>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" /> New Document
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="h-16" /></Card>)}
        </div>
      ) : textDocs.length === 0 ? (
        <Card className="glass-subtle">
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No documents yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {textDocs.slice(0, 10).map((doc: any) => (
            <Card key={doc.id} className="glass-subtle cursor-pointer hover:shadow-md transition-all">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium">{doc.title || 'Untitled'}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(doc.updated_at).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/project/$projectId/')({
  component: ProjectOverview,
});
