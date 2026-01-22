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
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { detachImageFromDocument, deleteImagePermanently } from "@/lib/api";
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
  compact?: boolean;
}

export default function DocumentAttachments({
  documentId,
  onAttachImage,
  onViewImage,
  compact = false,
}: DocumentAttachmentsProps) {
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const confirm = useConfirm();
  const { toast } = useToast();

  // Fetch attachments directly from Supabase for better performance
  const fetchAttachments = async () => {
    try {
      setLoading(true);

      // Get attachments for this document
      const { data: attachmentsData, error: attError } = await supabase
        .from('document_attachments')
        .select('id, image_id, is_primary, attachment_order, created_at')
        .eq('document_id', documentId)
        .order('attachment_order', { ascending: true });

      if (attError) throw attError;

      if (!attachmentsData || attachmentsData.length === 0) {
        setAttachments([]);
        return;
      }

      // Get unique image IDs to fetch image details
      const imageIds = [...new Set(attachmentsData.map(a => a.image_id))];

      const { data: images, error: imgError } = await supabase
        .from('documents')
        .select('id, title, file_url, thumbnail_url')
        .in('id', imageIds);

      if (imgError) throw imgError;

      // Create image map for fast lookup
      const imageMap = Object.fromEntries(
        (images || []).map(img => [img.id, img])
      );

      // Merge attachments with image data
      const mergedAttachments: ImageAttachment[] = attachmentsData.map(att => ({
        ...att,
        image: imageMap[att.image_id] || undefined
      }));

      setAttachments(mergedAttachments);
      setImageErrors(new Set());
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
      // First, reset all attachments for this document to non-primary
      await supabase
        .from('document_attachments')
        .update({ is_primary: false })
        .eq('document_id', documentId);

      // Then set the selected one as primary
      const { error } = await supabase
        .from('document_attachments')
        .update({ is_primary: true })
        .eq('id', attachmentId);

      if (error) throw error;

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

  // Compact grid classes for smaller thumbnails
  const gridClasses = compact
    ? "grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2"
    : "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3";

  const thumbnailClasses = compact ? "aspect-square" : "aspect-square";

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Imagens Anexadas
          </h3>
        </div>
        <div className={gridClasses}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`${thumbnailClasses} bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Imagens Anexadas {attachments.length > 0 && <span className="text-muted-foreground font-normal">({attachments.length})</span>}
          </h3>
          <Button onClick={onAttachImage} size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Anexar
          </Button>
        </div>

        {attachments.length === 0 ? (
          <div className="py-6 text-center border border-dashed rounded-lg bg-gray-50/50 dark:bg-gray-900/30">
            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Nenhuma imagem anexada
            </p>
            <Button onClick={onAttachImage} variant="ghost" size="sm" className="text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Anexar imagem
            </Button>
          </div>
        ) : (
          <div className={gridClasses}>
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
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/30 hover:border-primary/50 transition-all duration-200">
                      <div className={thumbnailClasses + " relative"}>
                        {hasError ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 gap-1">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <span className="text-[10px] text-muted-foreground">
                              Erro
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

                        {/* Primary Badge - Smaller */}
                        {attachment.is_primary && (
                          <div className="absolute top-1 left-1">
                            <div className="bg-yellow-400/90 backdrop-blur-sm text-yellow-900 p-1 rounded-full">
                              <Star className="w-2.5 h-2.5 fill-current" />
                            </div>
                          </div>
                        )}

                        {/* Hover Actions - Compact */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 p-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="secondary"
                                onClick={() => handleViewImage(attachment, index)}
                                className="h-6 w-6"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Visualizar</TooltipContent>
                          </Tooltip>

                          {!attachment.is_primary && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="secondary"
                                  onClick={() => handleSetPrimary(attachment.id)}
                                  className="h-6 w-6"
                                >
                                  <Star className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Principal</TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleDetach(attachment.id)}
                                className="h-6 w-6 bg-white/10 hover:bg-white/20 border-white/20"
                              >
                                <Link2Off className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Desanexar</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => handleDeletePermanently(attachment.id)}
                                className="h-6 w-6"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
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
