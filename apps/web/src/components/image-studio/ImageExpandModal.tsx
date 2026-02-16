import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Save,
  RefreshCw,
} from 'lucide-react';
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
  const currentIndex = image
    ? images.findIndex((i) => i.document_id === image.document_id)
    : -1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDownload = () => {
    if (!image?.file_url) return;
    const link = document.createElement('a');
    link.href = image.file_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
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
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-10 w-full h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <span className="text-white/70 text-sm">
                  {currentIndex + 1} de {images.length}
                </span>
                {image.title && (
                  <span className="text-white font-medium">
                    {image.title}
                  </span>
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

            <div className="flex-1 relative flex items-center justify-center p-4">
              {image.file_url && (
                <img
                  src={image.file_url}
                  alt={image.title || 'Generated image'}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              )}
            </div>

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
