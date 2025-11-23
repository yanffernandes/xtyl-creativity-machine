import { useState, useEffect, useRef } from 'react'
import api from '@/lib/api'
import { useToast } from '@/components/ui/use-toast'

interface Document {
    id: string
    title: string
    content?: string
    status: string
    updated_at?: string
}

export function useDocumentSync(
    documentId: string | null,
    initialContent: string,
    onContentUpdate: (content: string) => void
) {
    const [isSyncing, setIsSyncing] = useState(false)
    const lastContentRef = useRef(initialContent)
    const { toast } = useToast()

    useEffect(() => {
        lastContentRef.current = initialContent
    }, [initialContent])

    useEffect(() => {
        if (!documentId) return

        // Poll for updates every 3 seconds
        const intervalId = setInterval(async () => {
            try {
                setIsSyncing(true)
                const response = await api.get(`/documents/${documentId}`)
                const serverDoc = response.data

                // Check if content has changed on server
                if (serverDoc.content !== lastContentRef.current) {
                    console.log("Document updated on server, syncing...")
                    onContentUpdate(serverDoc.content || "")
                    lastContentRef.current = serverDoc.content || ""

                    toast({
                        title: "Document Updated",
                        description: "Content updated by AI agent.",
                    })
                }
            } catch (error) {
                console.error("Failed to sync document", error)
            } finally {
                setIsSyncing(false)
            }
        }, 3000)

        return () => clearInterval(intervalId)
    }, [documentId, onContentUpdate, toast])

    return { isSyncing }
}
