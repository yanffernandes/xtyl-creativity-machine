"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, User, FileText, ArrowLeft } from "lucide-react"
import type { Template, TemplateVariable } from "@/types/supabase"

interface TemplateFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: Template | null
  onSubmit: (templateId: string, variables: Record<string, string>) => Promise<void>
  onBack?: () => void
  isSubmitting?: boolean
}

export default function TemplateForm({
  open,
  onOpenChange,
  template,
  onSubmit,
  onBack,
  isSubmitting = false,
}: TemplateFormProps) {
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!template) return null

  const variables = template.variables || []

  const handleChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
    // Clear error when user types
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const newErrors: Record<string, string> = {}
    variables.forEach(v => {
      if (v.required !== false && !formValues[v.key]?.trim()) {
        newErrors[v.key] = `${v.label} e obrigatorio`
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    await onSubmit(template.id, formValues)
  }

  const handleBack = () => {
    setFormValues({})
    setErrors({})
    onBack?.()
  }

  const renderField = (variable: TemplateVariable) => {
    const { key, label, type, placeholder, options, required } = variable
    const value = formValues[key] || ""
    const error = errors[key]

    switch (type) {
      case "textarea":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="flex items-center gap-1">
              {label}
              {required !== false && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={key}
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              className={error ? "border-destructive" : ""}
              rows={4}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )

      case "select":
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="flex items-center gap-1">
              {label}
              {required !== false && <span className="text-destructive">*</span>}
            </Label>
            <Select value={value} onValueChange={(v) => handleChange(key, v)}>
              <SelectTrigger className={error ? "border-destructive" : ""}>
                <SelectValue placeholder={placeholder || `Selecione ${label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )

      default: // text
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="flex items-center gap-1">
              {label}
              {required !== false && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={key}
              value={value}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              className={error ? "border-destructive" : ""}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl">{template.icon || "📄"}</span>
              <div>
                <DialogTitle>{template.name}</DialogTitle>
                {template.expert_name && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <User className="h-3 w-3" />
                    {template.expert_name}
                  </div>
                )}
              </div>
            </div>
          </div>
          {template.description && (
            <DialogDescription className="mt-2">
              {template.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Template metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-b pb-4">
          {template.estimated_outputs && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>Resultados: {template.estimated_outputs}</span>
            </div>
          )}
          {template.tags && template.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
            {variables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Este template nao requer campos adicionais.
              </p>
            ) : (
              variables.map(renderField)
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isSubmitting ? "Iniciando..." : "Iniciar Conversa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
