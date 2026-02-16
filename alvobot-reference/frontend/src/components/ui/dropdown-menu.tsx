"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  )
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  collisionPadding = 16,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          // Very high z-index to NEVER be clipped
          "z-[9999]",
          // Visual styling - EXACTLY like WorkspaceSwitcher dropdown
          "bg-[var(--color-bg-primary)]",
          "border border-[var(--color-border)]",
          "rounded-[12px]",
          "shadow-lg",
          "p-2",
          // Size
          "min-w-[8rem]",
          "max-h-[var(--radix-dropdown-menu-content-available-height)]",
          "overflow-x-hidden overflow-y-auto",
          // Transform origin
          "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
          // Smooth animations
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-1",
          "data-[side=left]:slide-in-from-right-1",
          "data-[side=right]:slide-in-from-left-1",
          "data-[side=top]:slide-in-from-bottom-1",
          className
        )}
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
          ...style,
        }}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        // Layout - like WorkspaceSwitcher workspaceItem / actionButton
        "relative flex w-full items-center gap-2",
        "cursor-pointer select-none",
        "rounded-[8px]",
        "px-3 py-2.5",
        "text-[14px]",
        "outline-none",
        "transition-colors duration-150 ease-out",
        // Colors
        "text-[var(--color-text)]",
        "bg-transparent",
        // Hover - like WorkspaceSwitcher
        "hover:bg-[var(--color-surface-hover)]",
        // Focus (keyboard)
        "focus:bg-[var(--color-surface-hover)]",
        // Destructive variant
        "data-[variant=destructive]:text-red-600",
        "data-[variant=destructive]:hover:bg-red-50",
        "data-[variant=destructive]:focus:bg-red-50",
        // Disabled
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // Inset
        "data-[inset]:pl-8",
        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-4",
        "[&_svg:not([class*='text-'])]:text-[var(--color-text-secondary)]",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        // Layout
        "relative flex w-full items-center gap-2",
        "cursor-pointer select-none",
        "rounded-[8px]",
        "py-2.5 pr-3 pl-9",
        "text-[14px]",
        "outline-none",
        "transition-colors duration-150 ease-out",
        // Colors
        "text-[var(--color-text)]",
        "bg-transparent",
        // Hover
        "hover:bg-[var(--color-surface-hover)]",
        // Focus
        "focus:bg-[var(--color-surface-hover)]",
        // Checked state
        "data-[state=checked]:bg-[var(--color-primary-light)]",
        // Disabled
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-3 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4 text-[var(--color-primary)]" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        // Layout
        "relative flex w-full items-center gap-2",
        "cursor-pointer select-none",
        "rounded-[8px]",
        "py-2.5 pr-3 pl-9",
        "text-[14px]",
        "outline-none",
        "transition-colors duration-150 ease-out",
        // Colors
        "text-[var(--color-text)]",
        "bg-transparent",
        // Hover
        "hover:bg-[var(--color-surface-hover)]",
        // Focus
        "focus:bg-[var(--color-surface-hover)]",
        // Checked state
        "data-[state=checked]:bg-[var(--color-primary-light)]",
        // Disabled
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-3 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-[var(--color-primary)] text-[var(--color-primary)]" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        // Like WorkspaceSwitcher dropdownHeader
        "px-3 py-2",
        "text-[12px] font-semibold uppercase tracking-[0.05em]",
        "text-[var(--color-text-secondary)]",
        "data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn(
        // Like WorkspaceSwitcher dropdownDivider
        "-mx-2 my-1 h-px",
        "bg-[var(--color-border)]",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-[11px] tracking-widest",
        "text-[var(--color-text-tertiary)]",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        // Layout
        "flex w-full items-center gap-2",
        "cursor-pointer select-none",
        "rounded-[8px]",
        "px-3 py-2.5",
        "text-[14px]",
        "outline-none",
        "transition-colors duration-150 ease-out",
        // Colors
        "text-[var(--color-text)]",
        "bg-transparent",
        // Hover
        "hover:bg-[var(--color-surface-hover)]",
        // Focus
        "focus:bg-[var(--color-surface-hover)]",
        // Open state
        "data-[state=open]:bg-[var(--color-surface-hover)]",
        // Inset
        "data-[inset]:pl-8",
        // Icon styling
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        "[&_svg:not([class*='size-'])]:size-4",
        "[&_svg:not([class*='text-'])]:text-[var(--color-text-secondary)]",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        // Very high z-index
        "z-[9999]",
        // Visual styling - like WorkspaceSwitcher dropdown
        "bg-[var(--color-bg-primary)]",
        "border border-[var(--color-border)]",
        "rounded-[12px]",
        "shadow-lg",
        "p-2",
        // Size
        "min-w-[8rem]",
        "overflow-hidden",
        // Transform origin
        "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
        // Smooth animations
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-1",
        "data-[side=left]:slide-in-from-right-1",
        "data-[side=right]:slide-in-from-left-1",
        "data-[side=top]:slide-in-from-bottom-1",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
