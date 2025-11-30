# Data Model: Custom Alert Dialogs

**Feature**: 014-custom-alerts
**Date**: 2025-11-30

## Overview

This is a frontend-only feature. The "data model" consists of TypeScript interfaces and types for the confirmation dialog and toast systems.

## TypeScript Interfaces

### Confirmation Dialog

```typescript
/**
 * Options for triggering a confirmation dialog
 */
interface ConfirmOptions {
  /** Dialog title - displayed prominently */
  title: string;

  /** Descriptive text explaining the action */
  description: string;

  /** Text for the confirm button (default: "Confirm") */
  confirmLabel?: string;

  /** Text for the cancel button (default: "Cancel") */
  cancelLabel?: string;

  /** Visual variant affecting confirm button styling */
  variant?: "default" | "destructive";
}

/**
 * Return type of useConfirm hook
 */
type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;

/**
 * Internal state for ConfirmDialogProvider
 */
interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}
```

### Toast Notifications

```typescript
/**
 * Extended toast options with type variants
 */
interface ToastOptions {
  /** Optional title for the toast */
  title?: string;

  /** Main message content */
  description: string;

  /** Visual variant determining color and icon */
  variant?: "default" | "destructive" | "success" | "warning" | "info";

  /** Auto-dismiss duration in ms (default: 5000, 0 = no auto-dismiss) */
  duration?: number;

  /** Optional action button */
  action?: ToastActionElement;
}

/**
 * Toast variant styling map
 */
const toastVariantStyles = {
  default: "border bg-background text-foreground",
  destructive: "destructive border-destructive bg-destructive text-destructive-foreground",
  success: "border-green-500/50 bg-green-50 dark:bg-green-950/50 text-green-900 dark:text-green-100",
  warning: "border-amber-500/50 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100",
  info: "border-blue-500/50 bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100",
};

/**
 * Icons for each toast variant
 */
const toastVariantIcons = {
  default: null,
  destructive: XCircle,
  success: CheckCircle,
  warning: AlertTriangle,
  info: Info,
};
```

## Entity Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                    React Component Tree                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  RootLayout                                                  │
│  └── ConfirmDialogProvider  ◄─── manages ConfirmDialogState │
│      └── Toaster            ◄─── renders active toasts      │
│          └── App Content                                     │
│              └── Components using:                           │
│                  - useConfirm() → Promise<boolean>           │
│                  - toast()      → void                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## State Lifecycle

### Confirmation Dialog Flow

```
1. Component calls confirm(options)
   └── Returns Promise<boolean>

2. Provider updates state
   └── isOpen: true
   └── options: ConfirmOptions
   └── resolve: Promise resolve function

3. User interacts
   ├── Clicks Confirm → resolve(true), close dialog
   ├── Clicks Cancel  → resolve(false), close dialog
   └── Presses Escape → resolve(false), close dialog

4. Promise resolves
   └── Calling component continues execution
```

### Toast Flow

```
1. Component calls toast(options)
   └── Returns { id, dismiss, update }

2. Toast state updates
   └── New toast added to toasts array

3. Auto-dismiss timer starts
   └── Default: 5000ms

4. User interacts OR timer expires
   ├── Manual dismiss → remove from array
   └── Timer expires  → remove from array
```

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| ConfirmOptions.title | Required, non-empty | N/A (TypeScript enforces) |
| ConfirmOptions.description | Required, non-empty | N/A (TypeScript enforces) |
| ToastOptions.description | Required, non-empty | N/A (TypeScript enforces) |
| ToastOptions.duration | >= 0 | Negative values treated as 0 (no auto-dismiss) |

## No Database Changes

This feature is entirely frontend-based:
- No new database tables
- No migrations required
- No API endpoint changes
- No backend modifications
