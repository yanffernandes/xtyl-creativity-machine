/**
 * WorkflowCard Component
 *
 * Card component for displaying a workflow in the project workflows list.
 * Shows workflow info with actions for edit, duplicate, delete, and run.
 *
 * Follows the Ethereal Blue + Liquid Glass design system.
 */

"use client";

import { Play, Copy, Trash2, Edit, MoreHorizontal, Clock, Zap, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface WorkflowCardProps {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isSystem?: boolean;
  isRecommended?: boolean;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRun?: (id: string) => void;
  className?: string;
}

export function WorkflowCard({
  id,
  name,
  description,
  category,
  isSystem = false,
  isRecommended = false,
  usageCount = 0,
  createdAt,
  updatedAt,
  onEdit,
  onDuplicate,
  onDelete,
  onRun,
  className,
}: WorkflowCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getCategoryConfig = (cat?: string) => {
    switch (cat) {
      case "social_media":
        return { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", label: "Social Media" };
      case "paid_ads":
        return { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", label: "Ads" };
      case "blog":
        return { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", label: "Blog" };
      case "email":
        return { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30", label: "Email" };
      case "seo":
        return { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", label: "SEO" };
      case "creative":
        return { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30", label: "Creative" };
      default:
        return { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/30", label: cat || "General" };
    }
  };

  const categoryConfig = getCategoryConfig(category);

  return (
    <div
      className={cn(
        // Glass card base
        "relative rounded-xl overflow-hidden",
        "bg-white/[0.03] dark:bg-white/[0.02]",
        "backdrop-blur-xl",
        "border border-white/[0.08]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        // Hover effects
        "cursor-pointer transition-all duration-300",
        "hover:bg-white/[0.06] dark:hover:bg-white/[0.04]",
        "hover:border-white/[0.15]",
        "hover:shadow-[0_12px_40px_rgba(91,141,239,0.15)]",
        "hover:scale-[1.02]",
        className
      )}
      onClick={() => onEdit?.(id)}
    >
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className={cn(
              "p-2 rounded-lg shrink-0",
              "bg-primary/10 text-primary",
              "border border-primary/20"
            )}>
              <Workflow className="w-4 h-4" />
            </div>

            {/* Title and badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-base text-foreground truncate">
                  {name}
                </h3>
                {isSystem && (
                  <Badge
                    variant="outline"
                    className="bg-primary/10 text-primary border-primary/30 text-[10px] px-1.5 py-0"
                  >
                    Template
                  </Badge>
                )}
                {isRecommended && (
                  <Badge
                    variant="outline"
                    className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-[10px] px-1.5 py-0 flex items-center gap-0.5"
                  >
                    <Zap className="h-2.5 w-2.5" />
                    Hot
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {!isSystem && onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(id); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Workflow
                </DropdownMenuItem>
              )}
              {onRun && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRun(id); }}>
                  <Play className="mr-2 h-4 w-4 text-green-500" />
                  Run Now
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(id); }}>
                  <Copy className="mr-2 h-4 w-4" />
                  {isSystem ? "Use Template" : "Duplicate"}
                </DropdownMenuItem>
              )}
              {!isSystem && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(id); }}
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

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            {category && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-2 py-0.5 font-medium",
                  categoryConfig.bg,
                  categoryConfig.text,
                  categoryConfig.border
                )}
              >
                {categoryConfig.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {usageCount > 0 && (
              <span className="flex items-center gap-1">
                <Play className="h-3 w-3" />
                {usageCount} runs
              </span>
            )}
            {(updatedAt || createdAt) && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(updatedAt || createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
