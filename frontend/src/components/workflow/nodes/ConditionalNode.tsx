"use client";

import { Handle, Position, NodeProps } from "reactflow";
import { GitBranch, CheckCircle, XCircle } from "lucide-react";

interface ConditionalNodeData {
  label?: string;
  condition?: string;
  trueLabel?: string;
  falseLabel?: string;
}

export default function ConditionalNode({ data, selected }: NodeProps<ConditionalNodeData>) {
  return (
    <div
      className={`min-w-[200px] max-w-[280px] relative transition-all duration-300 ${
        selected ? "scale-105" : ""
      }`}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-purple-500 border-2 border-white"
      />

      {/* Diamond Container */}
      <div
        className={`relative bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 backdrop-blur-xl border-2 ${
          selected
            ? "border-purple-500 shadow-2xl shadow-purple-500/30"
            : "border-purple-200/50 dark:border-purple-800/50"
        } rounded-lg transition-all duration-300 hover:shadow-xl`}
        style={{
          transform: "rotate(45deg)",
          width: "120px",
          height: "120px",
        }}
      >
        {/* Content (rotated back) */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: "rotate(-45deg)" }}
        >
          <div className="p-2 rounded-lg bg-purple-500/20 mb-1">
            <GitBranch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-xs font-semibold text-purple-900 dark:text-purple-200 text-center px-2">
            {data.label || "Condition"}
          </span>
        </div>
      </div>

      {/* Label below diamond */}
      <div className="mt-6 text-center">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          {data.condition || "If condition met"}
        </p>
      </div>

      {/* Output Handles - True (Right) and False (Left) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="w-3 h-3 !bg-green-500 border-2 border-white"
        style={{ top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="false"
        className="w-3 h-3 !bg-red-500 border-2 border-white"
        style={{ top: "50%" }}
      />

      {/* Branch Labels */}
      <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
        <CheckCircle className="w-3 h-3 text-green-500" />
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
          {data.trueLabel || "Yes"}
        </span>
      </div>
      <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
        <XCircle className="w-3 h-3 text-red-500" />
        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
          {data.falseLabel || "No"}
        </span>
      </div>
    </div>
  );
}
