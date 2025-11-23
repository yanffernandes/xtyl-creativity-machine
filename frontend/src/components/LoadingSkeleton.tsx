"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  type?: "card" | "list" | "kanban" | "sidebar" | "editor"
  count?: number
  className?: string
}

export default function LoadingSkeleton({
  type = "card",
  count = 1,
  className
}: LoadingSkeletonProps) {
  if (type === "kanban") {
    return (
      <div className={cn("flex gap-4", className)}>
        {Array.from({ length: 4 }).map((_, colIndex) => (
          <div key={colIndex} className="min-w-[280px] w-[320px] space-y-3">
            <Skeleton className="h-8 w-32" />
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <Card key={cardIndex} className="animate-pulse">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (type === "sidebar") {
    return (
      <div className={cn("space-y-2 p-3", className)}>
        <Skeleton className="h-4 w-24 mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (type === "editor") {
    return (
      <div className={cn("space-y-3 p-6", className)}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (type === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Default: card
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
