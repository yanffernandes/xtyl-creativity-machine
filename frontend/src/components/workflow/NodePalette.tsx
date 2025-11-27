"use client";

import {
    Play,
    Square,
    Type,
    Image as ImageIcon,
    GitBranch,
    Repeat,
    Database,
    Cpu,
    GripVertical,
    Paperclip,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
        category: "Data & Processing",
        items: [
            { type: "context_retrieval", label: "Context", icon: Database, color: "text-yellow-500" },
            { type: "processing", label: "Process", icon: Cpu, color: "text-cyan-500" },
            { type: "attach_creative", label: "Attach", icon: Paperclip, color: "text-indigo-500" },
        ],
    },
];

export default function NodePalette() {
    const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
        event.dataTransfer.setData("application/reactflow", nodeType);
        event.dataTransfer.setData("application/reactflow/label", label);
        event.dataTransfer.effectAllowed = "move";
    };

    return (
        <div className="w-64 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="font-semibold text-gray-900 dark:text-white">Components</h2>
                <p className="text-xs text-gray-500 mt-1">Drag nodes to the canvas</p>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {nodeTypes.map((category) => (
                        <div key={category.category}>
                            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                                {category.category}
                            </h3>
                            <div className="space-y-2">
                                {category.items.map((node) => (
                                    <div
                                        key={node.type}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, node.type, node.label)}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        <div className={`p-1.5 rounded-md bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 ${node.color}`}>
                                            <node.icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {node.label}
                                        </span>
                                        <GripVertical className="w-4 h-4 text-gray-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
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
