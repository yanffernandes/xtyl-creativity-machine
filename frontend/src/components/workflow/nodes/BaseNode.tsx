"use client";

import { ReactNode } from "react";
import { Handle, Position } from "reactflow";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassNodeClasses, handleDefaultClasses } from "@/lib/glass-utils";

interface BaseNodeProps {
    label: string;
    icon: LucideIcon;
    color: string;
    selected?: boolean;
    children?: ReactNode;
    showSourceHandle?: boolean;
    showTargetHandle?: boolean;
    sourcePosition?: Position;
    targetPosition?: Position;
}

/**
 * BaseNode Component
 *
 * Base node component with horizontal handle positions (Left/Right).
 * Uses liquid glass styling for visual consistency.
 * Fixed width (280px) with max height and overflow handling.
 */
export default function BaseNode({
    label,
    icon: Icon,
    color,
    selected,
    children,
    showSourceHandle = true,
    showTargetHandle = true,
    sourcePosition = Position.Right,  // Horizontal flow: output on right
    targetPosition = Position.Left,   // Horizontal flow: input on left
}: BaseNodeProps) {
    return (
        <div
            className={cn(
                "w-[280px] transition-all duration-200",
                glassNodeClasses,
                selected && "ring-2 ring-primary ring-offset-2 shadow-[0_0_20px_rgba(91,141,239,0.3)]"
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent rounded-t-xl">
                <div className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    "bg-white/[0.08] dark:bg-white/[0.04]",
                    color
                )}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm text-foreground truncate">
                    {label}
                </span>
            </div>

            {/* Body - Fixed max height with overflow */}
            {children && (
                <div className="p-3 text-sm text-muted-foreground max-h-[150px] overflow-y-auto">
                    {children}
                </div>
            )}

            {/* Handles - Horizontal positioning (Left for input, Right for output) */}
            {showTargetHandle && (
                <Handle
                    type="target"
                    position={targetPosition}
                    className={cn(handleDefaultClasses, "!bg-muted-foreground")}
                />
            )}
            {showSourceHandle && (
                <Handle
                    type="source"
                    position={sourcePosition}
                    className={handleDefaultClasses}
                />
            )}
        </div>
    );
}
