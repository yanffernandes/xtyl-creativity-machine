'use client';

/**
 * FormatSelector Component
 * Feature 027: Visual Generation Studio
 *
 * Visual aspect ratio selector with preview icons.
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FORMAT_OPTIONS, type FormatOption } from '@/types/image-studio';

interface FormatSelectorProps {
  value: FormatOption['id'];
  onChange: (value: FormatOption['id']) => void;
  disabled?: boolean;
  className?: string;
}

export function FormatSelector({
  value,
  onChange,
  disabled = false,
  className,
}: FormatSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Formato
      </label>

      <div className="flex flex-wrap gap-2">
        {FORMAT_OPTIONS.map((format) => (
          <FormatButton
            key={format.id}
            format={format}
            isSelected={value === format.id}
            onClick={() => onChange(format.id)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

interface FormatButtonProps {
  format: FormatOption;
  isSelected: boolean;
  onClick: () => void;
  disabled: boolean;
}

function FormatButton({ format, isSelected, onClick, disabled }: FormatButtonProps) {
  // Calculate preview dimensions (max 32px on longest side)
  const maxSize = 28;
  const aspectRatio = format.width / format.height;
  const previewWidth = aspectRatio >= 1 ? maxSize : maxSize * aspectRatio;
  const previewHeight = aspectRatio >= 1 ? maxSize / aspectRatio : maxSize;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg',
        'transition-all duration-200',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        isSelected && 'bg-blue-500/10 dark:bg-blue-500/20 ring-2 ring-blue-500/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
    >
      {/* Aspect ratio preview */}
      <div
        className={cn(
          'rounded-sm border-2 transition-colors',
          isSelected
            ? 'border-blue-500 bg-blue-500/20'
            : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800'
        )}
        style={{
          width: previewWidth,
          height: previewHeight,
        }}
      />

      {/* Label */}
      <span
        className={cn(
          'text-[10px] font-medium',
          isSelected
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400'
        )}
      >
        {format.label}
      </span>

      {/* Dimensions - always visible */}
      <span
        className={cn(
          'text-[9px] tabular-nums',
          isSelected
            ? 'text-blue-500/70 dark:text-blue-400/70'
            : 'text-gray-400 dark:text-gray-500'
        )}
      >
        {format.width}×{format.height}
      </span>
    </motion.button>
  );
}

export default FormatSelector;
