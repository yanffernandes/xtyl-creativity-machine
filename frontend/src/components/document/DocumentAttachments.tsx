"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Trash2, Image as ImageIcon, Plus, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";

interface ImageAttachment {
  id: string;
  image_id: string;
  is_primary: boolean;
  attachment_order: number;
  created_at: string;
  image?: {
    id: string;
    title: string;
    image_url?: string;
    file_url?: string;
    thumbnail_url?: string;
  };
}

interface DocumentAttachmentsProps {
  documentId: string;
  onAttachImage: () => void;
  onViewImage?: (imageId: string) => void;
}

export default function DocumentAttachments({
  documentId,
  onAttachImage,
  onViewImage,
}: DocumentAttachmentsProps) {
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingImage, setViewingImage] = useState<ImageAttachment | null>(null);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/documents/${documentId}/attachments`);
      setAttachments(response.data);
    } catch (error) {
      console.error("Error fetching attachments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [documentId]);

  const handleSetPrimary = async (attachmentId: string) => {
    try {
      await api.put(`/documents/${documentId}/attachments/${attachmentId}`, null, {
        params: { is_primary: true },
      });
      await fetchAttachments();
    } catch (error) {
      console.error("Error setting primary image:", error);
    }
  };

  const handleRemove = async (attachmentId: string) => {
    if (!confirm("Remove this image from the document?")) return;

    try {
      await api.delete(`/documents/${documentId}/attachments/${attachmentId}`);
      await fetchAttachments();
    } catch (error) {
      console.error("Error removing attachment:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Attached Images
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Attached Images
        </h3>
        <Button onClick={onAttachImage} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Attach Images
        </Button>
      </div>

      {attachments.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-[#5B8DEF]" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No images attached yet
              </p>
              <Button onClick={onAttachImage} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Attach your first image
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {attachments.map((attachment, index) => (
              <motion.div
                key={attachment.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300">
                  <div className="aspect-square relative">
                    <img
                      src={attachment.image?.thumbnail_url || attachment.image?.file_url || attachment.image?.image_url || "/placeholder.png"}
                      alt={attachment.image?.title || "Attachment"}
                      className="w-full h-full object-cover"
                    />

                    {/* Primary Badge */}
                    {attachment.is_primary && (
                      <div className="absolute top-2 left-2">
                        <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          Primary
                        </div>
                      </div>
                    )}

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          if (onViewImage && attachment.image_id) {
                            onViewImage(attachment.image_id);
                          } else {
                            setViewingImage(attachment);
                          }
                        }}
                        className="gap-1"
                      >
                        <Expand className="w-3 h-3" />
                        View
                      </Button>
                      {!attachment.is_primary && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetPrimary(attachment.id)}
                          className="gap-1"
                        >
                          <Star className="w-3 h-3" />
                          Primary
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemove(attachment.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {attachment.image?.title || "Untitled"}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Fullscreen Image Viewer */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setViewingImage(null)}
          >
            {/* Close Button */}
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={() => setViewingImage(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Image Title */}
            <div className="absolute top-4 left-4 text-white z-10">
              <h3 className="text-lg font-semibold">
                {viewingImage.image?.title || "Untitled"}
              </h3>
            </div>

            {/* Image */}
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={viewingImage.image?.file_url || viewingImage.image?.image_url || viewingImage.image?.thumbnail_url || "/placeholder.png"}
              alt={viewingImage.image?.title || "Attachment"}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
