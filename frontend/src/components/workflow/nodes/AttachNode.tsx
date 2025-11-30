"use client";

import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { Paperclip, FileText, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassNodeClasses, handleDefaultClasses } from "@/lib/glass-utils";

function AttachNode({ data, selected }: NodeProps) {
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
                <div className="p-1.5 rounded-lg shrink-0 bg-white/[0.08] dark:bg-white/[0.04] text-indigo-500">
                    <Paperclip className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm text-foreground truncate">
                    {data.label || "Attach Creative"}
                </span>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3">
                <div className="text-xs text-muted-foreground">
                    Combines a document with an image asset.
                </div>

                {/* Input labels */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                        <FileText className="w-3 h-3 text-blue-400" />
                        <span className="text-muted-foreground">Document Input</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <Image className="w-3 h-3 text-pink-400" />
                        <span className="text-muted-foreground">Image Input</span>
                    </div>
                </div>
            </div>

            {/* Handles - positioned on the node edges */}
            <Handle
                type="target"
                position={Position.Left}
                id="document"
                className={cn(handleDefaultClasses, "!bg-blue-400")}
                style={{ top: '40%' }}
            />
            <Handle
                type="target"
                position={Position.Left}
                id="image"
                className={cn(handleDefaultClasses, "!bg-pink-400")}
                style={{ top: '60%' }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                className={handleDefaultClasses}
                style={{ top: '50%' }}
            />
        </div>
    );
}

export default memo(AttachNode);
