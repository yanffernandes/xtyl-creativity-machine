# Research: Custom Alert Dialogs

**Feature**: 014-custom-alerts
**Date**: 2025-11-30

## Executive Summary

This feature requires replacing native browser `confirm()` and `alert()` calls with custom styled components. Research confirms that the existing codebase already has the necessary infrastructure - we only need to create an imperative wrapper for confirmations and extend the toast system with type variants.

## Existing Infrastructure Analysis

### AlertDialog Component

**Location**: `frontend/src/components/ui/alert-dialog.tsx`

**Current State**:
- Based on `@radix-ui/react-alert-dialog` (v1.1.15)
- Standard Shadcn/UI implementation
- Exports: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`

**Gap**: No imperative API - currently requires declarative usage with trigger

**Decision**: Create a Promise-based wrapper using React Context that manages dialog state and resolves on user action

**Rationale**: This pattern is well-established (used by libraries like `@reach/alert-dialog`, `react-confirm-alert`) and matches the existing `toast()` imperative pattern in the codebase

**Alternatives Considered**:
1. **Sonner library**: Would require new dependency and migration of existing toast system
2. **Custom modal from scratch**: Would duplicate existing AlertDialog functionality
3. **Global event emitter**: More complex, less React-idiomatic

### Toast System

**Location**: `frontend/src/components/ui/toast.tsx`, `use-toast.ts`, `toaster.tsx`

**Current State**:
- Based on `@radix-ui/react-toast` (v1.2.15)
- Already has imperative API via `toast()` function
- Supports variants: `default`, `destructive`
- Auto-dismiss after 5 seconds (configurable via `duration`)
- Positioned top-right

**Gap**: Missing type variants for `info`, `success`, `warning`

**Decision**: Extend existing `toastVariants` with new types, add icon support per type

**Rationale**: Leverages existing infrastructure, minimal code changes, consistent developer experience

**Alternatives Considered**:
1. **Replace with Sonner**: Better API but requires migration and new dependency
2. **React Hot Toast**: Similar to current, but different styling paradigm

## Implementation Pattern Research

### Imperative Confirmation Dialog Pattern

The standard pattern for imperative confirmation dialogs in React:

```typescript
// Usage
const confirm = useConfirm();
const confirmed = await confirm({
  title: "Delete item",
  description: "Are you sure you want to delete this?",
  confirmLabel: "Delete",
  variant: "destructive"
});
if (confirmed) {
  // proceed with deletion
}
```

**Key Components**:
1. **Context Provider**: Manages dialog state, renders AlertDialog
2. **Hook**: Returns `confirm()` function that opens dialog and returns Promise
3. **Promise Resolution**: Resolves `true` on confirm, `false` on cancel/escape

**Reference Implementations**:
- [use-confirm](https://github.com/pmndrs/use-confirm) - Minimal approach
- [react-confirm-alert](https://github.com/GA-MO/react-confirm-alert) - More complex, supports custom UI

### Toast Type Variants

Standard toast types with semantic meaning:

| Type | Color | Icon | Use Case |
|------|-------|------|----------|
| default | neutral | none | General information |
| success | green | CheckCircle | Operation completed successfully |
| warning | yellow/amber | AlertTriangle | Non-blocking warning |
| error/destructive | red | XCircle | Operation failed |
| info | blue | Info | Informational message |

**Decision**: Add `success`, `warning`, `info` variants to existing toastVariants using Tailwind classes matching the design system

## Glassmorphism Styling Requirements

Per the constitution and design system:

- Backdrop blur: `backdrop-blur-2xl` (24-32px)
- Semi-transparent backgrounds: `bg-white/80 dark:bg-gray-900/80`
- Soft borders: `border border-white/20`
- Subtle shadows: `shadow-xl`
- Smooth animations: Framer Motion or CSS transitions

**AlertDialog Enhancements**:
```css
/* Current */
border bg-background shadow-lg

/* Enhanced */
border border-white/20 bg-white/90 dark:bg-gray-900/90
backdrop-blur-2xl shadow-xl
```

## Migration Strategy

### For `confirm()` calls:

**Before**:
```typescript
if (!confirm("Are you sure?")) return;
doAction();
```

**After**:
```typescript
const confirmed = await confirm({
  title: "Confirm Action",
  description: "Are you sure?"
});
if (!confirmed) return;
doAction();
```

### For `alert()` calls:

**Before**:
```typescript
alert("Maximum 20 images can be attached");
```

**After**:
```typescript
toast({
  title: "Limit reached",
  description: "Maximum 20 images can be attached",
  variant: "warning"
});
```

## Accessibility Considerations

The existing Radix AlertDialog already provides:
- Focus trap within dialog
- `role="alertdialog"`
- `aria-labelledby` and `aria-describedby`
- Escape key to dismiss
- Focus return to trigger on close

**Additional Requirements**:
- Ensure destructive actions have appropriate `aria-label` describing the action
- Toast announcements should use `aria-live="polite"` for info, `aria-live="assertive"` for errors

## Conclusion

No external research or clarification needed. The implementation path is clear:

1. Create `ConfirmDialogProvider` with Promise-based API using existing AlertDialog
2. Extend toast variants with success/warning/info
3. Migrate 17 browser alert occurrences across 10 files
4. Apply glassmorphism styling to AlertDialog content

All technical decisions are based on existing codebase patterns and industry best practices.
