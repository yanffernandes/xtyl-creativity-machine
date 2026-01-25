'use client';

/**
 * DocumentFilters Component
 * Feature 028: Agency Studio Flow (T054, T055)
 *
 * Filter controls for document list/gallery by tags and channel.
 */

import { useState, useMemo, memo } from 'react';
import { Tag, Radio, X, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  tags?: string[];
  channel?: string;
}

interface DocumentFiltersProps {
  documents: Document[];
  selectedTags: string[];
  selectedChannel: string | null;
  onTagsChange: (tags: string[]) => void;
  onChannelChange: (channel: string | null) => void;
  className?: string;
}

// Predefined channel options
const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'email', label: 'Email Marketing' },
  { value: 'blog', label: 'Blog' },
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'other', label: 'Outro' },
];

/**
 * Feature 030: Memoized component to prevent unnecessary re-renders
 */
export const DocumentFilters = memo(function DocumentFilters({
  documents,
  selectedTags,
  selectedChannel,
  onTagsChange,
  onChannelChange,
  className,
}: DocumentFiltersProps) {
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // Extract all unique tags from documents
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    documents.forEach((doc) => {
      doc.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [documents]);

  // Extract all unique channels from documents
  const availableChannels = useMemo(() => {
    const channelSet = new Set<string>();
    documents.forEach((doc) => {
      if (doc.channel) {
        channelSet.add(doc.channel);
      }
    });
    return Array.from(channelSet).sort();
  }, [documents]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    onTagsChange([]);
    onChannelChange(null);
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedChannel !== null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Tag filter */}
      {availableTags.length > 0 && (
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'gap-2',
                selectedTags.length > 0 && 'border-primary'
              )}
            >
              <Tag className="h-4 w-4" />
              Tags
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium">Filtrar por tags</div>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => onTagsChange([])}
                >
                  Limpar tags
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Channel filter */}
      {availableChannels.length > 0 && (
        <Select
          value={selectedChannel || 'all'}
          onValueChange={(value) =>
            onChannelChange(value === 'all' ? null : value)
          }
        >
          <SelectTrigger
            className={cn(
              'w-[160px] h-9',
              selectedChannel && 'border-primary'
            )}
          >
            <Radio className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os canais</SelectItem>
            {CHANNEL_OPTIONS.filter((opt) =>
              availableChannels.includes(opt.value)
            ).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear all filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" />
          Limpar filtros
        </Button>
      )}

      {/* Show active filter count */}
      {hasActiveFilters && (
        <div className="text-xs text-muted-foreground">
          <Filter className="h-3 w-3 inline mr-1" />
          {selectedTags.length + (selectedChannel ? 1 : 0)} filtro(s) ativo(s)
        </div>
      )}
    </div>
  );
});

/**
 * Hook to filter documents by tags and channel
 */
export function useDocumentFilters<T extends Document>(documents: T[]) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Tag filter (AND logic: document must have ALL selected tags)
      if (selectedTags.length > 0) {
        if (!doc.tags || !selectedTags.every((tag) => doc.tags?.includes(tag))) {
          return false;
        }
      }

      // Channel filter
      if (selectedChannel && doc.channel !== selectedChannel) {
        return false;
      }

      return true;
    });
  }, [documents, selectedTags, selectedChannel]);

  return {
    filteredDocuments,
    selectedTags,
    selectedChannel,
    setSelectedTags,
    setSelectedChannel,
    hasActiveFilters: selectedTags.length > 0 || selectedChannel !== null,
  };
}

export default DocumentFilters;
