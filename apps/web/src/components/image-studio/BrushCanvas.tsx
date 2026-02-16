import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { cn } from '@/lib/utils';
import type { BrushMode, MaskData } from '@/hooks/useBrushCanvas';

const MASK_COLOR = 'rgba(255, 0, 0, 0.5)';
const ERASE_COMPOSITE = 'destination-out';

interface BrushCanvasProps {
  imageUrl: string;
  width: number;
  height: number;
  brushSize: number;
  brushMode: BrushMode;
  opacity?: number;
  isDrawing: boolean;
  onDrawingChange: (drawing: boolean) => void;
  onMaskChange?: () => void;
  onHistoryCapture?: () => void;
  className?: string;
  disabled?: boolean;
}

export interface BrushCanvasRef {
  exportMask: (targetWidth: number, targetHeight: number) => MaskData;
  clear: () => void;
  getImageData: () => ImageData | null;
  setImageData: (data: ImageData) => void;
  hasPaint: () => boolean;
}

export const BrushCanvas = forwardRef<BrushCanvasRef, BrushCanvasProps>(
  function BrushCanvas(
    {
      imageUrl,
      width,
      height,
      brushSize,
      brushMode,
      opacity = 1,
      isDrawing,
      onDrawingChange,
      onMaskChange,
      onHistoryCapture,
      className,
      disabled = false,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const pendingDrawsRef = useRef<{ x: number; y: number }[]>([]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctxRef.current = ctx;
      canvas.width = width;
      canvas.height = height;
    }, [width, height]);

    const exportMask = useCallback(
      (tw: number, th: number): MaskData => {
        const canvas = canvasRef.current;
        if (!canvas) return { dataUrl: '', width: tw, height: th };

        const mc = document.createElement('canvas');
        mc.width = tw;
        mc.height = th;
        const mctx = mc.getContext('2d')!;
        mctx.fillStyle = '#000';
        mctx.fillRect(0, 0, tw, th);

        const sd = canvas
          .getContext('2d')!
          .getImageData(0, 0, canvas.width, canvas.height);
        const md = mctx.getImageData(0, 0, tw, th);
        const sx = canvas.width / tw;
        const sy = canvas.height / th;

        for (let y = 0; y < th; y++) {
          for (let x = 0; x < tw; x++) {
            const si =
              (Math.floor(y * sy) * canvas.width + Math.floor(x * sx)) * 4;
            if (sd.data[si + 3] > 0) {
              const di = (y * tw + x) * 4;
              md.data[di] =
                md.data[di + 1] =
                md.data[di + 2] =
                md.data[di + 3] =
                  255;
            }
          }
        }

        mctx.putImageData(md, 0, 0);
        return { dataUrl: mc.toDataURL('image/png'), width: tw, height: th };
      },
      []
    );

    const clear = useCallback(() => {
      const ctx = ctxRef.current;
      const c = canvasRef.current;
      if (ctx && c) ctx.clearRect(0, 0, c.width, c.height);
    }, []);

    const getImageData = useCallback(() => {
      const ctx = ctxRef.current;
      const c = canvasRef.current;
      return ctx && c ? ctx.getImageData(0, 0, c.width, c.height) : null;
    }, []);

    const setImageData = useCallback((data: ImageData) => {
      const ctx = ctxRef.current;
      const c = canvasRef.current;
      if (ctx && c) {
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.putImageData(data, 0, 0);
      }
    }, []);

    const hasPaint = useCallback(() => {
      const ctx = ctxRef.current;
      const c = canvasRef.current;
      if (!ctx || !c) return false;
      const d = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 3; i < d.data.length; i += 4) {
        if (d.data[i] > 0) return true;
      }
      return false;
    }, []);

    useImperativeHandle(
      ref,
      () => ({ exportMask, clear, getImageData, setImageData, hasPaint }),
      [exportMask, clear, getImageData, setImageData, hasPaint]
    );

    const drawAt = useCallback(
      (x: number, y: number, lx?: number, ly?: number) => {
        const ctx = ctxRef.current;
        if (!ctx) return;

        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = brushSize;

        if (brushMode === 'eraser') {
          ctx.globalCompositeOperation = ERASE_COMPOSITE;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = MASK_COLOR;
          ctx.globalAlpha = opacity;
        }

        if (lx !== undefined && ly !== undefined) {
          ctx.moveTo(lx, ly);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      },
      [brushSize, brushMode, opacity]
    );

    const processPendingDraws = useCallback(() => {
      const draws = pendingDrawsRef.current;
      if (draws.length === 0) return;

      let lp = lastPosRef.current;
      for (const pos of draws) {
        drawAt(pos.x, pos.y, lp?.x, lp?.y);
        lp = pos;
      }
      lastPosRef.current = lp;
      pendingDrawsRef.current = [];
      onMaskChange?.();
    }, [drawAt, onMaskChange]);

    const scheduleDraw = useCallback(
      (x: number, y: number) => {
        pendingDrawsRef.current.push({ x, y });
        if (animationFrameRef.current === null) {
          animationFrameRef.current = requestAnimationFrame(() => {
            processPendingDraws();
            animationFrameRef.current = null;
          });
        }
      },
      [processPendingDraws]
    );

    const getPosition = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        const c = canvasRef.current;
        if (!c) return null;
        const r = c.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) * (c.width / r.width),
          y: (e.clientY - r.top) * (c.height / r.height),
        };
      },
      []
    );

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (disabled) return;
        const pos = getPosition(e);
        if (!pos) return;

        onHistoryCapture?.();
        onDrawingChange(true);
        lastPosRef.current = null;
        scheduleDraw(pos.x, pos.y);
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      },
      [disabled, getPosition, onDrawingChange, scheduleDraw, onHistoryCapture]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing || disabled) return;
        const pos = getPosition(e);
        if (pos) scheduleDraw(pos.x, pos.y);
      },
      [isDrawing, disabled, getPosition, scheduleDraw]
    );

    const handlePointerUp = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        onDrawingChange(false);
        lastPosRef.current = null;
        (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);

        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
          processPendingDraws();
        }
      },
      [isDrawing, onDrawingChange, processPendingDraws]
    );

    useEffect(() => {
      return () => {
        if (animationFrameRef.current !== null)
          cancelAnimationFrame(animationFrameRef.current);
      };
    }, []);

    return (
      <div
        className={cn('relative overflow-hidden rounded-lg', className)}
        style={{ width, height }}
      >
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <img
            src={imageUrl}
            alt="Image to edit"
            className="w-full h-full object-contain"
          />
        </div>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            'absolute inset-0 w-full h-full',
            disabled ? 'cursor-not-allowed' : 'cursor-crosshair',
            'touch-none'
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    );
  }
);
