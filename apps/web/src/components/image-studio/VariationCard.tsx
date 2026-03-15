'use client';

/**
 * VariationCard Component
 * Feature 027: Visual Generation Studio
 *
 * Displays a single generated image variation with
 * actions for expanding, downloading, and saving.
 */

import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Download,
  Expand,
  Check,
  AlertCircle,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { GeneratedImage } from '@/types/image-studio';

interface VariationCardProps {
  variation: GeneratedImage;
  index: number;
  isGenerating?: boolean;
  onExpand: (variation: GeneratedImage) => void;
  onAttach?: (variation: GeneratedImage) => void;
  canAttach?: boolean;
  className?: string;
}

/**
 * Feature 030: Memoized component to prevent unnecessary re-renders
 * Only re-renders when props actually change
 */
export const VariationCard = memo(function VariationCard({
  variation,
  index,
  isGenerating = false,
  onExpand,
  onAttach,
  canAttach = false,
  className,
}: VariationCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isAttached, setIsAttached] = useState(false);

  const handleAttach = async () => {
    if (!onAttach) return;
    setIsAttaching(true);
    try {
      await onAttach(variation);
      setIsAttached(true);
      setTimeout(() => setIsAttached(false), 2000);
    } finally {
      setIsAttaching(false);
    }
  };

  const handleDownload = async () => {
    if (!variation.file_url) return;

    try {
      const response = await fetch(variation.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = variation.title || `image-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  // Loading state
  if (isGenerating && !variation.success && !variation.error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'relative aspect-square rounded-xl overflow-hidden',
          'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900',
          'flex items-center justify-center',
          className
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-8 w-8 text-blue-500" />
          </motion.div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Gerando variação {index + 1}...
          </span>
        </div>

        {/* Progress shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    );
  }

  // Error state
  if (variation.error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'relative aspect-square rounded-xl overflow-hidden',
          'bg-red-50 dark:bg-red-900/20',
          'border border-red-200 dark:border-red-800',
          'flex items-center justify-center p-4',
          className
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">
            Falha na geração
          </span>
          <span className="text-xs text-red-500/70 line-clamp-2">
            {variation.error}
          </span>
        </div>
      </motion.div>
    );
  }

  // Success state
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative aspect-square rounded-xl overflow-hidden',
        'bg-gray-100 dark:bg-gray-800',
        'ring-1 ring-black/5 dark:ring-white/10',
        'cursor-pointer',
        className
      )}
    >
      {/* Image */}
      {variation.file_url && (
        <Image
          src={variation.thumbnail_url || variation.file_url}
          alt={variation.title || `Variation ${index + 1}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      )}

      {/* Overlay with actions */}
      <motion.div
        initial={false}
        animate={{ opacity: isHovered ? 1 : 0 }}
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
      >
        {/* Title */}
        {variation.title && (
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="text-sm font-medium text-white truncate">
              {variation.title}
            </p>
            {variation.modifier && (
              <p className="text-xs text-white/70 truncate">
                {variation.modifier}
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-black/30 hover:bg-black/50 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand(variation);
                }}
              >
                <Expand className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Expandir</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-black/30 hover:bg-black/50 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Baixar</TooltipContent>
          </Tooltip>

          {/* Attach to document button - only shows when canAttach is true */}
          {canAttach && onAttach && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 text-white',
                    isAttached
                      ? 'bg-blue-500/50 hover:bg-blue-500/70'
                      : 'bg-black/30 hover:bg-black/50'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAttach();
                  }}
                  disabled={isAttaching || isAttached}
                >
                  {isAttaching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isAttached ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isAttached ? 'Anexado!' : 'Anexar ao documento'}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

      </motion.div>

      {/* Variation index badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm">
        <span className="text-xs font-medium text-white">#{index + 1}</span>
      </div>
    </motion.div>
  );
});

export default VariationCard;
