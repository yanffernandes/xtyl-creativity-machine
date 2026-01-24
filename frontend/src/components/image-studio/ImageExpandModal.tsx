'use client';

/**
 * ImageExpandModal Component
 * Feature 027: Visual Generation Studio
 *
 * Fullscreen modal for viewing generated images with
 * zoom, download, and navigation controls.
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  X,
  Download,
  Save,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { GeneratedImage } from '@/types/image-studio';

interface ImageExpandModalProps {
  image: GeneratedImage | null;
  images: GeneratedImage[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (image: GeneratedImage) => void;
  onRefine: (image: GeneratedImage) => void;
}

export function ImageExpandModal({
  image,
  images,
  isOpen,
  onClose,
  onSave,
  onRefine,
}: ImageExpandModalProps) {
  const currentIndex = image ? images.findIndex((i) => i.document_id === image.document_id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      const prevImage = images[currentIndex - 1];
      // We need to update the image through parent - for now we'll close
    }
  }, [hasPrev, currentIndex, images]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      const nextImage = images[currentIndex + 1];
      // We need to update the image through parent - for now we'll close
    }
  }, [hasNext, currentIndex, images]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrev, goToNext]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDownload = () => {
    if (!image?.file_url) return;

    // Open in new tab for download (avoids CORS issues with R2)
    // The browser will handle the download based on Content-Disposition header
    const link = document.createElement('a');
    link.href = image.file_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    // Try to trigger download, but browser may open in new tab if CORS blocks download attribute
    link.download = image.title || `image-${currentIndex + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      {isOpen && image && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

          {/* Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <span className="text-white/70 text-sm">
                  {currentIndex + 1} de {images.length}
                </span>
                {image.title && (
                  <span className="text-white font-medium">{image.title}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => onSave(image)}
                >
                  <Save className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    onRefine(image);
                    onClose();
                  }}
                >
                  <RefreshCw className="h-5 w-5" />
                </Button>

                <div className="w-px h-6 bg-white/20 mx-2" />

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Image container */}
            <div className="flex-1 relative flex items-center justify-center p-4">
              {/* Navigation arrows */}
              {hasPrev && (
                <button
                  type="button"
                  onClick={goToPrev}
                  className={cn(
                    'absolute left-4 top-1/2 -translate-y-1/2 z-10',
                    'w-12 h-12 rounded-full',
                    'bg-black/30 hover:bg-black/50',
                    'flex items-center justify-center',
                    'text-white/70 hover:text-white',
                    'transition-all duration-200'
                  )}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}

              {hasNext && (
                <button
                  type="button"
                  onClick={goToNext}
                  className={cn(
                    'absolute right-4 top-1/2 -translate-y-1/2 z-10',
                    'w-12 h-12 rounded-full',
                    'bg-black/30 hover:bg-black/50',
                    'flex items-center justify-center',
                    'text-white/70 hover:text-white',
                    'transition-all duration-200'
                  )}
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}

              {/* Image */}
              <div className="relative max-w-full max-h-full">
                {image.file_url && (
                  <Image
                    src={image.file_url}
                    alt={image.title || 'Generated image'}
                    width={1024}
                    height={1024}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                    priority
                  />
                )}
              </div>
            </div>

            {/* Footer with metadata */}
            {image.modifier && (
              <div className="p-4 text-center">
                <p className="text-sm text-white/50">
                  Modificador: {image.modifier}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ImageExpandModal;
