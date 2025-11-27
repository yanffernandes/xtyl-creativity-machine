"use client";

import { ReactNode } from "react";
import { Handle, Position } from "reactflow";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface BaseNodeProps {
    label: string;
    icon: LucideIcon;
    color: string;
    selected?: boolean;
    children?: ReactNode;
    showSourceHandle?: boolean;
    showTargetHandle?: boolean;
}

export default function BaseNode({
    label,
    icon: Icon,
    color,
    selected,
    children,
    showSourceHandle = true,
    showTargetHandle = true,
    sourcePosition = Position.Bottom,
    targetPosition = Position.Top,
}: BaseNodeProps & { sourcePosition?: Position; targetPosition?: Position }) {
    return (
        <Card
            className={`min-w-[200px] bg-white dark:bg-gray-900 border-2 transition-all duration-200 ${selected
                ? "border-blue-500 shadow-lg shadow-blue-500/20"
                : "border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700"
                }`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 rounded-t-lg">
                <div className={`p-1.5 rounded-md ${color.replace("text-", "bg-").replace("500", "100")} dark:bg-opacity-20`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {label}
                </span>
            </div>

            {/* Body */}
            <div className="p-3">
                {children}
            </div>

            {/* Handles */}
            {showTargetHandle && (
                <Handle
                    type="target"
                    position={targetPosition}
                    className="w-3 h-3 !bg-gray-400 dark:!bg-gray-500 border-2 border-white dark:border-gray-900"
                />
            )}
            {showSourceHandle && (
                <Handle
                    type="source"
                    position={sourcePosition}
                    className="w-3 h-3 !bg-blue-500 border-2 border-white dark:border-gray-900"
                />
            )}
        </Card>
    );
}
