'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Brain, Search, Trash2, X, Filter } from 'lucide-react';
import { memoryKeys } from '@/lib/query-keys';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { MemoryCard } from './MemoryCard';
import { MemoryEmptyState } from './MemoryEmptyState';
import {
  useMemories,
  useUpdateMemory,
  useDeleteMemory,
  useDeleteAllMemories,
  useSearchMemories,
} from '@/hooks/use-memories';
import { MemoryCategory, MEMORY_CATEGORY_OPTIONS } from '@/types/memory';
import { useDebounce } from '@/hooks/use-debounce';

interface MemoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function MemoryDrawer({ open, onOpenChange, projectId }: MemoryDrawerProps) {
  const t = useTranslations('memory');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<MemoryCategory | 'all'>('all');
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Invalidate cache when drawer opens to fetch fresh data
  useEffect(() => {
    if (open && projectId) {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all(projectId) });
    }
  }, [open, projectId, queryClient]);

  // Queries and mutations
  const {
    data: memoriesData,
    isLoading,
    isFetching,
  } = useMemories(projectId, {
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });

  const updateMutation = useUpdateMemory(projectId);
  const deleteMutation = useDeleteMemory(projectId);
  const deleteAllMutation = useDeleteAllMemories(projectId);
  const searchMutation = useSearchMemories(projectId);

  // Handle search
  const filteredMemories = useMemo(() => {
    if (!memoriesData?.memories) return [];

    // If we have a search query and search results, use those
    if (debouncedSearch && searchMutation.data?.memories) {
      return searchMutation.data.memories;
    }

    // Otherwise filter locally
    if (!debouncedSearch) return memoriesData.memories;

    return memoriesData.memories.filter((memory) =>
      memory.content.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [memoriesData?.memories, debouncedSearch, searchMutation.data]);

  // Trigger semantic search when query changes
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (value.trim().length >= 3) {
        searchMutation.mutate({
          query: value,
          limit: 20,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
        });
      }
    },
    [categoryFilter, searchMutation]
  );

  const handleUpdate = useCallback(
    (memoryId: string, data: { content?: string; category?: MemoryCategory }) => {
      updateMutation.mutate({ memoryId, data });
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    (memoryId: string) => {
      deleteMutation.mutate(memoryId);
    },
    [deleteMutation]
  );

  const handleDeleteAll = useCallback(() => {
    deleteAllMutation.mutate();
    setShowDeleteAllDialog(false);
  }, [deleteAllMutation]);

  const memoryCount = memoriesData?.total ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader className="space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {t('title')}
            {memoryCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({memoryCount})
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            {t('description')}
          </SheetDescription>
        </SheetHeader>

        {/* Search and Filter */}
        <div className="flex flex-col gap-3 py-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as MemoryCategory | 'all')}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('allCategories')}
                </SelectItem>
                {MEMORY_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span>{option.icon}</span>
                      <span>{t(`categories.${option.value}`)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border/50 p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : filteredMemories.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('noSearchResults')}
              </div>
            ) : (
              <MemoryEmptyState />
            )
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  isUpdating={updateMutation.isPending}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </AnimatePresence>
          )}

          {isFetching && !isLoading && (
            <div className="text-center text-sm text-muted-foreground py-2">
              {t('updating')}
            </div>
          )}
        </div>

        {/* Footer with Delete All */}
        {memoryCount > 0 && (
          <div className="border-t pt-4">
            <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('deleteAllCount', { count: memoryCount })}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('deleteAllTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('deleteAllDescription', { count: memoryCount })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {tCommon('cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    disabled={deleteAllMutation.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteAllMutation.isPending
                      ? t('deleting')
                      : t('deleteAll')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
