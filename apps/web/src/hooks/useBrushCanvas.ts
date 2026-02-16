import { useState, useCallback, useRef } from 'react';

export type BrushMode = 'brush' | 'eraser';

export interface MaskData {
  dataUrl: string;
  width: number;
  height: number;
}

interface UseBrushCanvasOptions {
  maxHistorySize?: number;
  defaultBrushSize?: number;
  defaultOpacity?: number;
}

const MAX_HISTORY_SIZE = 20;
const MIN_BRUSH_SIZE = 5;
const MAX_BRUSH_SIZE = 50;

export function useBrushCanvas({
  maxHistorySize = MAX_HISTORY_SIZE,
  defaultBrushSize = 20,
  defaultOpacity = 1,
}: UseBrushCanvasOptions = {}) {
  const [brushSize, setBrushSizeState] = useState(defaultBrushSize);
  const [brushMode, setBrushMode] = useState<BrushMode>('brush');
  const [opacity, setOpacity] = useState(defaultOpacity);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);

  // Undo/redo history
  const historyRef = useRef<{ imageData: ImageData; timestamp: number }[]>([]);
  const historyIndexRef = useRef(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const setBrushSize = useCallback((size: number) => {
    setBrushSizeState(Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, size)));
  }, []);

  const pushHistory = useCallback(
    (imageData: ImageData) => {
      const history = historyRef.current;
      const currentIndex = historyIndexRef.current;

      // Discard any redo history beyond current index
      if (currentIndex < history.length - 1) {
        history.splice(currentIndex + 1);
      }

      history.push({
        imageData: new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height,
        ),
        timestamp: Date.now(),
      });

      // Cap history size
      while (history.length > maxHistorySize) {
        history.shift();
      }

      historyIndexRef.current = history.length - 1;
      setCanUndo(history.length > 1);
      setCanRedo(false);
    },
    [maxHistorySize],
  );

  const undo = useCallback((): ImageData | null => {
    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex <= 0) return null;

    historyIndexRef.current = currentIndex - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);

    return history[historyIndexRef.current].imageData;
  }, []);

  const redo = useCallback((): ImageData | null => {
    const history = historyRef.current;
    const currentIndex = historyIndexRef.current;

    if (currentIndex >= history.length - 1) return null;

    historyIndexRef.current = currentIndex + 1;
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < history.length - 1);

    return history[historyIndexRef.current].imageData;
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  const exportMask = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number): MaskData => {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;

      const maskCtx = maskCanvas.getContext('2d')!;
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, width, height);

      const sourceCtx = canvas.getContext('2d')!;
      const sourceData = sourceCtx.getImageData(0, 0, canvas.width, canvas.height);
      const maskData = maskCtx.getImageData(0, 0, width, height);

      const scaleX = canvas.width / width;
      const scaleY = canvas.height / height;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcX = Math.floor(x * scaleX);
          const srcY = Math.floor(y * scaleY);
          const srcIndex = (srcY * canvas.width + srcX) * 4;

          if (sourceData.data[srcIndex + 3] > 0) {
            const dstIndex = (y * width + x) * 4;
            maskData.data[dstIndex] = 255;
            maskData.data[dstIndex + 1] = 255;
            maskData.data[dstIndex + 2] = 255;
            maskData.data[dstIndex + 3] = 255;
          }
        }
      }

      maskCtx.putImageData(maskData, 0, 0);

      return {
        dataUrl: maskCanvas.toDataURL('image/png'),
        width,
        height,
      };
    },
    [],
  );

  const clear = useCallback(() => {
    clearHistory();
    setHasMask(false);
  }, [clearHistory]);

  return {
    // Brush state
    brushSize,
    setBrushSize,
    brushMode,
    setBrushMode,
    opacity,
    setOpacity,

    // Drawing state
    isDrawing,
    setIsDrawing,

    // History
    canUndo,
    canRedo,
    pushHistory,
    undo,
    redo,
    clearHistory,

    // Mask
    hasMask,
    setHasMask,
    exportMask,
    clear,
  };
}

export default useBrushCanvas;
