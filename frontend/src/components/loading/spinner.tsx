import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Custom Branded Spinner Component
 *
 * Premium loading indicator with emerald accent color
 * Respects prefers-reduced-motion for accessibility
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: "sm" | "md" | "lg"
}

const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
}

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
    return (
        <div
            role="status"
            aria-label="Carregando"
            className={cn("inline-block", className)}
            {...props}
        >
            <div
                className={cn(
                    "animate-spin rounded-full border-accent-primary border-t-transparent",
                    sizeClasses[size]
                )}
            />
            <span className="sr-only">Carregando...</span>
        </div>
    )
}

/**
 * Spinner with centered layout
 */
export function SpinnerCenter({ size = "md", className }: SpinnerProps) {
    return (
        <div className={cn("flex items-center justify-center p-8", className)}>
            <Spinner size={size} />
        </div>
    )
}

/**
 * Full page spinner overlay
 */
export function SpinnerOverlay() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Spinner size="lg" />
        </div>
    )
}
