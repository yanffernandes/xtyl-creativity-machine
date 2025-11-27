"use client";

import { memo } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import { Paperclip } from "lucide-react";
import BaseNode from "./BaseNode";

function AttachNode({ data, selected }: NodeProps) {
    return (
        <BaseNode
            label={data.label || "Attach Creative"}
            icon={Paperclip}
            color="text-indigo-500"
            selected={selected}
            showSourceHandle={false}
            showTargetHandle={false}
        >
            <div className="space-y-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                    Combines a document with an image asset.
                </div>

                <div className="relative h-16">
                    {/* Custom Handles */}
                    <div className="absolute left-0 top-2 flex items-center">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id="document"
                            className="w-3 h-3 !bg-gray-400 dark:!bg-gray-500 border-2 border-white dark:border-gray-900"
                            style={{ left: -24, top: 0, position: 'relative' }}
                        />
                        <span className="text-[10px] ml-1 text-gray-500">Document</span>
                    </div>

                    <div className="absolute left-0 bottom-2 flex items-center">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id="image"
                            className="w-3 h-3 !bg-purple-400 dark:!bg-purple-500 border-2 border-white dark:border-gray-900"
                            style={{ left: -24, top: 0, position: 'relative' }}
                        />
                        <span className="text-[10px] ml-1 text-gray-500">Image</span>
                    </div>

                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center justify-end">
                        <span className="text-[10px] mr-1 text-gray-500">Output</span>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id="output"
                            className="w-3 h-3 !bg-indigo-500 border-2 border-white dark:border-gray-900"
                            style={{ right: -24, top: 0, position: 'relative' }}
                        />
                    </div>
                </div>
            </div>
        </BaseNode>
    );
}

export default memo(AttachNode);
