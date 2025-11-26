import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Ethereal Blue Card Component with Liquid Glass
 *
 * Updated with glassmorphism and depth:
 * - Soft rounded corners (12px - rounded-xl)
 * - Glass effect variant available
 * - Premium spacing (24px padding - space-lg)
 * - Multi-layer shadows for depth
 * - Ethereal Blue accents
 *
 * @version 2.0.0
 * @feature 001-premium-visual-redesign
 */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    clickable?: boolean
    glass?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, clickable = false, glass = false, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "rounded-xl border text-text-primary shadow-md",
                "transition-all duration-base",
                glass
                    ? "border-white/10 bg-white/40 backdrop-blur-2xl dark:bg-white/[0.03] dark:border-white/10 shadow-glass-md hover:shadow-glass-lg"
                    : "border-border-primary bg-surface-secondary shadow-md hover:shadow-lg",
                clickable && "cursor-pointer hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99]",
                className
            )}
            style={glass ? {
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            } : undefined}
            {...props}
        />
    )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-sm p-lg", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-2xl font-semibold leading-tight tracking-tight text-text-primary",
            className
        )}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-text-secondary leading-relaxed", className)}
        {...props}
    />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-lg pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-lg pt-0", className)}
        {...props}
    />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
