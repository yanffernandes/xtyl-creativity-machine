'use client';

/**
 * BrushToolbar Component
 * Feature 029: fal.ai Migration - Mask/Brush Editing
 *
 * Toolbar for brush controls including:
 * - Brush size slider
 * - Brush/eraser toggle
 * - Undo/redo buttons
 * - Clear button
 * - Brush size preview
 */

import { motion } from 'framer-motion';
import {
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Minus,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import type { BrushMode } from '@/hooks/useBrushCanvas';

interface BrushToolbarProps {
  /** Current brush size */
  brushSize: number;
  /** Callback to update brush size */
  onBrushSizeChange: (size: number) => void;
  /** Current brush mode */
  brushMode: BrushMode;
  /** Callback to update brush mode */
  onBrushModeChange: (mode: BrushMode) => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Callback for undo action */
  onUndo: () => void;
  /** Callback for redo action */
  onRedo: () => void;
  /** Callback for clear action */
  onClear: () => void;
  /** Whether controls are disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

const MIN_BRUSH_SIZE = 5;
const MAX_BRUSH_SIZE = 50;
const BRUSH_STEP = 5;

export function BrushToolbar({
  brushSize,
  onBrushSizeChange,
  brushMode,
  onBrushModeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  disabled = false,
  className,
}: BrushToolbarProps) {
  // Increment/decrement brush size
  const incrementSize = () => {
    const newSize = Math.min(MAX_BRUSH_SIZE, brushSize + BRUSH_STEP);
    onBrushSizeChange(newSize);
  };

  const decrementSize = () => {
    const newSize = Math.max(MIN_BRUSH_SIZE, brushSize - BRUSH_STEP);
    onBrushSizeChange(newSize);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3',
        'bg-white/80 dark:bg-gray-900/80',
        'backdrop-blur-xl',
        'border border-gray-200/50 dark:border-gray-700/50',
        'rounded-xl',
        'shadow-lg shadow-black/5',
        className
      )}
    >
      {/* Brush/Eraser Toggle */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={brushMode === 'brush' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onBrushModeChange('brush')}
              disabled={disabled}
              className={cn(
                'h-8 w-8 p-0',
                brushMode === 'brush' && 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              <Paintbrush className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Pincel (B)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={brushMode === 'eraser' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onBrushModeChange('eraser')}
              disabled={disabled}
              className={cn(
                'h-8 w-8 p-0',
                brushMode === 'eraser' && 'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Borracha (E)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Brush Size Control */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={decrementSize}
              disabled={disabled || brushSize <= MIN_BRUSH_SIZE}
              className="h-8 w-8 p-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Diminuir tamanho ([ )</p>
          </TooltipContent>
        </Tooltip>

        {/* Brush size slider */}
        <div className="w-24 flex items-center gap-2">
          <Slider
            value={[brushSize]}
            min={MIN_BRUSH_SIZE}
            max={MAX_BRUSH_SIZE}
            step={1}
            onValueChange={([value]) => onBrushSizeChange(value)}
            disabled={disabled}
            className="flex-1"
          />
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={incrementSize}
              disabled={disabled || brushSize >= MAX_BRUSH_SIZE}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Aumentar tamanho (] )</p>
          </TooltipContent>
        </Tooltip>

        {/* Brush size preview */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-8 h-8">
              <motion.div
                className={cn(
                  'rounded-full',
                  brushMode === 'brush'
                    ? 'bg-red-500/50 border border-red-500'
                    : 'bg-white/50 border-2 border-dashed border-gray-400'
                )}
                animate={{
                  width: Math.min(32, Math.max(8, brushSize * 0.6)),
                  height: Math.min(32, Math.max(8, brushSize * 0.6)),
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{brushSize}px</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUndo}
              disabled={disabled || !canUndo}
              className="h-8 w-8 p-0"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Desfazer (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRedo}
              disabled={disabled || !canRedo}
              className="h-8 w-8 p-0"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Refazer (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Clear */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={disabled}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Limpar tudo</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default BrushToolbar;
