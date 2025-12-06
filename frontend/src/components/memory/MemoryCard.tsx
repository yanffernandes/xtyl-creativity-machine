'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, Check, X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserMemory, MemoryCategory, MEMORY_CATEGORIES, MEMORY_CATEGORY_OPTIONS } from '@/types/memory';
import { useLocale } from '@/hooks/use-locale';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';

interface MemoryCardProps {
  memory: UserMemory;
  onUpdate: (memoryId: string, data: { content?: string; category?: MemoryCategory }) => void;
  onDelete: (memoryId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function MemoryCard({
  memory,
  onUpdate,
  onDelete,
  isUpdating = false,
  isDeleting = false,
}: MemoryCardProps) {
  const t = useTranslations('memory');
  const tCommon = useTranslations('common');
  const { locale } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editContent, setEditContent] = useState(memory.content);
  const [editCategory, setEditCategory] = useState<MemoryCategory>(memory.category);

  const categoryMeta = MEMORY_CATEGORIES[memory.category];
  const dateLocale = locale === 'pt-BR' ? ptBR : enUS;

  const handleSave = () => {
    const changes: { content?: string; category?: MemoryCategory } = {};

    if (editContent !== memory.content) {
      changes.content = editContent;
    }
    if (editCategory !== memory.category) {
      changes.category = editCategory;
    }

    if (Object.keys(changes).length > 0) {
      onUpdate(memory.id, changes);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(memory.content);
    setEditCategory(memory.category);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(memory.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="group relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4 transition-all hover:border-border hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-xs font-medium">
                <span className="mr-1">{categoryMeta.icon}</span>
                {t(`categories.${memory.category}`)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(memory.updated_at), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </span>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[80px] resize-none text-sm"
                    placeholder={t('contentPlaceholder')}
                  />
                  <Select value={editCategory} onValueChange={(v) => setEditCategory(v as MemoryCategory)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isUpdating || !editContent.trim()}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t('save')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-1" />
                      {t('cancel')}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.p
                  key="viewing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-foreground leading-relaxed"
                >
                  {memory.content}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Actions Menu */}
          {!isEditing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('edit')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('deleteMemory')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteMemoryDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('deleting') : t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
