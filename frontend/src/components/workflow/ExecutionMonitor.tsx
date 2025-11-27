import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, Terminal, Clock } from 'lucide-react';
import { ExecutionStatus } from '@/hooks/useWorkflowExecution';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExecutionMonitorProps {
    status: ExecutionStatus;
    progress: number;
    logs: string[];
    currentNodeId: string | null;
    executionId: string | null;
    onClose?: () => void;
}

export default function ExecutionMonitor({
    status,
    progress,
    logs,
    currentNodeId,
    executionId,
    onClose
}: ExecutionMonitorProps) {
    const [isExpanded, setIsExpanded] = React.useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isExpanded]);

    if (status === 'idle') return null;

    const getStatusColor = () => {
        switch (status) {
            case 'running': return 'text-blue-500';
            case 'completed': return 'text-green-500';
            case 'failed': return 'text-red-500';
            case 'paused': return 'text-yellow-500';
            case 'stopped': return 'text-gray-500';
            default: return 'text-gray-500';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'running': return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
            case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'paused': return <Clock className="w-5 h-5 text-yellow-500" />;
            default: return <Terminal className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
        >
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm cursor-pointer border-b border-gray-100 dark:border-gray-800"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {getStatusIcon()}
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            Execution {status}
                            {status === 'running' && <span className="text-xs font-normal text-gray-500">({Math.round(progress)}%)</span>}
                        </span>
                        {currentNodeId && status === 'running' && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Processing node: {currentNodeId}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-100 dark:bg-gray-800 w-full">
                <motion.div
                    className={cn("h-full transition-all duration-300",
                        status === 'failed' ? 'bg-red-500' :
                            status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Expanded Content (Logs) */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-gray-950 font-mono text-xs text-gray-300">
                            <div
                                ref={scrollRef}
                                className="h-48 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pr-2"
                            >
                                {logs.length === 0 ? (
                                    <span className="text-gray-600 italic">Waiting for logs...</span>
                                ) : (
                                    logs.map((log, i) => (
                                        <div key={i} className="break-words border-l-2 border-gray-800 pl-2 py-0.5 hover:bg-gray-900/50 transition-colors">
                                            <span className="text-gray-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
