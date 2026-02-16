/**
 * Template Components (Stubs)
 *
 * TODO: Port full template components from frontend/src/components/templates/
 */

export function TemplateSelector({
  open,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: unknown[];
  isLoading: boolean;
  onSelectTemplate: (template: unknown) => void;
}) {
  if (!open) return null;
  return null;
}

export function TemplateForm({
  open,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: unknown;
  onSubmit: (templateId: string, variables: Record<string, string>) => void;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  if (!open) return null;
  return null;
}
