import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card component — Terra palette, clean surfaces.
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
                    ? "border-border/40 bg-surface-secondary/80 dark:bg-surface-secondary/60 shadow-sm hover:shadow-md"
                    : "border-border-primary bg-surface-secondary shadow-sm hover:shadow-md",
                clickable && "cursor-pointer hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.99]",
                className
            )}
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
