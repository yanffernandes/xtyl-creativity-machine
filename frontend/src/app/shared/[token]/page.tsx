"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Card } from "@/components/ui/card"
import { Loader2, Lock, Calendar, FileText } from "lucide-react"

interface SharedDocument {
    id: string
    title: string
    content: string
    media_type: string
    created_at: string
    updated_at: string
    is_shared: boolean
    read_only: boolean
}

export default function SharedDocumentPage() {
    const params = useParams()
    const token = params.token as string
    const [document, setDocument] = useState<SharedDocument | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                const response = await fetch(`${backendUrl}/documents/shared/${token}`)

                if (!response.ok) {
                    if (response.status === 404) {
                        setError("Documento não encontrado ou link inválido")
                    } else if (response.status === 410) {
                        setError("Este link expirou")
                    } else {
                        setError("Erro ao carregar documento")
                    }
                    return
                }

                const data = await response.json()
                setDocument(data)
            } catch (err) {
                setError("Erro ao conectar com o servidor")
            } finally {
                setLoading(false)
            }
        }

        if (token) {
            fetchDocument()
        }
    }, [token])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando documento...</p>
                </div>
            </div>
        )
    }

    if (error || !document) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
                <Card className="max-w-md p-8 text-center">
                    <div className="mb-4">
                        <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
                    <p className="text-muted-foreground">{error}</p>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
                <div className="container max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Documento Compartilhado</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Lock className="h-4 w-4" />
                            <span>Somente Leitura</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container max-w-4xl mx-auto px-4 py-8">
                <Card className="p-8 md:p-12 shadow-lg">
                    {/* Document Title */}
                    <div className="mb-8 pb-6 border-b">
                        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
                            {document.title}
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    Criado em {new Date(document.created_at).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            {document.updated_at && document.updated_at !== document.created_at && (
                                <span>
                                    • Atualizado em {new Date(document.updated_at).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Document Content */}
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                // Custom styling for markdown elements
                                h1: ({ node, ...props }) => (
                                    <h1 className="text-3xl font-bold mt-8 mb-4 pb-2 border-b" {...props} />
                                ),
                                h2: ({ node, ...props }) => (
                                    <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />
                                ),
                                h3: ({ node, ...props }) => (
                                    <h3 className="text-xl font-bold mt-4 mb-2" {...props} />
                                ),
                                h4: ({ node, ...props }) => (
                                    <h4 className="text-lg font-semibold mt-3 mb-2" {...props} />
                                ),
                                p: ({ node, ...props }) => (
                                    <p className="mb-4 leading-7" {...props} />
                                ),
                                ul: ({ node, ...props }) => (
                                    <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
                                ),
                                ol: ({ node, ...props }) => (
                                    <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
                                ),
                                li: ({ node, ...props }) => (
                                    <li className="leading-7" {...props} />
                                ),
                                blockquote: ({ node, ...props }) => (
                                    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground" {...props} />
                                ),
                                code: ({ node, inline, ...props }: any) =>
                                    inline ? (
                                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                                    ) : (
                                        <code className="block bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono my-4" {...props} />
                                    ),
                                pre: ({ node, ...props }) => (
                                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4" {...props} />
                                ),
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-4">
                                        <table className="min-w-full divide-y divide-border" {...props} />
                                    </div>
                                ),
                                thead: ({ node, ...props }) => (
                                    <thead className="bg-muted" {...props} />
                                ),
                                th: ({ node, ...props }) => (
                                    <th className="px-4 py-3 text-left text-sm font-semibold" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                    <td className="px-4 py-3 text-sm border-t" {...props} />
                                ),
                                a: ({ node, ...props }) => (
                                    <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
                                ),
                                hr: ({ node, ...props }) => (
                                    <hr className="my-8 border-border" {...props} />
                                ),
                            }}
                        >
                            {document.content}
                        </ReactMarkdown>
                    </div>
                </Card>

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-muted-foreground">
                    <p>Este é um documento compartilhado publicamente em modo somente leitura</p>
                </div>
            </main>
        </div>
    )
}
