"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Image, User, Layers, Package, HelpCircle, Bookmark } from "lucide-react"
import type { AssetCategory } from "@/lib/api"

interface CategoryBadgeProps {
    category?: AssetCategory | null
    size?: "sm" | "md" | "lg"
    showIcon?: boolean
    className?: string
}

const CATEGORY_CONFIG: Record<string, {
    label: string
    icon: React.ElementType
    bgColor: string
    textColor: string
    borderColor: string
}> = {
    Logo: {
        label: "Logo",
        icon: Image,
        bgColor: "bg-blue-500/10",
        textColor: "text-blue-600 dark:text-blue-400",
        borderColor: "border-blue-500/30"
    },
    Pessoa: {
        label: "Pessoa",
        icon: User,
        bgColor: "bg-purple-500/10",
        textColor: "text-purple-600 dark:text-purple-400",
        borderColor: "border-purple-500/30"
    },
    Background: {
        label: "Background",
        icon: Layers,
        bgColor: "bg-green-500/10",
        textColor: "text-green-600 dark:text-green-400",
        borderColor: "border-green-500/30"
    },
    Produto: {
        label: "Produto",
        icon: Package,
        bgColor: "bg-orange-500/10",
        textColor: "text-orange-600 dark:text-orange-400",
        borderColor: "border-orange-500/30"
    },
    "Referência": {
        label: "Referência",
        icon: Bookmark,
        bgColor: "bg-pink-500/10",
        textColor: "text-pink-600 dark:text-pink-400",
        borderColor: "border-pink-500/30"
    },
    Outro: {
        label: "Outro",
        icon: HelpCircle,
        bgColor: "bg-gray-500/10",
        textColor: "text-gray-600 dark:text-gray-400",
        borderColor: "border-gray-500/30"
    }
}

const SIZE_CLASSES = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5"
}

const ICON_SIZES = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
}

export default function CategoryBadge({
    category,
    size = "md",
    showIcon = true,
    className
}: CategoryBadgeProps) {
    if (!category) {
        return (
            <Badge
                variant="outline"
                className={cn(
                    "bg-gray-500/10 text-gray-500 border-gray-500/30",
                    SIZE_CLASSES[size],
                    className
                )}
            >
                {showIcon && <HelpCircle className={cn(ICON_SIZES[size], "mr-1")} />}
                Não classificado
            </Badge>
        )
    }

    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.Outro
    const Icon = config.icon

    return (
        <Badge
            variant="outline"
            className={cn(
                config.bgColor,
                config.textColor,
                config.borderColor,
                SIZE_CLASSES[size],
                className
            )}
        >
            {showIcon && <Icon className={cn(ICON_SIZES[size], "mr-1")} />}
            {config.label}
        </Badge>
    )
}

export { CATEGORY_CONFIG }
