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

    // Calculate progress
    const completedTasks = tasks.filter(t => t.status === "completed").length
    const failedTasks = tasks.filter(t => t.status === "failed").length
    const progressPercent = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

    // Get status icon for each task
    const getStatusIcon = (status: TaskItem["status"]) => {
        switch (status) {
            case "completed":
                return <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            case "in_progress":
                return <Loader2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
            case "failed":
                return <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            case "skipped":
                return <Circle className="h-3.5 w-3.5 text-gray-400" />
            default:
                return <Circle className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
        }
    }

    // Get status colors
    const getStatusColors = (status: TaskItem["status"]) => {
        switch (status) {
            case "completed":
                return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
            case "in_progress":
                return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
            case "failed":
                return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            default:
                return "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800"
        }
    }

    return (
        <Card className="p-3 border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20">
            <div className="space-y-3">
                {/* Header */}
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30">
                            <ListTodo className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{title}</span>
                            <span className="text-xs text-muted-foreground">
                                {completedTasks}/{tasks.length} tarefas completas
                                {failedTasks > 0 && <span className="text-red-500 ml-1">({failedTasks} falha{failedTasks > 1 ? 's' : ''})</span>}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge
                            variant="secondary"
                            className={cn(
                                "text-xs px-2 py-0.5",
                                progressPercent === 100 && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                progressPercent > 0 && progressPercent < 100 && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            )}
                        >
                            {progressPercent}%
                        </Badge>
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                        className={cn(
                            "h-full rounded-full",
                            failedTasks > 0 ? "bg-gradient-to-r from-green-500 to-red-500" : "bg-gradient-to-r from-purple-500 to-indigo-500"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
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
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={cn(
                                        "flex items-start gap-2 p-2 rounded-lg border transition-all",
                                        getStatusColors(task.status)
                                    )}
                                >
                                    {/* Status icon with animation */}
                                    <motion.div
                                        className="flex items-center justify-center w-5 h-5 mt-0.5 rounded-full shrink-0"
                                        animate={task.status === "completed" ? { scale: [1, 1.2, 1] } : {}}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {getStatusIcon(task.status)}
                                    </motion.div>

                                    {/* Task description */}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-xs",
                                            task.status === "completed" && "text-green-700 dark:text-green-300",
                                            task.status === "in_progress" && "text-blue-700 dark:text-blue-300 font-medium",
                                            task.status === "failed" && "text-red-700 dark:text-red-300",
                                            task.status === "pending" && "text-gray-600 dark:text-gray-400",
                                            task.status === "skipped" && "text-gray-400 line-through"
                                        )}>
                                            {task.description}
                                        </p>
                                        {task.tool_name && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                                {task.tool_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Task number */}
                                    <span className="text-[10px] text-muted-foreground shrink-0">
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
