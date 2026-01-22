'use client';

/**
 * BatchCopyQueue Component
 * Feature 028 T017: Display queue of copies for batch image generation
 *
 * Shows the list of documents/copies being processed for batch image generation.
 * Displays status (pending, generating, complete, error) for each item.
 */

import { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  X,
  Image as ImageIcon,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BatchCopyItem } from '@/types/agency-studio';

interface BatchCopyQueueProps {
  /** Queue of copies to generate images for */
  items: BatchCopyItem[];
  /** Currently active item being generated */
  activeItemId?: string;
  /** Remove item from queue */
  onRemoveItem?: (itemId: string) => void;
  /** Clear entire queue */
  onClearQueue?: () => void;
  /** Called when user clicks on an item to preview */
  onSelectItem?: (item: BatchCopyItem) => void;
  /** Overall progress (0-100) */
  progress?: number;
  /** Whether batch generation is in progress */
  isGenerating?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    label: 'Aguardando',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  generating: {
    icon: Loader2,
    label: 'Gerando...',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  complete: {
    icon: CheckCircle2,
    label: 'Concluído',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  error: {
    icon: AlertCircle,
    label: 'Erro',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
};

function BatchCopyQueueItem({
  item,
  isActive,
  onRemove,
  onSelect,
  compact,
}: {
  item: BatchCopyItem;
  isActive: boolean;
  onRemove?: () => void;
  onSelect?: () => void;
  compact?: boolean;
}) {
  const config = STATUS_CONFIG[item.status];
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border transition-all',
        'hover:bg-accent/50 cursor-pointer',
        isActive && 'ring-2 ring-primary border-primary bg-primary/5',
        item.status === 'error' && 'border-destructive/50'
      )}
      onClick={onSelect}
    >
      {/* Status Icon */}
      <div className={cn('rounded-full p-2', config.bgColor)}>
        <StatusIcon
          className={cn(
            'h-4 w-4',
            config.color,
            item.status === 'generating' && 'animate-spin'
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <h4 className="font-medium text-sm truncate">{item.title}</h4>
        </div>

        {!compact && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {item.content.substring(0, 100)}
            {item.content.length > 100 && '...'}
          </p>
        )}

        {/* Generated images count or error */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className={cn('text-xs', config.bgColor, config.color)}>
            {config.label}
          </Badge>

          {item.generatedImages && item.generatedImages.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <ImageIcon className="h-3 w-3" />
              {item.generatedImages.length} imagens
            </Badge>
          )}

          {item.error && (
            <span className="text-xs text-destructive truncate">{item.error}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.status === 'pending' && onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {onSelect && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export function BatchCopyQueue({
  items,
  activeItemId,
  onRemoveItem,
  onClearQueue,
  onSelectItem,
  progress = 0,
  isGenerating = false,
  compact = false,
}: BatchCopyQueueProps) {
  const completedCount = items.filter((i) => i.status === 'complete').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fila de Copies
            <Badge variant="secondary" className="ml-1">
              {items.length}
            </Badge>
          </CardTitle>
          {!isGenerating && items.length > 0 && onClearQueue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearQueue}
              className="text-muted-foreground hover:text-destructive h-8"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {isGenerating && (
          <div className="mt-3 space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {completedCount} de {items.length} concluídos
              </span>
              {errorCount > 0 && (
                <span className="text-destructive">{errorCount} erros</span>
              )}
            </div>
          </div>
        )}

        {/* Summary when not generating */}
        {!isGenerating && completedCount > 0 && (
          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {completedCount} concluídos
            </span>
            {pendingCount > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {pendingCount} pendentes
              </span>
            )}
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errorCount} erros
              </span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className={cn(compact ? 'h-[200px]' : 'h-[300px]')}>
          <div className="space-y-2 pr-3">
            {items.map((item) => (
              <BatchCopyQueueItem
                key={item.id}
                item={item}
                isActive={item.id === activeItemId}
                onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
                onSelect={onSelectItem ? () => onSelectItem(item) : undefined}
                compact={compact}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default BatchCopyQueue;
