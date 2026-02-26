"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { deleteProject, DeleteProjectResponse } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { projectKeys } from "@/hooks/use-projects"

interface DeleteProjectDialogProps {
    projectId: string
    projectName: string
    workspaceId: string
}

export default function DeleteProjectDialog({
    projectId,
    projectName,
    workspaceId
}: DeleteProjectDialogProps) {
    const t = useTranslations("deleteProject")
    const tCommon = useTranslations("common")
    const router = useRouter()
    const queryClient = useQueryClient()
    const [step, setStep] = useState<1 | 2>(1)
    const [confirmationInput, setConfirmationInput] = useState("")
    const [isDeleting, setIsDeleting] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    // Case-insensitive name match
    const nameMatches = confirmationInput.toLowerCase() === projectName.toLowerCase()

    const handleClose = () => {
        setStep(1)
        setConfirmationInput("")
        setIsOpen(false)
    }

    const handleContinue = () => {
        setStep(2)
    }

    const handleDelete = async () => {
        if (!nameMatches) return

        setIsDeleting(true)
        try {
            const response: DeleteProjectResponse = await deleteProject(projectId)

            // Show success toast with cascade summary
            const { cascade_summary } = response
            const deletedItems = []
            if (cascade_summary.documents > 0) deletedItems.push(t("documents", { count: cascade_summary.documents }))
            if (cascade_summary.folders > 0) deletedItems.push(t("folders", { count: cascade_summary.folders }))
            if (cascade_summary.workflow_templates > 0) deletedItems.push(t("workflows", { count: cascade_summary.workflow_templates }))

            toast.success(response.message, {
                description: deletedItems.length > 0
                    ? t("alsoArchived", { items: deletedItems.join(", ") })
                    : undefined
            })

            // Invalidate relevant caches using correct query keys
            queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
            // Also invalidate all lists to ensure sidebar updates
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() })

            // Close dialog and redirect to workspace home
            handleClose()
            router.push(`/workspace/${workspaceId}`)
        } catch (error: any) {
            console.error("Failed to delete project:", error)

            // Show specific error message
            const errorMessage = error.response?.data?.detail ||
                t("deleteFailedDesc")
            toast.error(t("deleteFailed"), { description: errorMessage })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleClose()
            else setIsOpen(true)
        }}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700 text-white"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("deleteButton")}
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="sm:max-w-[500px] bg-surface-primary border-border-primary">
                {step === 1 ? (
                    // Step 1: Warning dialog
                    <>
                        <AlertDialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-red-500/20 dark:bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-red-500" />
                                </div>
                                <AlertDialogTitle className="text-xl text-text-primary">
                                    {t("title")}
                                </AlertDialogTitle>
                            </div>
                        </AlertDialogHeader>

                        {/* Content outside AlertDialogDescription to avoid p nesting issues */}
                        <div className="space-y-3 text-sm text-text-secondary">
                            <p>
                                {t("aboutToDelete")}{" "}
                                <span className="font-semibold text-text-primary">
                                    {projectName}
                                </span>
                                .
                            </p>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 dark:text-red-300">
                                <p className="font-medium mb-1">{t("thisWillArchive")}</p>
                                <ul className="list-disc list-inside space-y-0.5 text-red-400/80 dark:text-red-300/80">
                                    <li>{t("allDocuments")}</li>
                                    <li>{t("allFolders")}</li>
                                    <li>{t("allWorkflows")}</li>
                                </ul>
                            </div>
                            <p className="text-text-tertiary">
                                {t("canBeRecovered")}
                            </p>
                        </div>

                        <AlertDialogFooter className="mt-4">
                            <AlertDialogCancel onClick={handleClose} className="bg-surface-secondary border-border-primary text-text-primary hover:bg-surface-tertiary">
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <Button
                                variant="destructive"
                                onClick={handleContinue}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                {t("continue")}
                            </Button>
                        </AlertDialogFooter>
                    </>
                ) : (
                    // Step 2: Type-to-confirm dialog
                    <>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl text-text-primary">
                                {t("confirmTitle")}
                            </AlertDialogTitle>
                        </AlertDialogHeader>

                        {/* Content outside AlertDialogDescription to avoid p nesting issues */}
                        <div className="text-sm text-text-secondary">
                            <p className="mb-4">
                                {t("typeToConfirm")}{" "}
                                <span className="font-mono font-semibold text-text-primary bg-surface-tertiary px-2 py-0.5 rounded">
                                    {projectName}
                                </span>
                            </p>
                        </div>

                        <div className="py-2">
                            <Label htmlFor="project-name-confirm" className="sr-only">
                                Project name
                            </Label>
                            <Input
                                id="project-name-confirm"
                                value={confirmationInput}
                                onChange={(e) => setConfirmationInput(e.target.value)}
                                placeholder={t("placeholder")}
                                className="w-full bg-surface-secondary border-border-primary text-text-primary placeholder:text-text-tertiary"
                                autoComplete="off"
                                autoFocus
                            />
                        </div>

                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={handleClose} className="bg-surface-secondary border-border-primary text-text-primary hover:bg-surface-tertiary">
                                {tCommon("cancel")}
                            </AlertDialogCancel>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={!nameMatches || isDeleting}
                                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        {t("deleting")}
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        {t("deleteButton")}
                                    </>
                                )}
                            </Button>
                        </AlertDialogFooter>
                    </>
                )}
            </AlertDialogContent>
        </AlertDialog>
    )
}
