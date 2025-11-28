/**
 * WorkflowList Component
 *
 * Grid layout for displaying workflow cards in a project context.
 */

"use client";

import { WorkflowCard } from "./WorkflowCard";

export interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
  is_system: boolean;
  is_recommended?: boolean;
  usage_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowListProps {
  workflows: WorkflowItem[];
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRun?: (id: string) => void;
}

export function WorkflowList({
  workflows,
  onEdit,
  onDuplicate,
  onDelete,
  onRun,
}: WorkflowListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {workflows.map((workflow) => (
        <WorkflowCard
          key={workflow.id}
          id={workflow.id}
          name={workflow.name}
          description={workflow.description}
          category={workflow.category}
          isSystem={workflow.is_system}
          isRecommended={workflow.is_recommended}
          usageCount={workflow.usage_count}
          createdAt={workflow.created_at}
          updatedAt={workflow.updated_at}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onRun={onRun}
        />
      ))}
    </div>
  );
}
