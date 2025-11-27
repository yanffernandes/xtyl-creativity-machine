"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Clock,
  Archive,
  Trash2,
  MoreVertical,
  Search,
  X,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  listConversations,
  deleteConversation,
  archiveConversation,
  ConversationSummary,
} from "@/lib/api/conversations";

interface ConversationsListProps {
  workspaceId: string;
  projectId?: string;
  onSelectConversation: (conversationId: string) => void;
  onClose: () => void;
}

export default function ConversationsList({
  workspaceId,
  projectId,
  onSelectConversation,
  onClose,
}: ConversationsListProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await listConversations(
        workspaceId,
        projectId,
        showArchived
      );
      setConversations(data.conversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar conversas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [workspaceId, projectId, showArchived]);

  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta conversa?")) return;

    try {
      await deleteConversation(conversationId);
      setConversations((prev) =>
        prev.filter((c) => c.id !== conversationId)
      );
      toast({
        title: "Conversa excluída",
        description: "A conversa foi excluída com sucesso",
      });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir conversa",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await archiveConversation(conversationId);
      setConversations((prev) =>
        prev.filter((c) => c.id !== conversationId)
      );
      toast({
        title: "Conversa arquivada",
        description: "A conversa foi arquivada com sucesso",
      });
    } catch (error) {
      console.error("Failed to archive conversation:", error);
      toast({
        title: "Erro",
        description: "Falha ao arquivar conversa",
        variant: "destructive",
      });
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.title?.toLowerCase().includes(query) ||
      c.summary?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "agora";
      if (diffMins < 60) return `há ${diffMins} min`;
      if (diffHours < 24) return `há ${diffHours}h`;
      if (diffDays < 7) return `há ${diffDays}d`;
      return date.toLocaleDateString('pt-BR');
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold">Histórico de Conversas</h2>
          </div>
          <Button
            variant={showArchived ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="gap-1 text-xs"
          >
            <Archive className="h-3 w-3" />
            {showArchived ? "Ver Ativas" : "Arquivadas"}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-muted/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "Nenhuma conversa encontrada"
                : showArchived
                  ? "Nenhuma conversa arquivada"
                  : "Nenhuma conversa ainda"}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredConversations.map((conversation, index) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onSelectConversation(conversation.id)}
                className="p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {conversation.title || "Conversa sem título"}
                      </span>
                    </div>
                    {conversation.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 ml-6">
                        {conversation.summary}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 ml-6">
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(conversation.last_message_at || conversation.created_at)}
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1.5"
                      >
                        {conversation.message_count} msgs
                      </Badge>
                      {conversation.model_used && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5"
                        >
                          {conversation.model_used.split("/").pop()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!showArchived && (
                        <DropdownMenuItem
                          onClick={(e) => handleArchive(conversation.id, e as any)}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Arquivar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) => handleDelete(conversation.id, e as any)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
