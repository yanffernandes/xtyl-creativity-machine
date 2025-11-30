import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Skeleton Loader Component
 *
 * Premium skeleton loading states for content placeholders
 * Uses shimmer animation defined in animations.css
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn("skeleton rounded-md", className)}
            {...props}
        />
    )
}

/**
 * Skeleton variants for common use cases
 */

export function SkeletonText({ className, ...props }: SkeletonProps) {
    return <Skeleton className={cn("skeleton-text", className)} {...props} />
}

export function SkeletonHeading({ className, ...props }: SkeletonProps) {
    return <Skeleton className={cn("skeleton-heading", className)} {...props} />
}

export function SkeletonAvatar({ className, ...props }: SkeletonProps) {
    return <Skeleton className={cn("skeleton-avatar", className)} {...props} />
}

export function SkeletonCard({ className, ...props }: SkeletonProps) {
    return <Skeleton className={cn("skeleton-card", className)} {...props} />
}

/**
 * Composite skeleton for card loading state
 */
export function SkeletonCardContent() {
    return (
        <div className="space-y-3 p-lg">
            <SkeletonHeading className="w-3/4" />
            <SkeletonText className="w-full" />
            <SkeletonText className="w-5/6" />
            <SkeletonText className="w-4/6" />
        </div>
    )
}

/**
 * Composite skeleton for list items
 */
export function SkeletonListItem() {
    return (
        <div className="flex items-center gap-4 p-4 border-b">
            <SkeletonAvatar />
            <div className="flex-1 space-y-2">
                <SkeletonText className="w-1/3" />
                <SkeletonText className="w-2/3" />
            </div>
        </div>
    )
}

/**
 * Skeleton for workspace/project cards
 */
export function SkeletonProjectCard() {
    return (
        <div className="rounded-md border border-border-primary bg-surface-secondary p-lg space-y-4">
            <div className="flex items-start justify-between">
                <SkeletonHeading className="w-1/2" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
                <SkeletonText className="w-full" />
                <SkeletonText className="w-3/4" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
            </div>
        </div>
    )
}
