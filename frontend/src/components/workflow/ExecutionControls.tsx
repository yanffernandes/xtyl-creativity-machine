"use client";

import { Play, Pause, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutionStatus } from "@/hooks/useWorkflowExecution";

interface ExecutionControlsProps {
    status: ExecutionStatus;
    onStart: () => void;
    onStop: () => void;
    onPause?: () => void;
    disabled?: boolean;
}

export default function ExecutionControls({
    status,
    onStart,
    onStop,
    onPause,
    disabled = false,
}: ExecutionControlsProps) {
    const isRunning = status === 'running';
    const isPaused = status === 'paused';

    return (
        <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1 shadow-sm">
            {!isRunning ? (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onStart}
                    disabled={disabled}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                    <Play className="w-4 h-4 mr-2" />
                    Run
                </Button>
            ) : (
                <>
                    {onPause && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onPause}
                            disabled={disabled}
                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                        >
                            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onStop}
                        disabled={disabled}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                        <Square className="w-4 h-4 mr-2" />
                        Stop
                    </Button>
                    <div className="flex items-center gap-2 px-2 border-l border-gray-200 dark:border-gray-800">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span className="text-xs font-medium text-gray-500">Running...</span>
                    </div>
                </>
            )}
        </div>
    );
}
