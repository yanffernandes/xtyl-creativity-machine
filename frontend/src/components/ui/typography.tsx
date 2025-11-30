import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Premium Typography Components
 *
 * Refined typography with consistent hierarchy and spacing.
 * All headings follow 1.25 ratio scale with appropriate letter spacing.
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

// ============================================================================
// HEADINGS
// ============================================================================

export const H1 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn(
      "text-6xl font-extrabold tracking-tighter text-text-primary",
      "leading-none",
      className
    )}
    {...props}
  />
))
H1.displayName = "H1"

export const H2 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-5xl font-bold tracking-tighter text-text-primary",
      "leading-none",
      className
    )}
    {...props}
  />
))
H2.displayName = "H2"

export const H3 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-4xl font-bold tracking-tight text-text-primary",
      "leading-tight",
      className
    )}
    {...props}
  />
))
H3.displayName = "H3"

export const H4 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn(
      "text-3xl font-bold tracking-tight text-text-primary",
      "leading-tight",
      className
    )}
    {...props}
  />
))
H4.displayName = "H4"

export const H5 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "text-2xl font-semibold tracking-tight text-text-primary",
      "leading-tight",
      className
    )}
    {...props}
  />
))
H5.displayName = "H5"

export const H6 = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h6
    ref={ref}
    className={cn(
      "text-xl font-semibold tracking-tight text-text-primary",
      "leading-tight",
      className
    )}
    {...props}
  />
))
H6.displayName = "H6"

// ============================================================================
// BODY TEXT
// ============================================================================

export const Paragraph = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-base text-text-primary leading-relaxed",
      className
    )}
    {...props}
  />
))
Paragraph.displayName = "Paragraph"

export const Lead = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-lg text-text-primary leading-relaxed font-medium",
      className
    )}
    {...props}
  />
))
Lead.displayName = "Lead"

export const Muted = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-text-secondary leading-relaxed",
      className
    )}
    {...props}
  />
))
Muted.displayName = "Muted"

export const Small = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <small
    ref={ref}
    className={cn(
      "text-xs text-text-tertiary leading-normal",
      className
    )}
    {...props}
  />
))
Small.displayName = "Small"

// ============================================================================
// INLINE TEXT
// ============================================================================

export const Strong = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <strong
    ref={ref}
    className={cn("font-semibold text-text-primary", className)}
    {...props}
  />
))
Strong.displayName = "Strong"

export const Code = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <code
    ref={ref}
    className={cn(
      "relative rounded bg-surface-tertiary px-[0.3rem] py-[0.2rem]",
      "font-mono text-sm text-text-primary",
      className
    )}
    {...props}
  />
))
Code.displayName = "Code"

// ============================================================================
// LISTS
// ============================================================================

export const List = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn(
      "space-y-sm list-disc list-inside text-text-primary",
      className
    )}
    {...props}
  />
))
List.displayName = "List"

export const OrderedList = React.forwardRef<
  HTMLOListElement,
  React.HTMLAttributes<HTMLOListElement>
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn(
      "space-y-sm list-decimal list-inside text-text-primary",
      className
    )}
    {...props}
  />
))
OrderedList.displayName = "OrderedList"

export const ListItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("text-base leading-relaxed", className)}
    {...props}
  />
))
ListItem.displayName = "ListItem"

// ============================================================================
// BLOCKQUOTE
// ============================================================================

export const Blockquote = React.forwardRef<
  HTMLQuoteElement,
  React.HTMLAttributes<HTMLQuoteElement>
>(({ className, ...props }, ref) => (
  <blockquote
    ref={ref}
    className={cn(
      "border-l-2 border-accent-primary pl-lg italic text-text-secondary",
      "my-lg",
      className
    )}
    {...props}
  />
))
Blockquote.displayName = "Blockquote"
