'use client';

/**
 * useBrushCanvas Hook
 * Feature 029: fal.ai Migration - Mask/Brush Editing
 *
 * Manages canvas state for mask painting including:
 * - Drawing state (brush size, mode, opacity)
 * - History stack for undo/redo (max 20 states)
 * - Mask export functionality
 */

import { useState, useCallback, useRef } from 'react';

export type BrushMode = 'brush' | 'eraser';

export interface BrushSettings {
  size: number; // 5-50px
  opacity: number; // 0-1
  mode: BrushMode;
}

export interface MaskData {
  dataUrl: string; // Base64 PNG
  width: number;
  height: number;
}

export interface CanvasHistoryState {
  imageData: ImageData;
  timestamp: number;
}

interface UseBrushCanvasOptions {
  maxHistorySize?: number;
  defaultBrushSize?: number;
  defaultOpacity?: number;
}

interface UseBrushCanvasReturn {
  // Brush settings
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushMode: BrushMode;
  setBrushMode: (mode: BrushMode) => void;
  opacity: number;
  setOpacity: (opacity: number) => void;

  // Drawing state
  isDrawing: boolean;
  setIsDrawing: (drawing: boolean) => void;

  // History management
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: (imageData: ImageData) => void;
  undo: () => ImageData | null;
  redo: () => ImageData | null;
  clearHistory: () => void;

  // Mask operations
  hasMask: boolean;
  setHasMask: (has: boolean) => void;
  exportMask: (canvas: HTMLCanvasElement, width: number, height: number) => MaskData;

  // Clear
  clear: () => void;
}

const MAX_HISTORY_SIZE = 20;
const MIN_BRUSH_SIZE = 5;
const MAX_BRUSH_SIZE = 50;
const DEFAULT_BRUSH_SIZE = 20;
const DEFAULT_OPACITY = 1;

export function useBrushCanvas({
  maxHistorySize = MAX_HISTORY_SIZE,
  defaultBrushSize = DEFAULT_BRUSH_SIZE,
  defaultOpacity = DEFAULT_OPACITY,
}: UseBrushCanvasOptions = {}): UseBrushCanvasReturn {
  // Brush settings
  const [brushSize, setBrushSizeState] = useState(defaultBrushSize);
  const [brushMode, setBrushMode] = useState<BrushMode>('brush');
  const [opacity, setOpacity] = useState(defaultOpacity);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);

  // History management
  const historyRef = useRef<CanvasHistoryState[]>([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Clamp brush size within bounds
  const setBrushSize = useCallback((size: number) => {
    const clampedSize = Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, size));
    setBrushSizeState(clampedSize);
  }, []);

  // Push state to history
  const pushHistory = useCallback((imageData: ImageData) => {
    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;

    // Remove any redo states beyond current index
    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }

    // Add new state
    history.push({
      imageData: new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      ),
      timestamp: Date.now(),
    });

    // Trim history if too large
    while (history.length > maxHistorySize) {
      history.shift();
    }

    historyIndexRef.current = history.length - 1;

    // Update can undo/redo states
    setCanUndo(history.length > 1);
    setCanRedo(false);
  }, [maxHistorySize]);

  // Undo
  const undo = useCallback((): ImageData | null => {
    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex <= 0) {
      return null;
    }

    historyIndexRef.current = currentIndex - 1;
    const state = history[historyIndexRef.current];

    // Update can undo/redo states
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);

    return state.imageData;
  }, []);

  // Redo
  const redo = useCallback((): ImageData | null => {
    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex >= history.length - 1) {
      return null;
    }

    historyIndexRef.current = currentIndex + 1;
    const state = history[historyIndexRef.current];

    // Update can undo/redo states
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < history.length - 1);

    return state.imageData;
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  // Export mask as PNG with white/black color scheme
  // White = areas to edit (painted), Black = areas to preserve
  const exportMask = useCallback((
    canvas: HTMLCanvasElement,
    width: number,
    height: number
  ): MaskData => {
    // Create a temporary canvas for the mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d')!;

    // Fill with black (preserve areas)
    maskCtx.fillStyle = '#000000';
    maskCtx.fillRect(0, 0, width, height);

    // Get the drawing from the source canvas
    const sourceCtx = canvas.getContext('2d')!;
    const sourceData = sourceCtx.getImageData(0, 0, canvas.width, canvas.height);

    // Create mask data
    const maskData = maskCtx.getImageData(0, 0, width, height);

    // Scale and convert: any painted pixel (red with alpha > 0) becomes white
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Sample from source canvas (with scaling)
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const srcIndex = (srcY * canvas.width + srcX) * 4;

        // Check if pixel has alpha (was painted)
        const alpha = sourceData.data[srcIndex + 3];

        if (alpha > 0) {
          // Painted area = white (edit area)
          const dstIndex = (y * width + x) * 4;
          maskData.data[dstIndex] = 255;     // R
          maskData.data[dstIndex + 1] = 255; // G
          maskData.data[dstIndex + 2] = 255; // B
          maskData.data[dstIndex + 3] = 255; // A
        }
      }
    }

    maskCtx.putImageData(maskData, 0, 0);

    return {
      dataUrl: maskCanvas.toDataURL('image/png'),
      width,
      height,
    };
  }, []);

  // Clear all state
  const clear = useCallback(() => {
    clearHistory();
    setHasMask(false);
  }, [clearHistory]);

  return {
    // Brush settings
    brushSize,
    setBrushSize,
    brushMode,
    setBrushMode,
    opacity,
    setOpacity,

    // Drawing state
    isDrawing,
    setIsDrawing,

    // History management
    canUndo,
    canRedo,
    pushHistory,
    undo,
    redo,
    clearHistory,

    // Mask operations
    hasMask,
    setHasMask,
    exportMask,

    // Clear
    clear,
  };
}

export default useBrushCanvas;
