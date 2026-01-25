'use client';

/**
 * VariationsSelector Component
 * Feature 029: fal.ai Migration
 *
 * Simple 4-button selector for choosing number of images to generate (1-4).
 */

import { cn } from '@/lib/utils';

interface VariationsSelectorProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export function VariationsSelector({
  value,
  onChange,
  max = 4,
  disabled = false,
  className,
}: VariationsSelectorProps) {
  const options = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Variações
      </label>
      <div className="flex gap-1">
        {options.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            disabled={disabled}
            className={cn(
              'flex-1 h-9 rounded-lg font-medium text-sm transition-all',
              'border',
              value === num
                ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                : 'bg-white/50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-600',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
}

export default VariationsSelector;
