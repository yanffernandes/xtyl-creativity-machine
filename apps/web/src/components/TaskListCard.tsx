"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Check,
    Circle,
    Loader2,
    X,
    ListTodo,
    ChevronDown,
    ChevronUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export interface TaskItem {
    id: string
    description: string
    tool_name?: string
    status: "pending" | "in_progress" | "completed" | "failed" | "skipped"
}

interface TaskListCardProps {
    tasks: TaskItem[]
    title?: string
}

export default function TaskListCard({
    tasks,
    title = "Plano de Execução"
}: TaskListCardProps) {
    const [isExpanded, setIsExpanded] = useState(true)

    const completedTasks = tasks.filter(t => t.status === "completed").length
    const failedTasks = tasks.filter(t => t.status === "failed").length
    const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

    const getStatusIcon = (status: TaskItem["status"]) => {
        switch (status) {
            case "completed":
                return <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            case "in_progress":
                return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
            case "failed":
                return <X className="h-3.5 w-3.5 text-destructive" />
            case "skipped":
                return <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
            default:
                return <Circle className="h-3.5 w-3.5 text-muted-foreground/30" />
        }
    }

    const getStatusColors = (status: TaskItem["status"]) => {
        switch (status) {
            case "completed":
                return "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40"
            case "in_progress":
                return "bg-primary/5 border-primary/20"
            case "failed":
                return "bg-destructive/5 border-destructive/20"
            default:
                return "bg-muted/30 border-border/40"
        }
    }

    return (
        <Card className="p-3 border-border/60 bg-surface-secondary">
            <div className="space-y-3">
                {/* Header */}
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10">
                            <ListTodo className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{title}</span>
                            <span className="text-xs text-muted-foreground">
                                {completedTasks}/{tasks.length} tarefas completas
                                {failedTasks > 0 && (
                                    <span className="text-destructive ml-1">
                                        ({failedTasks} falha{failedTasks > 1 ? 's' : ''})
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge
                            variant="secondary"
                            className={cn(
                                "text-xs px-2 py-0.5",
                                progressPercent === 100 && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                progressPercent > 0 && progressPercent < 100 && "bg-primary/10 text-primary"
                            )}
                        >
                            {progressPercent}%
                        </Badge>
                        {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        }
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                    <motion.div
                        className={cn(
                            "h-full rounded-full",
                            failedTasks > 0 ? "bg-gradient-to-r from-emerald-500 to-destructive" : "bg-primary"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                    />
                </div>

                {/* Task list */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-1.5 overflow-hidden"
                        >
                            {tasks.map((task, index) => (
                                <motion.div
                                    key={task.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: Math.min(index * 0.04, 0.15) }}
                                    className={cn(
                                        "flex items-start gap-2 p-2 rounded-lg border transition-all",
                                        getStatusColors(task.status)
                                    )}
                                >
                                    <div className="flex items-center justify-center w-5 h-5 mt-0.5 shrink-0">
                                        {getStatusIcon(task.status)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-xs",
                                            task.status === "completed" && "text-emerald-700 dark:text-emerald-300",
                                            task.status === "in_progress" && "text-primary font-medium",
                                            task.status === "failed" && "text-destructive",
                                            task.status === "pending" && "text-muted-foreground",
                                            task.status === "skipped" && "text-muted-foreground/60 line-through"
                                        )}>
                                            {task.description}
                                        </p>
                                        {task.tool_name && (
                                            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                                                {task.tool_name}
                                            </p>
                                        )}
                                    </div>

                                    <span className="text-[11px] text-muted-foreground shrink-0">
                                        #{index + 1}
                                    </span>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Card>
    )
}
