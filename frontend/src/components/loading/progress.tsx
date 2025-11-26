"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Progress Indicator Component
 *
 * Premium progress bar with percentage and optional time estimates
 * Smooth animations with emerald accent color
 *
 * @version 1.0.0
 * @feature 001-premium-visual-redesign
 */

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number // 0-100
    showPercentage?: boolean
    timeEstimate?: string
    label?: string
}

export function Progress({
    value,
    showPercentage = true,
    timeEstimate,
    label,
    className,
    ...props
}: ProgressProps) {
    const clampedValue = Math.min(Math.max(value, 0), 100)

    return (
        <div className={cn("space-y-2", className)} {...props}>
            {(label || timeEstimate) && (
                <div className="flex items-center justify-between text-sm">
                    {label && <span className="text-text-secondary">{label}</span>}
                    {timeEstimate && (
                        <span className="text-text-tertiary text-xs">{timeEstimate}</span>
                    )}
                </div>
            )}

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
                <div
                    className="h-full bg-accent-primary transition-all duration-slow ease-out"
                    style={{ width: `${clampedValue}%` }}
                    role="progressbar"
                    aria-valuenow={clampedValue}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>

            {showPercentage && (
                <div className="text-right">
                    <span className="text-sm font-medium text-text-primary">
                        {Math.round(clampedValue)}%
                    </span>
                </div>
            )}
        </div>
    )
}

/**
 * Indeterminate progress bar (for unknown duration)
 */
export function ProgressIndeterminate({
    label,
    className,
    ...props
}: Omit<ProgressProps, "value">) {
    return (
        <div className={cn("space-y-2", className)} {...props}>
            {label && (
                <div className="text-sm text-text-secondary">{label}</div>
            )}

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-tertiary">
                <div
                    className="h-full w-1/3 bg-accent-primary animate-shimmer"
                    style={{
                        animation: "shimmer 2s linear infinite",
                    }}
                />
            </div>
        </div>
    )
}

/**
 * Circular progress indicator
 */
interface CircularProgressProps {
    value: number // 0-100
    size?: number
    strokeWidth?: number
    showPercentage?: boolean
    className?: string
}

export function CircularProgress({
    value,
    size = 80,
    strokeWidth = 8,
    showPercentage = true,
    className,
}: CircularProgressProps) {
    const clampedValue = Math.min(Math.max(value, 0), 100)
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (clampedValue / 100) * circumference

    return (
        <div className={cn("relative inline-flex items-center justify-center", className)}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="var(--surface-tertiary)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="var(--accent-primary)"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-slow ease-out"
                />
            </svg>
            {showPercentage && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-semibold text-text-primary">
                        {Math.round(clampedValue)}%
                    </span>
                </div>
            )}
        </div>
    )
}
