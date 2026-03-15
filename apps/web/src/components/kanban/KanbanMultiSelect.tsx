
/**
 * KanbanMultiSelect Component
 * Feature 028: Agency Studio Flow (T014)
 *
 * Provides multi-selection functionality for Kanban cards.
 * Supports Shift+click for range selection and Ctrl/Cmd+click for individual toggle.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  content?: string;
  status: string;
}

interface MultiSelectContextType {
  selectedIds: Set<string>;
  isMultiSelectMode: boolean;
  lastSelectedId: string | null;
  toggleSelection: (id: string, shiftKey?: boolean, allIds?: string[]) => void;
  selectRange: (startId: string, endId: string, allIds: string[]) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
  enterMultiSelectMode: () => void;
  exitMultiSelectMode: () => void;
}

const MultiSelectContext = createContext<MultiSelectContextType | null>(null);

export function useMultiSelect() {
  const context = useContext(MultiSelectContext);
  if (!context) {
    throw new Error('useMultiSelect must be used within a MultiSelectProvider');
  }
  return context;
}

interface MultiSelectProviderProps {
  children: ReactNode;
}

export function MultiSelectProvider({ children }: MultiSelectProviderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const toggleSelection = useCallback(
    (id: string, shiftKey = false, allIds: string[] = []) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);

        if (shiftKey && lastSelectedId && allIds.length > 0) {
          // Range selection
          const startIdx = allIds.indexOf(lastSelectedId);
          const endIdx = allIds.indexOf(id);
          if (startIdx !== -1 && endIdx !== -1) {
            const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
            for (let i = from; i <= to; i++) {
              newSet.add(allIds[i]);
            }
          }
        } else {
          // Toggle individual selection
          if (newSet.has(id)) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
        }

        // Auto-enter multi-select mode when selecting
        if (newSet.size > 0) {
          setIsMultiSelectMode(true);
        }

        return newSet;
      });
      setLastSelectedId(id);
    },
    [lastSelectedId]
  );

  const selectRange = useCallback((startId: string, endId: string, allIds: string[]) => {
    const startIdx = allIds.indexOf(startId);
    const endIdx = allIds.indexOf(endId);
    if (startIdx === -1 || endIdx === -1) return;

    const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const newSet = new Set<string>();
    for (let i = from; i <= to; i++) {
      newSet.add(allIds[i]);
    }
    setSelectedIds(newSet);
    setIsMultiSelectMode(true);
    setLastSelectedId(endId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setIsMultiSelectMode(true);
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const enterMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(true);
  }, []);

  const exitMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(false);
    clearSelection();
  }, [clearSelection]);

  return (
    <MultiSelectContext.Provider
      value={{
        selectedIds,
        isMultiSelectMode,
        lastSelectedId,
        toggleSelection,
        selectRange,
        clearSelection,
        selectAll,
        isSelected,
        enterMultiSelectMode,
        exitMultiSelectMode,
      }}
    >
      {children}
    </MultiSelectContext.Provider>
  );
}

/**
 * Floating action bar that appears when items are selected
 */
interface MultiSelectActionBarProps {
  documents: Document[];
  workspaceId: string;
  projectId: string;
  className?: string;
}

export function MultiSelectActionBar({
  documents,
  workspaceId,
  projectId,
  className,
}: MultiSelectActionBarProps) {
  const router = useRouter();
  const { selectedIds, clearSelection, exitMultiSelectMode } = useMultiSelect();

  const selectedCount = selectedIds.size;
  const selectedDocs = documents.filter((doc) => selectedIds.has(doc.id));

  const handleGenerateImages = () => {
    // Navigate to Studio with selected document IDs
    const docIds = Array.from(selectedIds).join(',');
    router.push(
      `/workspace/${workspaceId}/project/${projectId}/studio?copies=${docIds}`
    );
  };

  const handleCancel = () => {
    exitMultiSelectMode();
  };

  // Feature 028 T074: Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to cancel multi-select
      if (e.key === 'Escape' && selectedCount > 0) {
        e.preventDefault();
        exitMultiSelectMode();
      }
      // Enter to confirm and navigate to Studio
      if (e.key === 'Enter' && selectedCount > 0 && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        e.preventDefault();
        handleGenerateImages();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCount, exitMultiSelectMode]);

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'bg-background/95 backdrop-blur-xl',
            'border border-border shadow-2xl rounded-2xl',
            'px-4 py-3 flex items-center gap-4',
            className
          )}
        >
          {/* Selection count */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Preview of selected titles */}
          <div className="hidden md:flex items-center gap-1 max-w-[300px]">
            {selectedDocs.slice(0, 2).map((doc) => (
              <span
                key={doc.id}
                className="text-xs text-muted-foreground truncate max-w-[100px]"
              >
                {doc.title}
              </span>
            ))}
            {selectedDocs.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{selectedDocs.length - 2}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleGenerateImages}
              className="gap-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Sparkles className="h-4 w-4" />
              Gerar Imagens
            </Button>

            <Button variant="ghost" size="icon" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MultiSelectProvider;
