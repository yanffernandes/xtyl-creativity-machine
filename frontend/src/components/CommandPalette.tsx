"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  FileText,
  FolderOpen,
  Plus,
  Search,
  Settings,
  User,
  LogOut,
  Sparkles,
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CommandPaletteProps {
  projects?: Array<{ id: string; name: string }>
  documents?: Array<{ id: string; title: string; projectId: string }>
  workspaceId?: string
  onCreateDocument?: () => void
  onUploadFile?: () => void
  className?: string
}

export default function CommandPalette({
  projects = [],
  documents = [],
  workspaceId,
  onCreateDocument,
  onUploadFile,
  className
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Digite um comando ou busque..." />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {/* Actions */}
        <CommandGroup heading="Ações">
          {onCreateDocument && (
            <CommandItem
              onSelect={() => runCommand(onCreateDocument)}
              className="cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span>Nova Criação</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>N
              </kbd>
            </CommandItem>
          )}
          {onUploadFile && (
            <CommandItem
              onSelect={() => runCommand(onUploadFile)}
              className="cursor-pointer"
            >
              <Upload className="mr-2 h-4 w-4" />
              <span>Upload de Arquivo</span>
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>U
              </kbd>
            </CommandItem>
          )}
          <CommandItem
            onSelect={() => runCommand(() => router.push(`/workspace/${workspaceId}`))}
            className="cursor-pointer"
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            <span>Ver Todos os Projetos</span>
          </CommandItem>
        </CommandGroup>

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projetos">
              {projects.slice(0, 5).map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(`/workspace/${workspaceId}/project/${project.id}`)
                    )
                  }
                  className="cursor-pointer"
                >
                  <FolderOpen className="mr-2 h-4 w-4 text-primary" />
                  <span>{project.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {documents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documentos Recentes">
              {documents.slice(0, 5).map((doc) => (
                <CommandItem
                  key={doc.id}
                  onSelect={() =>
                    runCommand(() =>
                      router.push(
                        `/workspace/${workspaceId}/project/${doc.projectId}?doc=${doc.id}`
                      )
                    )
                  }
                  className="cursor-pointer"
                >
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{doc.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Configurações">
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push(`/workspace/${workspaceId}/profile`))
            }
            className="cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/login"))}
            className="cursor-pointer text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
