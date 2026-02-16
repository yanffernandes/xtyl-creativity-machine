import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Workflow, ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';

/**
 * Workflow Templates Page
 *
 * Browse and instantiate pre-built workflow templates.
 */
function WorkflowTemplatesPage() {
  const { id: workspaceId } = useParams({
    from: '/workspace/$id/workflows/templates',
  });
  const navigate = useNavigate();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_template', true)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      return data || [];
    },
  });

  const handleInstantiate = async (templateId: string) => {
    try {
      // Create a copy of the template for the workspace
      const template = templates?.find((t: any) => t.id === templateId);
      if (!template) return;

      const { error } = await supabase
        .from('workflow_templates')
        .insert({
          workspace_id: workspaceId,
          name: `${template.name} (Copy)`,
          description: template.description,
          nodes_json: template.nodes_json,
          edges_json: template.edges_json,
          input_schema: template.input_schema,
          is_template: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Template instantiated successfully');
      navigate({ to: '/workspace/$id/workflows', params: { id: workspaceId } });
    } catch (error) {
      console.error('Failed to instantiate template:', error);
      toast.error('Failed to instantiate template');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/workspace/$id/workflows" params={{ id: workspaceId }}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Workflow className="h-6 w-6 text-[#5B8DEF]" />
            Workflow Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pre-built workflows ready to use
          </p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            Loading templates...
          </div>
        ) : templates && templates.length > 0 ? (
          templates.map((template: any) => (
            <Card
              key={template.id}
              className="hover:border-[#5B8DEF] transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#5B8DEF]/10">
                    <Workflow className="h-5 w-5 text-[#5B8DEF]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {template.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {template.description || 'No description'}
                    </p>
                  </div>
                </div>

                {template.tags && template.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => handleInstantiate(template.id)}
                  className="w-full"
                  variant="outline"
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-slate-500">
            No templates available
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/workspace/$id/workflows/templates')({
  component: WorkflowTemplatesPage,
});
