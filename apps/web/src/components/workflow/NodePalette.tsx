"use client";

import {
    Play,
    Square,
    Type,
    Image as ImageIcon,
    GitBranch,
    Repeat,
    Database,
    GripVertical,
    Paperclip,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { glassPanelHeaderClasses, glassItemClasses } from "@/lib/glass-utils";

const nodeTypes = [
    {
        category: "Control Flow",
        items: [
            { type: "start", label: "Start", icon: Play, color: "text-green-500" },
            { type: "finish", label: "Finish", icon: Square, color: "text-red-500" },
            { type: "conditional", label: "Condition", icon: GitBranch, color: "text-orange-500" },
            { type: "loop", label: "Loop", icon: Repeat, color: "text-blue-500" },
        ],
    },
    {
        category: "AI Generation",
        items: [
            { type: "text_generation", label: "Text Gen", icon: Type, color: "text-purple-500" },
            { type: "image_generation", label: "Image Gen", icon: ImageIcon, color: "text-pink-500" },
        ],
    },
    {
        category: "Data",
        items: [
            { type: "context_retrieval", label: "Context", icon: Database, color: "text-yellow-500" },
            { type: "attach_creative", label: "Attach", icon: Paperclip, color: "text-indigo-500" },
        ],
    },
];

interface NodePaletteProps {
    className?: string;
}

export function NodePalette({ className }: NodePaletteProps) {
    const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
        event.dataTransfer.setData("application/reactflow", nodeType);
        event.dataTransfer.setData("application/reactflow/label", label);
        event.dataTransfer.effectAllowed = "move";
    };

    return (
        <div className={cn(
            "h-full flex flex-col overflow-hidden",
            className
        )}>
            {/* Header with gradient */}
            <div className={cn("p-3", glassPanelHeaderClasses)}>
                <h2 className="text-sm font-semibold text-foreground">Componentes</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Arraste para o canvas</p>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {nodeTypes.map((category) => (
                        <div key={category.category}>
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                {category.category}
                            </h3>
                            <div className="space-y-2">
                                {category.items.map((node) => (
                                    <div
                                        key={node.type}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, node.type, node.label)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl",
                                            glassItemClasses,
                                            "cursor-grab active:cursor-grabbing",
                                            "group"
                                        )}
                                    >
                                        <div className={cn(
                                            "p-1.5 rounded-lg",
                                            "bg-white/[0.06] dark:bg-white/[0.04]",
                                            "group-hover:bg-primary/10",
                                            "transition-colors",
                                            node.color
                                        )}>
                                            <node.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                                            {node.label}
                                        </span>
                                        <GripVertical className="w-4 h-4 text-muted-foreground/40 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

// Default export for backwards compatibility
export default NodePalette;
