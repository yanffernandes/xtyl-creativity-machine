/**
 * WorkflowHeader Component
 *
 * Header component for workflow editor with breadcrumb navigation,
 * execution controls, and workflow management actions.
 */

"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  MoreHorizontal,
  Play,
  Pause,
  Square,
  Save,
  CheckCircle,
  Download,
  Upload,
  Trash2,
  Copy,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ExecutionStatus } from "@/hooks/useWorkflowExecution";

export interface WorkflowHeaderProps {
  /** Workspace ID */
  workspaceId: string;
  /** Workspace name for breadcrumb */
  workspaceName?: string;
  /** Project ID */
  projectId: string;
  /** Project name for breadcrumb */
  projectName?: string;
  /** Workflow ID */
  workflowId?: string;
  /** Workflow name */
  workflowName?: string;
  /** Whether the workflow has unsaved changes */
  hasUnsavedChanges?: boolean;
  /** Callback when name changes */
  onNameChange?: (name: string) => void;
  /** Callback when save is clicked */
  onSave?: () => void;
  /** Callback when validate is clicked */
  onValidate?: () => void;
  /** Callback when export is clicked */
  onExport?: () => void;
  /** Callback when import is clicked */
  onImport?: () => void;
  /** Callback when duplicate is clicked */
  onDuplicate?: () => void;
  /** Callback when delete is clicked */
  onDelete?: () => void;
  /** Execution controls */
  executionStatus?: ExecutionStatus;
  onRun?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  /** Loading states */
  isSaving?: boolean;
  isValidating?: boolean;
  /** Additional class names */
  className?: string;
}

export function WorkflowHeader({
  workspaceId,
  workspaceName = "Workspace",
  projectId,
  projectName = "Project",
  workflowId: _workflowId,
  workflowName = "New Workflow",
  hasUnsavedChanges = false,
  onNameChange,
  onSave,
  onValidate,
  onExport,
  onImport,
  onDuplicate,
  onDelete,
  executionStatus = "idle",
  onRun,
  onPause,
  onStop,
  isSaving = false,
  isValidating = false,
  className,
}: WorkflowHeaderProps) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workflowName);

  const isRunning = executionStatus === "running";
  const isPaused = executionStatus === "paused";

  const handleBack = () => {
    router.push(`/workspace/${workspaceId}/project/${projectId}/workflows`);
  };

  const handleNameSubmit = () => {
    if (editedName.trim() && onNameChange) {
      onNameChange(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSubmit();
    } else if (e.key === "Escape") {
      setEditedName(workflowName);
      setIsEditingName(false);
    }
  };

  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 py-3",
        "border-b border-white/[0.08]",
        "bg-gradient-to-b from-white/[0.03] to-transparent backdrop-blur-sm",
        className
      )}
    >
      {/* Left side: Back button + Breadcrumb */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Back to workflows"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href={`/workspace/${workspaceId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {workspaceName}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <Link
            href={`/workspace/${workspaceId}/project/${projectId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {projectName}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <Link
            href={`/workspace/${workspaceId}/project/${projectId}/workflows`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Workflows
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />

          {/* Editable workflow name */}
          {isEditingName ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleNameKeyDown}
              className="h-7 w-48 text-sm font-medium"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setEditedName(workflowName);
                setIsEditingName(true);
              }}
              className="text-foreground font-medium flex items-center gap-1.5 hover:bg-white/[0.05] px-2 py-0.5 rounded transition-colors"
              title="Click to edit name"
            >
              {workflowName}
              {hasUnsavedChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Unsaved changes" />
              )}
            </button>
          )}
        </nav>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2">
        {/* Execution Controls */}
        {(onRun || onPause || onStop) && (
          <div className="flex items-center gap-1 bg-white/[0.05] border border-white/[0.08] rounded-lg p-1 mr-2">
            {!isRunning ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRun}
                disabled={hasUnsavedChanges}
                className="h-7 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                title={hasUnsavedChanges ? "Save before running" : "Run workflow"}
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Run
              </Button>
            ) : (
              <>
                {onPause && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onPause}
                    className="h-7 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10"
                  >
                    {isPaused ? (
                      <Play className="w-3.5 h-3.5" />
                    ) : (
                      <Pause className="w-3.5 h-3.5" />
                    )}
                  </Button>
                )}
                {onStop && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onStop}
                    className="h-7 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Square className="w-3.5 h-3.5 mr-1.5" />
                    Stop
                  </Button>
                )}
                <div className="flex items-center gap-1.5 px-2 border-l border-white/[0.08]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">
                    {isPaused ? "Paused" : "Running..."}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Import/Export */}
        {onImport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onImport}
            className="h-8 text-muted-foreground hover:text-foreground"
            title="Import workflow from JSON"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Import
          </Button>
        )}
        {onExport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className="h-8 text-muted-foreground hover:text-foreground"
            title="Export workflow as JSON"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
        )}

        <div className="w-px h-6 bg-white/[0.08]" />

        {/* Validate */}
        {onValidate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onValidate}
            disabled={isValidating}
            className="h-8"
          >
            {isValidating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            )}
            Validate
          </Button>
        )}

        {/* Save */}
        {onSave && (
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="h-8 bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Save
          </Button>
        )}

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onDuplicate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
            )}
            {onExport && (
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
