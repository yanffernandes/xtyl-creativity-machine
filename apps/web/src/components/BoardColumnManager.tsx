"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { KeyboardSensor } from "@dnd-kit/core"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GripVertical, Pencil, Trash2, Plus, Check, X, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import boardsApi from "@/lib/boards-api"
import { useToast } from "@/components/ui/use-toast"
import type { BoardColumn } from "@/types/supabase"

const PRESET_COLORS = [
  "#64748b", "#3b82f6", "#22c55e", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4",
]

// ─── Sortable Row ─────────────────────────────────────────────────────────────

function ColumnRow({
  column,
  onRename,
  onColorChange,
  onSetDefault,
  onDelete,
}: {
  column: BoardColumn
  onRename: (id: string, name: string) => void
  onColorChange: (id: string, color: string) => void
  onSetDefault: (id: string) => void
  onDelete: (column: BoardColumn) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(column.name)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const commitRename = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== column.name) onRename(column.id, trimmed)
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border/50 group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Color dot + picker */}
      <div className="relative shrink-0">
        <div
          className="h-4 w-4 rounded-full border border-border/50 cursor-pointer"
          style={{ backgroundColor: column.color ?? "#64748b" }}
        />
        <input
          type="color"
          value={column.color ?? "#64748b"}
          onChange={(e) => onColorChange(column.id, e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-4 h-4"
          title="Alterar cor"
        />
      </div>

      {/* Name */}
      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename()
            if (e.key === "Escape") { setDraft(column.name); setEditing(false) }
          }}
          className="h-7 text-sm flex-1"
        />
      ) : (
        <span
          className="flex-1 text-sm truncate cursor-text"
          onDoubleClick={() => setEditing(true)}
        >
          {column.name}
        </span>
      )}

      {/* Default badge */}
      {column.is_default && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">
          padrão
        </Badge>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!editing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setEditing(true)}
            title="Renomear"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
        {!column.is_default && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onSetDefault(column.id)}
            title="Definir como padrão"
          >
            <Star className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive/60 hover:text-destructive"
          onClick={() => onDelete(column)}
          title="Excluir coluna"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface BoardColumnManagerProps {
  boardId: string
  columns: BoardColumn[]
  onClose: () => void
  onColumnsChange: (columns: BoardColumn[]) => void
}

export default function BoardColumnManager({
  boardId,
  columns,
  onClose,
  onColumnsChange,
}: BoardColumnManagerProps) {
  const { toast } = useToast()
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [deletingColumn, setDeletingColumn] = useState<BoardColumn | null>(null)
  const [moveToColumnId, setMoveToColumnId] = useState<string>("")

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const update = (updated: BoardColumn[]) => onColumnsChange(updated)

  // ── Add ──────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      const col = await boardsApi.createColumn({
        board_id: boardId,
        name,
        color: newColor,
        position: columns.length,
        is_default: columns.length === 0,
      })
      update([...columns, col!])
      setNewName("")
      setNewColor(PRESET_COLORS[0])
    } catch {
      toast({ title: "Erro ao criar coluna", variant: "destructive" })
    }
  }

  // ── Rename ────────────────────────────────────────────────────────────────

  const handleRename = async (id: string, name: string) => {
    try {
      await boardsApi.updateColumn(id, { name })
      update(columns.map((c) => (c.id === id ? { ...c, name } : c)))
    } catch {
      toast({ title: "Erro ao renomear coluna", variant: "destructive" })
    }
  }

  // ── Color ─────────────────────────────────────────────────────────────────

  const handleColorChange = async (id: string, color: string) => {
    // Optimistic
    update(columns.map((c) => (c.id === id ? { ...c, color } : c)))
    try {
      await boardsApi.updateColumn(id, { color })
    } catch {
      toast({ title: "Erro ao alterar cor", variant: "destructive" })
    }
  }

  // ── Set Default ───────────────────────────────────────────────────────────

  const handleSetDefault = async (id: string) => {
    const prev = columns.find((c) => c.is_default)
    update(columns.map((c) => ({ ...c, is_default: c.id === id })))
    try {
      if (prev) await boardsApi.updateColumn(prev.id, { is_default: false })
      await boardsApi.updateColumn(id, { is_default: true })
    } catch {
      toast({ title: "Erro ao definir coluna padrão", variant: "destructive" })
      // Revert
      update(columns)
    }
  }

  // ── Reorder (drag-end) ────────────────────────────────────────────────────

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = columns.findIndex((c) => c.id === active.id)
    const newIndex = columns.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(columns, oldIndex, newIndex).map((c, i) => ({
      ...c,
      position: i,
    }))
    update(reordered)

    try {
      await Promise.all(
        reordered.map((c) => boardsApi.updateColumn(c.id, { position: c.position }))
      )
    } catch {
      toast({ title: "Erro ao reordenar colunas", variant: "destructive" })
      update(columns)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deletingColumn) return
    const targetId = moveToColumnId || null
    try {
      await boardsApi.deleteColumn(deletingColumn.id, targetId)
      const remaining = columns
        .filter((c) => c.id !== deletingColumn.id)
        .map((c, i) => ({ ...c, position: i }))
      // If the deleted column was the default, promote the first remaining
      if (deletingColumn.is_default && remaining.length > 0) {
        remaining[0] = { ...remaining[0], is_default: true }
        await boardsApi.updateColumn(remaining[0].id, { is_default: true })
      }
      update(remaining)
      setDeletingColumn(null)
      setMoveToColumnId("")
    } catch {
      toast({ title: "Erro ao excluir coluna", variant: "destructive" })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet open onOpenChange={(open) => { if (!open) onClose() }}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-5 border-b border-border/50">
            <SheetTitle>Gerenciar Colunas</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {columns.map((col) => (
                  <ColumnRow
                    key={col.id}
                    column={col}
                    onRename={handleRename}
                    onColorChange={handleColorChange}
                    onSetDefault={handleSetDefault}
                    onDelete={(c) => { setDeletingColumn(c); setMoveToColumnId("") }}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {columns.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma coluna ainda. Crie a primeira abaixo.
              </p>
            )}
          </div>

          {/* Add new column */}
          <div className="px-6 py-4 border-t border-border/50 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Nova coluna
            </p>
            <div className="flex gap-2">
              {/* Color swatches */}
              <div className="flex gap-1 items-center">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={cn(
                      "h-5 w-5 rounded-full border-2 transition-transform",
                      newColor === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da coluna"
                className="flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
              />
              <Button onClick={handleAdd} size="icon" disabled={!newName.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingColumn} onOpenChange={(open) => { if (!open) setDeletingColumn(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deletingColumn?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {columns.filter((c) => c.id !== deletingColumn?.id).length > 0
                ? "Escolha onde mover os cards desta coluna antes de excluí-la."
                : "Todos os cards desta coluna ficarão sem coluna atribuída."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {columns.filter((c) => c.id !== deletingColumn?.id).length > 0 && (
            <div className="px-1">
              <Select value={moveToColumnId} onValueChange={setMoveToColumnId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mover cards para..." />
                </SelectTrigger>
                <SelectContent>
                  {columns
                    .filter((c) => c.id !== deletingColumn?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
