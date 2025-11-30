# Quickstart: Custom Alert Dialogs

**Feature**: 014-custom-alerts
**Date**: 2025-11-30

## Overview

This guide explains how to use the custom confirmation dialogs and toast notifications to replace browser native `confirm()` and `alert()` calls.

## Confirmation Dialogs

### Basic Usage

```tsx
import { useConfirm } from "@/components/confirm-dialog";

function MyComponent() {
  const confirm = useConfirm();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete Item",
      description: "Are you sure you want to delete this item? This action cannot be undone.",
    });

    if (!confirmed) return;

    // Proceed with deletion
    await deleteItem();
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### Destructive Actions

For delete, archive, or other destructive operations, use the `destructive` variant:

```tsx
const confirmed = await confirm({
  title: "Delete Workflow",
  description: "This will permanently delete the workflow and all its execution history.",
  confirmLabel: "Delete",
  cancelLabel: "Keep",
  variant: "destructive",
});
```

### Options Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `title` | string | required | Dialog title |
| `description` | string | required | Explanatory text |
| `confirmLabel` | string | "Confirm" | Confirm button text |
| `cancelLabel` | string | "Cancel" | Cancel button text |
| `variant` | "default" \| "destructive" | "default" | Button styling |

## Toast Notifications

### Basic Usage

```tsx
import { toast } from "@/components/ui/use-toast";

// Simple notification
toast({
  description: "Changes saved successfully",
});

// With title
toast({
  title: "Success",
  description: "Your document has been published.",
});
```

### Toast Variants

```tsx
// Success (green)
toast({
  title: "Upload Complete",
  description: "All files have been uploaded.",
  variant: "success",
});

// Warning (amber)
toast({
  title: "Limit Reached",
  description: "Maximum 20 images can be attached.",
  variant: "warning",
});

// Error (red)
toast({
  title: "Upload Failed",
  description: "Could not upload files. Please try again.",
  variant: "destructive",
});

// Info (blue)
toast({
  title: "Tip",
  description: "Press Ctrl+S to save quickly.",
  variant: "info",
});
```

### Custom Duration

```tsx
// Longer display (10 seconds)
toast({
  description: "This message stays longer",
  duration: 10000,
});

// No auto-dismiss (manual dismiss only)
toast({
  description: "Dismiss me manually",
  duration: 0,
});
```

## Migration Guide

### Replacing `confirm()`

**Before:**
```tsx
if (!confirm("Are you sure you want to delete this?")) {
  return;
}
deleteItem();
```

**After:**
```tsx
const confirmed = await confirm({
  title: "Confirm Deletion",
  description: "Are you sure you want to delete this?",
  variant: "destructive",
});
if (!confirmed) return;
deleteItem();
```

> **Note**: The function containing the `confirm()` call must be `async`.

### Replacing `alert()`

**Before:**
```tsx
alert("Maximum 20 images can be attached");
```

**After:**
```tsx
toast({
  title: "Limit Reached",
  description: "Maximum 20 images can be attached",
  variant: "warning",
});
```

## Setup Requirements

The providers must be in the root layout. This is already configured:

```tsx
// app/layout.tsx
import { ConfirmDialogProvider } from "@/components/confirm-dialog";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConfirmDialogProvider>
          {children}
          <Toaster />
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
```

## Keyboard Shortcuts

### Confirmation Dialog
- **Enter**: Confirm action (when confirm button is focused)
- **Escape**: Cancel and close dialog
- **Tab**: Navigate between buttons

### Toast Notifications
- **Click X**: Dismiss toast
- **Swipe right**: Dismiss toast (mobile)

## Accessibility

Both systems are fully accessible:

- **Confirmation dialogs**: Focus trap, ARIA labels, screen reader announcements
- **Toast notifications**: `aria-live` regions, dismissible via keyboard

## Common Patterns

### Confirming Before Navigation

```tsx
const handleNavigateAway = async () => {
  if (hasUnsavedChanges) {
    const confirmed = await confirm({
      title: "Unsaved Changes",
      description: "You have unsaved changes. Leave without saving?",
      confirmLabel: "Leave",
      cancelLabel: "Stay",
      variant: "destructive",
    });
    if (!confirmed) return;
  }
  router.push("/dashboard");
};
```

### Error Toast with Retry

```tsx
try {
  await saveDocument();
  toast({ description: "Saved!", variant: "success" });
} catch (error) {
  toast({
    title: "Save Failed",
    description: "Could not save document. Please try again.",
    variant: "destructive",
    action: (
      <ToastAction altText="Retry" onClick={saveDocument}>
        Retry
      </ToastAction>
    ),
  });
}
```
