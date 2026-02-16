import { Card } from '@/components/ui/card';
import { Workflow } from 'lucide-react';

interface WorkflowListProps {
  workflows: any[];
}

export function WorkflowList({ workflows }: WorkflowListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {workflows.map((workflow) => (
        <Card
          key={workflow.id}
          className="p-4 hover:border-[#5B8DEF] transition-colors cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#5B8DEF]/10">
              <Workflow className="h-5 w-5 text-[#5B8DEF]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {workflow.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {workflow.description || 'No description'}
              </p>
              {workflow.project && (
                <p className="text-xs text-slate-400 mt-2">{workflow.project.name}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
