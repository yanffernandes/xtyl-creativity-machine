"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Copy, Check, Share2, X, ExternalLink } from "lucide-react"
import api from "@/lib/api"

interface ShareDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    documentId: string | null
    documentTitle: string
}

export default function ShareDialog({ open, onOpenChange, documentId, documentTitle }: ShareDialogProps) {
    const [shareUrl, setShareUrl] = useState<string>("")
    const [shareToken, setShareToken] = useState<string>("")
    const [expiresAt, setExpiresAt] = useState<string | null>(null)
    const [isPublic, setIsPublic] = useState(false)
    const [copied, setCopied] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [expirationDays, setExpirationDays] = useState<string>("never")
    const { toast } = useToast()

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
                title: "Link de compartilhamento criado!",
                description: "O documento agora pode ser acessado publicamente via link"
            })
        } catch (error: any) {
            console.error("Failed to create share link:", error)
            toast({
                title: "Erro ao criar link",
                description: error.response?.data?.detail || "Não foi possível criar o link de compartilhamento",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRevokeShare = async () => {
        if (!documentId) return

        if (!confirm("Tem certeza que deseja revogar o compartilhamento? O link atual deixará de funcionar.")) {
            return
        }

        setIsLoading(true)
        try {
            await api.delete(`/documents/${documentId}/share`)

            setIsPublic(false)
            setShareUrl("")
            setShareToken("")
            setExpiresAt(null)

            toast({
                title: "Compartilhamento revogado",
                description: "O link público foi desativado"
            })
        } catch (error: any) {
            console.error("Failed to revoke share:", error)
            toast({
                title: "Erro ao revogar",
                description: error.response?.data?.detail || "Não foi possível revogar o compartilhamento",
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
                title: "Link copiado!",
                description: "O link foi copiado para a área de transferência"
            })
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            toast({
                title: "Erro ao copiar",
                description: "Não foi possível copiar o link",
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
                        Compartilhar: {documentTitle}
                    </DialogTitle>
                    <DialogDescription>
                        Crie um link público de leitura para este documento
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!isPublic ? (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="expiration">Expiração do link</Label>
                                <Select value={expirationDays} onValueChange={setExpirationDays}>
                                    <SelectTrigger id="expiration">
                                        <SelectValue placeholder="Selecione a expiração" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="never">Nunca expira</SelectItem>
                                        <SelectItem value="1">1 dia</SelectItem>
                                        <SelectItem value="7">7 dias</SelectItem>
                                        <SelectItem value="30">30 dias</SelectItem>
                                        <SelectItem value="90">90 dias</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleCreateShare}
                                disabled={isLoading}
                                className="w-full"
                            >
                                {isLoading ? "Criando..." : "Criar Link de Compartilhamento"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>Link público (somente leitura)</Label>
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
                                        title="Copiar link"
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
                                        title="Abrir em nova aba"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {expiresAt && (
                                <div className="text-sm text-muted-foreground">
                                    Expira em: {new Date(expiresAt).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    onClick={handleRevokeShare}
                                    disabled={isLoading}
                                    className="flex-1"
                                >
                                    {isLoading ? "Revogando..." : "Revogar Compartilhamento"}
                                </Button>
                            </div>

                            <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
                                <p className="font-medium mb-1">ℹ️ Informações importantes:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>Qualquer pessoa com o link pode visualizar</li>
                                    <li>O documento é somente leitura</li>
                                    <li>Você pode revogar o acesso a qualquer momento</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
