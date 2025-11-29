"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Image as ImageIcon, Check, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import api from "@/lib/api";

interface Image {
  id: string;
  title: string;
  image_url?: string;
  file_url?: string;
  thumbnail_url?: string;
  created_at: string;
}

interface AttachImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  projectId: string;
  onSuccess: () => void;
}

export default function AttachImageModal({
  isOpen,
  onClose,
  documentId,
  projectId,
  onSuccess,
}: AttachImageModalProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [alreadyAttachedImages, setAlreadyAttachedImages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [attaching, setAttaching] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchImagesAndAttachments();
      setSelectedImages(new Set());
    }
  }, [isOpen, projectId, documentId]);

  const fetchImagesAndAttachments = async () => {
    try {
      setLoading(true);

      // Fetch images and existing attachments in parallel
      const [imagesResponse, attachmentsResponse] = await Promise.all([
        api.get(`/documents/projects/${projectId}/documents`),
        api.get(`/documents/${documentId}/attachments`).catch(() => ({ data: [] }))
      ]);

      // Filter only images
      const allDocs = imagesResponse.data;
      const imageDocuments = allDocs.filter((doc: any) => doc.media_type === "image");
      setImages(imageDocuments);

      // Track already attached images
      const attachedIds = new Set<string>(
        (attachmentsResponse.data || []).map((att: any) => att.image_id)
      );
      setAlreadyAttachedImages(attachedIds);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleImage = (imageId: string) => {
    // Don't allow toggling already attached images
    if (alreadyAttachedImages.has(imageId)) {
      return;
    }

    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      if (newSelected.size >= 20) {
        alert("Maximum 20 images can be attached");
        return;
      }
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const handleAttach = async () => {
    if (selectedImages.size === 0) {
      alert("Please select at least one image");
      return;
    }

    try {
      setAttaching(true);

      // Filter out already attached images (safety check)
      const newImageIds = Array.from(selectedImages).filter(
        id => !alreadyAttachedImages.has(id)
      );

      if (newImageIds.length === 0) {
        alert("All selected images are already attached");
        return;
      }

      // Attach only new images
      for (let i = 0; i < newImageIds.length; i++) {
        await api.post(`/documents/${documentId}/attachments`, {
          document_id: documentId,
          image_id: newImageIds[i],
          is_primary: i === 0 && newImageIds.length === 1, // Only first image is primary if it's the only one
          attachment_order: alreadyAttachedImages.size + i, // Continue from existing count
        });
      }

      onClose();
      onSuccess(); // Call after closing to trigger parent refresh
    } catch (error) {
      console.error("Error attaching images:", error);
      alert("Failed to attach images. Please try again.");
    } finally {
      setAttaching(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Attach Images to Document</DialogTitle>
          <DialogDescription>
            Select up to 20 images from your project to attach to this document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 text-[#5B8DEF]" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                No images found in this project
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Generate images using workflows or upload them manually
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4 p-4">
              {images.map((image) => {
                const isSelected = selectedImages.has(image.id);
                const isAlreadyAttached = alreadyAttachedImages.has(image.id);
                return (
                  <motion.div
                    key={image.id}
                    whileHover={{ scale: isAlreadyAttached ? 1 : 1.05 }}
                    whileTap={{ scale: isAlreadyAttached ? 1 : 0.95 }}
                  >
                    <Card
                      className={`relative overflow-hidden transition-all ${
                        isAlreadyAttached
                          ? "ring-2 ring-green-500 opacity-75 cursor-default"
                          : isSelected
                            ? "ring-2 ring-[#5B8DEF] shadow-lg cursor-pointer"
                            : "hover:shadow-md cursor-pointer"
                      }`}
                      onClick={() => toggleImage(image.id)}
                    >
                      <div className="aspect-square relative">
                        <img
                          src={image.thumbnail_url || image.file_url || image.image_url || "/placeholder.png"}
                          alt={image.title}
                          className={`w-full h-full object-cover ${isAlreadyAttached ? "opacity-60" : ""}`}
                        />

                        {/* Already Attached Indicator */}
                        {isAlreadyAttached && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-green-500 text-white">
                            <Link className="w-3 h-3" />
                          </div>
                        )}

                        {/* Selection Indicator */}
                        {!isAlreadyAttached && (
                          <div
                            className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-[#5B8DEF] text-white"
                                : "bg-white/80 text-gray-400"
                            }`}
                          >
                            {isSelected && <Check className="w-4 h-4" />}
                          </div>
                        )}

                        {/* Overlay on hover */}
                        {!isSelected && !isAlreadyAttached && (
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors" />
                        )}

                        {/* Already attached overlay label */}
                        {isAlreadyAttached && (
                          <div className="absolute bottom-0 left-0 right-0 bg-green-500/90 text-white text-xs py-1 text-center">
                            Já anexada
                          </div>
                        )}
                      </div>

                      <div className="p-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {image.title}
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedImages.size} image{selectedImages.size !== 1 ? "s" : ""}{" "}
            selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={attaching}>
              Cancel
            </Button>
            <Button
              onClick={handleAttach}
              disabled={selectedImages.size === 0 || attaching}
            >
              {attaching ? "Attaching..." : "Attach Images"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
