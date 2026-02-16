import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Clock,
  FileText,
  Code,
} from 'lucide-react';
import type { ExecutionStatus } from '@/hooks/useWorkflowExecution';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExecutionMonitorProps {
  status: ExecutionStatus;
  progress: number;
  logs: string[];
  outputs: Record<string, Record<string, unknown>>;
  currentNodeId: string | null;
  executionId: string | null;
  onClose?: () => void;
}

export default function ExecutionMonitor({
  status,
  progress,
  logs,
  outputs,
  currentNodeId,
  executionId: _executionId,
  onClose: _onClose,
}: ExecutionMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'outputs'>('logs');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  if (status === 'idle') return null;

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'paused':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Terminal className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50"
    >
      <div
        className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm cursor-pointer border-b border-gray-100 dark:border-gray-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Execution: {status}
              {status === 'running' && (
                <span className="text-xs font-normal text-gray-500">
                  ({Math.round(progress)}%)
                </span>
              )}
            </span>
            {currentNodeId && status === 'running' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Processing: {currentNodeId}
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </Button>
      </div>

      <div className="h-1 bg-gray-100 dark:bg-gray-800 w-full">
        <motion.div
          className={cn(
            'h-full transition-all duration-300',
            status === 'failed'
              ? 'bg-red-500'
              : status === 'completed'
                ? 'bg-green-500'
                : 'bg-blue-500',
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex border-b border-gray-800 bg-gray-900">
              <button
                onClick={() => setActiveTab('logs')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors',
                  activeTab === 'logs'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-500 hover:text-gray-300',
                )}
              >
                <Terminal className="w-3 h-3" />
                Logs
              </button>
              <button
                onClick={() => setActiveTab('outputs')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors',
                  activeTab === 'outputs'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-500 hover:text-gray-300',
                )}
              >
                <Code className="w-3 h-3" />
                Outputs
                {Object.keys(outputs).length > 0 && (
                  <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[10px]">
                    {Object.keys(outputs).length}
                  </span>
                )}
              </button>
            </div>

            <div className="p-4 bg-gray-950 font-mono text-xs text-gray-300">
              <div
                ref={scrollRef}
                className="h-48 overflow-y-auto space-y-1 pr-2"
              >
                {activeTab === 'logs' ? (
                  logs.length === 0 ? (
                    <span className="text-gray-600 italic">
                      Waiting for logs...
                    </span>
                  ) : (
                    logs.map((log, i) => (
                      <div
                        key={i}
                        className="break-words border-l-2 border-gray-800 pl-2 py-0.5 hover:bg-gray-900/50 transition-colors"
                      >
                        <span className="text-gray-500 mr-2">
                          [{new Date().toLocaleTimeString()}]
                        </span>
                        {log}
                      </div>
                    ))
                  )
                ) : Object.keys(outputs).length === 0 ? (
                  <span className="text-gray-600 italic">
                    No outputs yet...
                  </span>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(outputs).map(([nodeId, output]) => (
                      <div
                        key={nodeId}
                        className="border border-gray-800 rounded-lg overflow-hidden"
                      >
                        <div className="bg-gray-800/50 px-3 py-2 flex items-center gap-2">
                          <FileText className="w-3 h-3 text-blue-400" />
                          <span className="text-blue-400 font-medium">
                            {nodeId}
                          </span>
                        </div>
                        <div className="p-3 space-y-2">
                          {'content' in output && !!output.content && (
                            <div>
                              <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                                Content
                              </span>
                              <p className="mt-1 text-gray-200 whitespace-pre-wrap">
                                {String(output.content)}
                              </p>
                            </div>
                          )}
                          {'title' in output && !!output.title && (
                            <div>
                              <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                                Title:
                              </span>
                              <p className="mt-1 text-gray-200">
                                {String(output.title)}
                              </p>
                            </div>
                          )}
                          {'file_url' in output && !!output.file_url && (
                            <div>
                              <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                                Image
                              </span>
                              <img
                                src={String(output.file_url)}
                                alt={
                                  ('title' in output ? String(output.title) : '') || 'Generated image'
                                }
                                className="mt-1 max-w-full h-auto rounded border border-gray-700"
                              />
                            </div>
                          )}
                          {!('content' in output && output.content) &&
                            !('file_url' in output && output.file_url) && (
                              <pre className="text-gray-400 text-[10px] overflow-x-auto">
                                {JSON.stringify(output, null, 2)}
                              </pre>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
