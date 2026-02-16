import { useState, useMemo } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useWorkspaceConversations,
  useProjectConversations,
  useArchivedConversations,
  useDeleteConversation,
  useArchiveConversation,
} from "@/hooks/use-conversations";
import { cn } from "@/lib/utils";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Use Supabase hooks for conversations
  const { data: workspaceConversations, isLoading: workspaceLoading } =
    useWorkspaceConversations(workspaceId);
  const { data: projectConversations, isLoading: projectLoading } =
    useProjectConversations(projectId || "");
  const { data: archivedConversations, isLoading: archivedLoading } =
    useArchivedConversations();
  const deleteConversation = useDeleteConversation();
  const archiveConversation = useArchiveConversation();

  // Determine which conversations to show based on filters
  const conversations = useMemo(() => {
    if (showArchived) {
      return archivedConversations || [];
    }
    if (projectId) {
      return projectConversations || [];
    }
    return workspaceConversations || [];
  }, [
    showArchived,
    projectId,
    archivedConversations,
    projectConversations,
    workspaceConversations,
  ]);

  const loading = showArchived
    ? archivedLoading
    : projectId
      ? projectLoading
      : workspaceLoading;

  const handleDeleteClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingDeleteId(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      deleteConversation.mutate(pendingDeleteId);
    }
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  const handleArchive = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    archiveConversation.mutate(conversationId);
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

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US");
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
            <h2 className="text-sm font-semibold">Conversation History</h2>
          </div>
          <Button
            variant={showArchived ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="gap-1 text-xs"
          >
            <Archive className="h-3 w-3" />
            {showArchived ? "View Active" : "Archived"}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
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
                ? "No conversations found"
                : showArchived
                  ? "No archived conversations"
                  : "No conversations yet"}
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
                        {conversation.title || "Untitled conversation"}
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
                        {formatDate(
                          conversation.last_message_at ||
                            conversation.created_at
                        )}
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
                          onClick={(e) =>
                            handleArchive(
                              conversation.id,
                              e as unknown as React.MouseEvent
                            )
                          }
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(e) =>
                          handleDeleteClick(
                            conversation.id,
                            e as unknown as React.MouseEvent
                          )
                        }
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
