"use client"

import { useRouter } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const router = useRouter()

  return (
    <nav className={cn("flex items-center gap-2 text-sm", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={index} className="flex items-center gap-2">
            {item.href ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(item.href!)}
                className="h-7 px-2 font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.icon && <span className="mr-1.5">{item.icon}</span>}
                {item.label}
              </Button>
            ) : (
              <span
                className={cn(
                  "px-2 py-1 font-medium flex items-center",
                  isLast ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.icon && <span className="mr-1.5">{item.icon}</span>}
                {item.label}
              </span>
            )}

            {!isLast && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        )
      })}
    </nav>
  )
}
