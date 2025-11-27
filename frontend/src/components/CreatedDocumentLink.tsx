"use client";

import { motion } from "framer-motion";
import { FileText, Image, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CreatedDocumentLinkProps {
  documentId: string;
  documentTitle: string;
  documentType?: "text" | "image";
  workspaceId: string;
  projectId: string;
  onNavigate: (documentId: string) => void;
}

export default function CreatedDocumentLink({
  documentId,
  documentTitle,
  documentType = "text",
  workspaceId,
  projectId,
  onNavigate,
}: CreatedDocumentLinkProps) {
  const Icon = documentType === "image" ? Image : FileText;
  const typeLabel = documentType === "image" ? "Imagem" : "Documento";
  const typeColor = documentType === "image" ? "text-purple-500" : "text-blue-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg px-3 py-2 my-2"
    >
      <Icon className={`h-4 w-4 ${typeColor} flex-shrink-0`} />
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-muted-foreground">{typeLabel} criado:</span>
        <span className="text-sm font-medium truncate max-w-[200px]">
          {documentTitle}
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onNavigate(documentId)}
        className="gap-1 ml-2 h-7 text-xs"
      >
        <ExternalLink className="h-3 w-3" />
        Ver
      </Button>
    </motion.div>
  );
}
