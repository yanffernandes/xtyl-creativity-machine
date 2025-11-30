"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Trash2,
  Image as ImageIcon,
  Plus,
  Eye,
  Link2Off,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useConfirm } from "@/components/confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import api, { detachImageFromDocument, deleteImagePermanently } from "@/lib/api";
import ImageLightbox, { LightboxImage } from "@/components/ui/ImageLightbox";

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const confirm = useConfirm();
  const { toast } = useToast();

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/documents/${documentId}/attachments`);
      setAttachments(response.data);
      setImageErrors(new Set()); // Reset errors on refresh
    } catch (error) {
      console.error("Error fetching attachments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [documentId]);

  // Convert attachments to lightbox format
  const lightboxImages: LightboxImage[] = useMemo(() => {
    return attachments.map((attachment) => ({
      id: attachment.id,
      url: attachment.image?.file_url || attachment.image?.image_url || attachment.image?.thumbnail_url || "",
      title: attachment.image?.title || "Untitled",
      thumbnailUrl: attachment.image?.thumbnail_url,
    }));
  }, [attachments]);

  const handleSetPrimary = async (attachmentId: string) => {
    try {
      await api.put(`/documents/${documentId}/attachments/${attachmentId}`, null, {
        params: { is_primary: true },
      });
      await fetchAttachments();
      toast({
        title: "Imagem principal definida",
        description: "Esta imagem será usada como capa do documento.",
      });
    } catch (error) {
      console.error("Error setting primary image:", error);
      toast({
        title: "Erro",
        description: "Não foi possível definir a imagem principal.",
        variant: "destructive",
      });
    }
  };

  const handleViewImage = (attachment: ImageAttachment, index: number) => {
    if (onViewImage && attachment.image_id) {
      onViewImage(attachment.image_id);
    } else {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  const handleDetach = async (attachmentId: string) => {
    const confirmed = await confirm({
      title: "Desanexar imagem",
      description: "A imagem será removida deste documento, mas continuará disponível na biblioteca de assets visuais.",
      confirmLabel: "Desanexar",
      cancelLabel: "Cancelar",
      variant: "default",
    });
    if (!confirmed) return;

    try {
      await detachImageFromDocument(documentId, attachmentId);
      await fetchAttachments();
      toast({
        title: "Imagem desanexada",
        description: "A imagem foi removida do documento e continua disponível na biblioteca.",
      });
    } catch (error) {
      console.error("Error detaching image:", error);
      toast({
        title: "Erro",
        description: "Não foi possível desanexar a imagem.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePermanently = async (attachmentId: string) => {
    const confirmed = await confirm({
      title: "Excluir permanentemente",
      description: "Esta ação é irreversível. A imagem será removida do documento E excluída permanentemente do armazenamento. Ela não poderá ser recuperada.",
      confirmLabel: "Excluir permanentemente",
      cancelLabel: "Cancelar",
      variant: "destructive",
    });
    if (!confirmed) return;

    try {
      await deleteImagePermanently(documentId, attachmentId);
      await fetchAttachments();
      toast({
        title: "Imagem excluída",
        description: "A imagem foi permanentemente removida do sistema.",
      });
    } catch (error: any) {
      console.error("Error deleting image permanently:", error);

      // Handle specific error for refinement chain protection
      const errorMessage = error.response?.data?.detail || "Não foi possível excluir a imagem.";
      toast({
        title: "Erro ao excluir",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleImageError = (attachmentId: string) => {
    setImageErrors((prev) => new Set(prev).add(attachmentId));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Imagens Anexadas
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
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Imagens Anexadas
          </h3>
          <Button onClick={onAttachImage} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Anexar Imagens
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
                  Nenhuma imagem anexada
                </p>
                <Button onClick={onAttachImage} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Anexar sua primeira imagem
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {attachments.map((attachment, index) => {
                const hasError = imageErrors.has(attachment.id);
                const imageUrl = attachment.image?.thumbnail_url || attachment.image?.file_url || attachment.image?.image_url;

                return (
                  <motion.div
                    key={attachment.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300">
                      <div className="aspect-square relative">
                        {hasError ? (
                          // Error placeholder for missing images
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 gap-2">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                            <span className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                              Imagem indisponível
                            </span>
                          </div>
                        ) : (
                          <img
                            src={imageUrl || "/placeholder.png"}
                            alt={attachment.image?.title || "Attachment"}
                            className="w-full h-full object-cover"
                            onError={() => handleImageError(attachment.id)}
                          />
                        )}

                        {/* Primary Badge */}
                        {attachment.is_primary && (
                          <div className="absolute top-2 left-2">
                            <div className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              Principal
                            </div>
                          </div>
                        )}

                        {/* Hover Actions - Three distinct buttons */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {/* View Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="secondary"
                                onClick={() => handleViewImage(attachment, index)}
                                className="h-8 w-8"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Visualizar</TooltipContent>
                          </Tooltip>

                          {/* Set Primary Button */}
                          {!attachment.is_primary && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  onClick={() => handleSetPrimary(attachment.id)}
                                  className="h-8 w-8"
                                >
                                  <Star className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Definir como principal</TooltipContent>
                            </Tooltip>
                          )}

                          {/* Detach Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDetach(attachment.id)}
                                className="h-8 w-8 bg-white/10 hover:bg-white/20 border-white/20"
                              >
                                <Link2Off className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Desanexar (mantém na biblioteca)</TooltipContent>
                          </Tooltip>

                          {/* Delete Permanently Button */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => handleDeletePermanently(attachment.id)}
                                className="h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir permanentemente</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      <div className="p-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {attachment.image?.title || "Sem título"}
                        </p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ImageLightbox with zoom support */}
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
        />
      </div>
    </TooltipProvider>
  );
}
