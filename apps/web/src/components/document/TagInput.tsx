
/**
 * TagInput Component
 * Feature 028: Agency Studio Flow (T052)
 *
 * Input component for adding and managing document tags.
 * Supports keyboard navigation and visual tag display.
 */

import { useState, useCallback, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Adicionar tag...',
  maxTags = 10,
  disabled = false,
  className,
  compact = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim().toLowerCase();
      if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
        onChange([...tags, trimmedTag]);
        setInputValue('');
      }
    },
    [tags, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background',
        'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
        isFocused && 'ring-1 ring-ring border-ring',
        disabled && 'opacity-50 cursor-not-allowed',
        compact ? 'p-1' : 'p-2',
        className
      )}
    >
      <div className={cn('flex flex-wrap gap-1', compact ? '' : 'gap-2')}>
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className={cn(
              'flex items-center gap-1 pr-1',
              compact ? 'text-xs py-0' : 'py-0.5'
            )}
          >
            {tag}
            {!disabled && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'hover:bg-destructive/20 rounded-full',
                  compact ? 'h-3 w-3' : 'h-4 w-4'
                )}
                onClick={() => removeTag(tag)}
              >
                <X className={compact ? 'h-2 w-2' : 'h-3 w-3'} />
              </Button>
            )}
          </Badge>
        ))}

        {!disabled && tags.length < maxTags && (
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? placeholder : ''}
            className={cn(
              'flex-1 min-w-[100px] border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0',
              compact ? 'text-xs' : 'text-sm'
            )}
            disabled={disabled}
          />
        )}
      </div>

      {!disabled && tags.length >= maxTags && (
        <p className="text-xs text-muted-foreground mt-1">
          Limite de {maxTags} tags atingido
        </p>
      )}
    </div>
  );
}

/**
 * Read-only tag display for document cards
 */
interface TagDisplayProps {
  tags: string[];
  maxVisible?: number;
  className?: string;
}

export function TagDisplay({
  tags,
  maxVisible = 3,
  className,
}: TagDisplayProps) {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = tags.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="text-xs py-0 px-1.5 text-muted-foreground"
        >
          {tag}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className="text-xs py-0 px-1.5 text-muted-foreground"
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}

export default TagInput;
