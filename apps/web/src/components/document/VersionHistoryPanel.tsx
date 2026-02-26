'use client';

/**
 * VersionHistoryPanel Component
 * Feature 028 T060: Document version history display and restore
 *
 * Shows the version history of a document with ability to preview and restore.
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  History,
  Clock,
  RotateCcw,
  ChevronRight,
  Loader2,
  FileText,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDocumentVersions,
  useRestoreVersion,
  type VersionEntry,
} from '@/hooks/useDocumentVersions';

interface VersionHistoryPanelProps {
  documentId: string | null;
  currentTitle?: string;
  trigger?: React.ReactNode;
  onRestoreComplete?: () => void;
}

interface VersionPreviewProps {
  version: VersionEntry;
  onClose: () => void;
}

function VersionPreview({ version, onClose }: VersionPreviewProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">Versão {version.version}</h3>
            <p className="text-sm text-muted-foreground">{version.title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
            {version.content || <span className="text-muted-foreground italic">Conteúdo vazio</span>}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function VersionListItem({
  version,
  isSelected,
  onSelect,
  onPreview,
  onRestore,
  isRestoring,
}: {
  version: VersionEntry;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onRestore: () => void;
  isRestoring: boolean;
}) {
  const formattedDate = format(new Date(version.created_at), "dd 'de' MMM, HH:mm", {
    locale: ptBR,
  });

  return (
    <div
      className={cn(
        'group p-3 rounded-lg border transition-all cursor-pointer',
        'hover:bg-accent/50',
        isSelected && 'ring-2 ring-primary border-primary bg-primary/5'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                v{version.version}
              </Badge>
              <span className="text-sm font-medium truncate max-w-[200px]">
                {version.title}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formattedDate}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            title="Visualizar"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onRestore();
            }}
            disabled={isRestoring}
            title="Restaurar esta versão"
          >
            {isRestoring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Preview of content */}
      <p className="text-xs text-muted-foreground line-clamp-2 mt-2 ml-11">
        {version.content?.substring(0, 150) || 'Conteúdo vazio'}
        {version.content && version.content.length > 150 && '...'}
      </p>
    </div>
  );
}

export function VersionHistoryPanel({
  documentId,
  currentTitle,
  trigger,
  onRestoreComplete,
}: VersionHistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);
  const [previewVersion, setPreviewVersion] = useState<VersionEntry | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<VersionEntry | null>(null);

  const { data: versionHistory, isLoading } = useDocumentVersions(
    isOpen ? documentId : null
  );
  const restoreMutation = useRestoreVersion(documentId);

  const handleRestore = async (version: VersionEntry) => {
    await restoreMutation.mutateAsync(version.version);
    setConfirmRestore(null);
    onRestoreComplete?.();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              Histórico
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Versões
            </SheetTitle>
            <SheetDescription>
              {currentTitle && (
                <span className="font-medium text-foreground">{currentTitle}</span>
              )}
              <br />
              Versão atual: {versionHistory?.current_version || 1}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !versionHistory?.versions || versionHistory.versions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma versão anterior encontrada.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  O histórico será criado conforme você editar o documento.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-2 pr-3">
                  {versionHistory.versions
                    .slice()
                    .reverse()
                    .map((version) => (
                      <VersionListItem
                        key={version.version}
                        version={version}
                        isSelected={selectedVersion?.version === version.version}
                        onSelect={() => setSelectedVersion(version)}
                        onPreview={() => setPreviewVersion(version)}
                        onRestore={() => setConfirmRestore(version)}
                        isRestoring={
                          restoreMutation.isPending &&
                          confirmRestore?.version === version.version
                        }
                      />
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Modal */}
      {previewVersion && (
        <VersionPreview
          version={previewVersion}
          onClose={() => setPreviewVersion(null)}
        />
      )}

      {/* Confirm Restore Dialog */}
      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão {confirmRestore?.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo atual será salvo como uma nova versão no histórico antes de
              restaurar. Esta ação pode ser desfeita restaurando a versão mais recente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRestore && handleRestore(confirmRestore)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default VersionHistoryPanel;
