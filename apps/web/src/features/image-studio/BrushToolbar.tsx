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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import type { BrushMode } from '@/hooks/useBrushCanvas';

interface BrushToolbarProps {
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  brushMode: BrushMode;
  onBrushModeChange: (mode: BrushMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  disabled?: boolean;
  className?: string;
}

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
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-xl shadow-lg',
        className
      )}
    >
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
                brushMode === 'brush' &&
                  'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              <Paintbrush className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Pincel (B)</TooltipContent>
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
                brushMode === 'eraser' &&
                  'bg-blue-500 hover:bg-blue-600 text-white'
              )}
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Borracha (E)</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBrushSizeChange(Math.max(5, brushSize - 5))}
          disabled={disabled || brushSize <= 5}
          className="h-8 w-8 p-0"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="w-24">
          <Slider
            value={[brushSize]}
            min={5}
            max={50}
            step={1}
            onValueChange={([v]: number[]) => onBrushSizeChange(v)}
            disabled={disabled}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onBrushSizeChange(Math.min(50, brushSize + 5))}
          disabled={disabled || brushSize >= 50}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>

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
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={disabled || !canUndo}
          className="h-8 w-8 p-0"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={disabled || !canRedo}
          className="h-8 w-8 p-0"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        disabled={disabled}
        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
