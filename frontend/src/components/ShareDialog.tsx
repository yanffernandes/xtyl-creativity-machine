"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { useConfirm } from "@/components/confirm-dialog"
import { Copy, Check, Share2, X, ExternalLink } from "lucide-react"
import api from "@/lib/api"
import { useFormatter } from "next-intl"

interface ShareDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    documentId: string | null
    documentTitle: string
}

export default function ShareDialog({ open, onOpenChange, documentId, documentTitle }: ShareDialogProps) {
    const t = useTranslations("share")
    const tCommon = useTranslations("common")
    const format = useFormatter()
    const [shareUrl, setShareUrl] = useState<string>("")
    const [shareToken, setShareToken] = useState<string>("")
    const [expiresAt, setExpiresAt] = useState<string | null>(null)
    const [isPublic, setIsPublic] = useState(false)
    const [copied, setCopied] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [expirationDays, setExpirationDays] = useState<string>("never")
    const { toast } = useToast()
    const confirm = useConfirm()

    useEffect(() => {
        if (open && documentId) {
            checkShareStatus()
        }
    }, [open, documentId])

    const checkShareStatus = async () => {
        if (!documentId) return

        try {
            const response = await api.get(`/documents/${documentId}`)
            const doc = response.data

            if (doc.is_public && doc.share_token) {
                setIsPublic(true)
                setShareToken(doc.share_token)
                setExpiresAt(doc.share_expires_at)
                // Use frontend URL for public viewer page
                const fullUrl = `${window.location.origin}/shared/${doc.share_token}`
                setShareUrl(fullUrl)
            } else {
                setIsPublic(false)
                setShareUrl("")
                setShareToken("")
                setExpiresAt(null)
            }
        } catch (error) {
            console.error("Failed to check share status:", error)
        }
    }

    const handleCreateShare = async () => {
        if (!documentId) return

        setIsLoading(true)
        try {
            const expiresInDays = expirationDays === "never" ? null : parseInt(expirationDays)

            const response = await api.post(`/documents/${documentId}/share`, null, {
                params: { expires_in_days: expiresInDays }
            })

            const { share_token, share_url, expires_at, is_public } = response.data

            setIsPublic(is_public)
            setShareToken(share_token)
            setExpiresAt(expires_at)
            // Use frontend URL for public viewer page
            const fullUrl = `${window.location.origin}/shared/${share_token}`
            setShareUrl(fullUrl)

            toast({
                title: t("linkCreated"),
                description: t("linkCreatedDesc")
            })
        } catch (error: any) {
            console.error("Failed to create share link:", error)
            toast({
                title: t("createError"),
                description: error.response?.data?.detail || t("createErrorDesc"),
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRevokeShare = async () => {
        if (!documentId) return

        const confirmed = await confirm({
            title: t("revokeConfirmTitle"),
            description: t("revokeConfirmDesc"),
            confirmLabel: t("revoke"),
            cancelLabel: tCommon("cancel"),
            variant: "destructive",
        })
        if (!confirmed) return

        setIsLoading(true)
        try {
            await api.delete(`/documents/${documentId}/share`)

            setIsPublic(false)
            setShareUrl("")
            setShareToken("")
            setExpiresAt(null)

            toast({
                title: t("revoked"),
                description: t("revokedDesc")
            })
        } catch (error: any) {
            console.error("Failed to revoke share:", error)
            toast({
                title: t("revokeError"),
                description: error.response?.data?.detail || t("revokeErrorDesc"),
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            toast({
                title: t("linkCopied"),
                description: t("linkCopiedDesc")
            })
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            toast({
                title: t("copyError"),
                description: t("copyErrorDesc"),
                variant: "destructive"
            })
        }
    }

    const handleOpenInNewTab = () => {
        window.open(shareUrl, '_blank')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        {t("title", { title: documentTitle })}
                    </DialogTitle>
                    <DialogDescription>
                        {t("description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!isPublic ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="expiration">{t("linkExpiration")}</Label>
                                <Select value={expirationDays} onValueChange={setExpirationDays}>
                                    <SelectTrigger id="expiration">
                                        <SelectValue placeholder={t("selectExpiration")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="never">{t("never")}</SelectItem>
                                        <SelectItem value="1">{t("oneDay")}</SelectItem>
                                        <SelectItem value="7">{t("sevenDays")}</SelectItem>
                                        <SelectItem value="30">{t("thirtyDays")}</SelectItem>
                                        <SelectItem value="90">{t("ninetyDays")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleCreateShare}
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? t("creating") : t("createLink")}
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>{t("publicLink")}</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={shareUrl}
                                        readOnly
                                        className="flex-1 font-mono text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleCopyLink}
                                        title={t("copyLink")}
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleOpenInNewTab}
                                        title={t("openNewTab")}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {expiresAt && (
                                <div className="text-sm text-muted-foreground">
                                    {t("expiresAt", { date: format.dateTime(new Date(expiresAt), { dateStyle: "long", timeStyle: "short" }) })}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    onClick={handleRevokeShare}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    {isLoading ? t("revoking") : t("revokeShare")}
                                </Button>
                            </div>

                            <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
                                <p className="font-medium mb-1">ℹ️ {t("importantInfo")}</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>{t("anyoneCanView")}</li>
                                    <li>{t("readOnly")}</li>
                                    <li>{t("canRevokeAnytime")}</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
