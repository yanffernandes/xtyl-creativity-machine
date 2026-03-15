
/**
 * BrushCanvas Component
 * Feature 029: fal.ai Migration - Mask/Brush Editing
 *
 * HTML5 Canvas for drawing masks over images.
 * Supports brush and eraser modes with 60fps performance target.
 *
 * Mask overlay color: Red (50% opacity) - industry standard
 */

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { BrushMode, MaskData } from '@/hooks/useBrushCanvas';

// Mask overlay color: Red with 50% opacity (industry standard as per FR-033)
const MASK_COLOR = 'rgba(255, 0, 0, 0.5)';
const ERASE_COMPOSITE = 'destination-out';

interface BrushCanvasProps {
  /** Image URL to display as background */
  imageUrl: string;
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Brush size in pixels */
  brushSize: number;
  /** Brush mode */
  brushMode: BrushMode;
  /** Brush opacity (0-1) */
  opacity?: number;
  /** Is drawing in progress */
  isDrawing: boolean;
  /** Callback when drawing state changes */
  onDrawingChange: (drawing: boolean) => void;
  /** Callback when mask changes (for history tracking) */
  onMaskChange?: () => void;
  /** Callback to get image data for history */
  onHistoryCapture?: () => void;
  /** Additional class names */
  className?: string;
  /** Whether canvas is disabled */
  disabled?: boolean;
}

export interface BrushCanvasRef {
  /** Export the current mask */
  exportMask: (targetWidth: number, targetHeight: number) => MaskData;
  /** Clear the canvas */
  clear: () => void;
  /** Get current image data */
  getImageData: () => ImageData | null;
  /** Set image data (for undo/redo) */
  setImageData: (data: ImageData) => void;
  /** Check if canvas has any paint */
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
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const lastPosRef = useRef<{ x: number; y: number } | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const pendingDrawsRef = useRef<{ x: number; y: number }[]>([]);
    const [imageLoaded, setImageLoaded] = useState(false);

    // Initialize canvas context
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      ctxRef.current = ctx;

      // Set initial canvas size
      canvas.width = width;
      canvas.height = height;
    }, [width, height]);

    // Export mask function
    const exportMask = useCallback((targetWidth: number, targetHeight: number): MaskData => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return { dataUrl: '', width: targetWidth, height: targetHeight };
      }

      // Create a temporary canvas for the mask
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = targetWidth;
      maskCanvas.height = targetHeight;
      const maskCtx = maskCanvas.getContext('2d')!;

      // Fill with black (preserve areas)
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, targetWidth, targetHeight);

      // Get the drawing from the source canvas
      const sourceCtx = canvas.getContext('2d')!;
      const sourceData = sourceCtx.getImageData(0, 0, canvas.width, canvas.height);

      // Create mask data
      const maskImageData = maskCtx.getImageData(0, 0, targetWidth, targetHeight);

      // Scale and convert: any painted pixel (with alpha > 0) becomes white
      const scaleX = canvas.width / targetWidth;
      const scaleY = canvas.height / targetHeight;

      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
          // Sample from source canvas (with scaling)
          const srcX = Math.floor(x * scaleX);
          const srcY = Math.floor(y * scaleY);
          const srcIndex = (srcY * canvas.width + srcX) * 4;

          // Check if pixel has alpha (was painted)
          const alpha = sourceData.data[srcIndex + 3];

          if (alpha > 0) {
            // Painted area = white (edit area)
            const dstIndex = (y * targetWidth + x) * 4;
            maskImageData.data[dstIndex] = 255;     // R
            maskImageData.data[dstIndex + 1] = 255; // G
            maskImageData.data[dstIndex + 2] = 255; // B
            maskImageData.data[dstIndex + 3] = 255; // A
          }
        }
      }

      maskCtx.putImageData(maskImageData, 0, 0);

      return {
        dataUrl: maskCanvas.toDataURL('image/png'),
        width: targetWidth,
        height: targetHeight,
      };
    }, []);

    // Clear canvas
    const clear = useCallback(() => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    // Get current image data
    const getImageData = useCallback((): ImageData | null => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return null;

      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }, []);

    // Set image data (for undo/redo)
    const setImageData = useCallback((data: ImageData) => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(data, 0, 0);
    }, []);

    // Check if canvas has any paint
    const hasPaint = useCallback((): boolean => {
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return false;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Check if any pixel has alpha > 0
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) return true;
      }
      return false;
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      exportMask,
      clear,
      getImageData,
      setImageData,
      hasPaint,
    }), [exportMask, clear, getImageData, setImageData, hasPaint]);

    // Draw at a specific position
    const drawAt = useCallback((x: number, y: number, lastX?: number, lastY?: number) => {
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

      if (lastX !== undefined && lastY !== undefined) {
        // Draw line from last position to current
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        // Draw a single point
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }, [brushSize, brushMode, opacity]);

    // Process pending draws using requestAnimationFrame for 60fps
    const processPendingDraws = useCallback(() => {
      const draws = pendingDrawsRef.current;
      if (draws.length === 0) return;

      // Draw all pending points
      let lastPos = lastPosRef.current;
      for (const pos of draws) {
        drawAt(pos.x, pos.y, lastPos?.x, lastPos?.y);
        lastPos = pos;
      }
      lastPosRef.current = lastPos;
      pendingDrawsRef.current = [];

      // Notify mask changed
      onMaskChange?.();
    }, [drawAt, onMaskChange]);

    // Schedule draw using requestAnimationFrame
    const scheduleDraw = useCallback((x: number, y: number) => {
      pendingDrawsRef.current.push({ x, y });

      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(() => {
          processPendingDraws();
          animationFrameRef.current = null;
        });
      }
    }, [processPendingDraws]);

    // Get position from event
    const getPosition = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }, []);

    // Handle pointer down
    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;

      const pos = getPosition(e);
      if (!pos) return;

      // Capture history before starting to draw
      onHistoryCapture?.();

      onDrawingChange(true);
      lastPosRef.current = null;
      scheduleDraw(pos.x, pos.y);

      // Capture pointer for smoother drawing
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    }, [disabled, getPosition, onDrawingChange, scheduleDraw, onHistoryCapture]);

    // Handle pointer move
    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || disabled) return;

      const pos = getPosition(e);
      if (!pos) return;

      scheduleDraw(pos.x, pos.y);
    }, [isDrawing, disabled, getPosition, scheduleDraw]);

    // Handle pointer up
    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      onDrawingChange(false);
      lastPosRef.current = null;

      // Release pointer capture
      (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);

      // Cancel any pending animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        processPendingDraws();
      }
    }, [isDrawing, onDrawingChange, processPendingDraws]);

    // Handle pointer leave
    const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;

      onDrawingChange(false);
      lastPosRef.current = null;

      // Cancel any pending animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        processPendingDraws();
      }
    }, [isDrawing, onDrawingChange, processPendingDraws]);

    // Cleanup animation frame on unmount
    useEffect(() => {
      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={cn('relative overflow-hidden rounded-lg', className)}
        style={{ width, height }}
      >
        {/* Background image - Using Next.js Image to avoid CORS issues */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <Image
            src={imageUrl}
            alt="Image to edit"
            fill
            className="object-contain"
            onLoad={() => setImageLoaded(true)}
            priority
            unoptimized // Don't optimize to preserve exact pixels for mask
          />
        </div>

        {/* Drawing canvas overlay */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            'absolute inset-0 w-full h-full',
            disabled ? 'cursor-not-allowed' : 'cursor-crosshair',
            'touch-none' // Prevent touch scrolling
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          style={{
            // Custom cursor showing brush size
            cursor: disabled ? 'not-allowed' : 'crosshair',
          }}
        />
      </div>
    );
  }
);

export default BrushCanvas;
