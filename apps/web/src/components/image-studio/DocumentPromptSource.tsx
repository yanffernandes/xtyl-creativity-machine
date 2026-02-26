'use client';

/**
 * DocumentPromptSource Component
 * Feature 027: Visual Generation Studio
 *
 * Allows selecting a text document to use as prompt source.
 * Can optionally use AI agent to generate creative prompt from document.
 */

import { useState } from 'react';
import { FileText, Sparkles, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Document } from '@/types/image-studio';

interface DocumentPromptSourceProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string | null) => void;
  onUseDocumentContent: (content: string) => void;
  useAgent: boolean;
  onToggleAgent: (value: boolean) => void;
  onGenerateCreativePrompt: () => void;
  isGeneratingPrompt?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DocumentPromptSource({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onUseDocumentContent,
  useAgent,
  onToggleAgent,
  onGenerateCreativePrompt,
  isGeneratingPrompt = false,
  disabled = false,
  className,
}: DocumentPromptSourceProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter to only text documents
  const textDocuments = documents.filter(doc => doc.media_type === 'text');
  const selectedDoc = textDocuments.find(d => d.id === selectedDocumentId);

  if (textDocuments.length === 0) {
    return null;
  }

  const handleDocumentSelect = (docId: string) => {
    if (docId === 'none') {
      onSelectDocument(null);
      return;
    }

    const doc = textDocuments.find(d => d.id === docId);
    if (doc) {
      onSelectDocument(doc.id);
      // If not using agent, directly use content
      if (!useAgent && doc.content) {
        onUseDocumentContent(doc.content);
      }
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
      >
        <FileText className="w-4 h-4" />
        Fonte do Prompt
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform',
          isExpanded && 'rotate-180'
        )} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {/* Document selector */}
            <Select
              value={selectedDocumentId || 'none'}
              onValueChange={handleDocumentSelect}
              disabled={disabled}
            >
              <SelectTrigger
                className={cn(
                  'w-full',
                  'bg-white/50 dark:bg-gray-900/50',
                  'border-gray-200/50 dark:border-gray-700/50',
                  'backdrop-blur-xl'
                )}
              >
                <SelectValue placeholder="Selecione um documento..." />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                <SelectItem value="none">
                  <span className="text-gray-500">Nenhum documento</span>
                </SelectItem>
                {textDocuments.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{doc.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Agent toggle */}
            {selectedDocumentId && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <Label htmlFor="use-agent" className="text-sm font-medium text-purple-700 dark:text-purple-300 cursor-pointer">
                      Usar IA para criar prompt criativo
                    </Label>
                  </div>
                  <Switch
                    id="use-agent"
                    checked={useAgent}
                    onCheckedChange={onToggleAgent}
                    disabled={disabled}
                  />
                </div>

                {/* Generate button */}
                {useAgent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onGenerateCreativePrompt}
                    disabled={disabled || isGeneratingPrompt || !selectedDocumentId}
                    className="w-full gap-2 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                  >
                    {isGeneratingPrompt ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="w-4 h-4" />
                        </motion.div>
                        Gerando prompt...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Gerar Prompt Criativo
                      </>
                    )}
                  </Button>
                )}

                {/* Selected document preview */}
                {selectedDoc && !useAgent && selectedDoc.content && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Conteúdo que será usado:
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                      {selectedDoc.content.substring(0, 200)}
                      {selectedDoc.content.length > 200 && '...'}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact indicator when collapsed but has selection */}
      {!isExpanded && selectedDocumentId && selectedDoc && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50">
          <FileText className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-blue-700 dark:text-blue-300 truncate flex-1">
            {selectedDoc.title}
          </span>
          {useAgent && (
            <Sparkles className="w-4 h-4 text-purple-500" />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectDocument(null);
            }}
            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded"
          >
            <X className="w-3 h-3 text-blue-500" />
          </button>
        </div>
      )}
    </div>
  );
}

export default DocumentPromptSource;
