"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import Editor, { DiffEditor, Monaco } from '@monaco-editor/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, X, Edit2, Save } from 'lucide-react'
import { editor } from 'monaco-editor'

interface SmartEditorProps {
    initialContent: string
    onSave: (content: string) => void
    suggestedContent?: string | null
    onAcceptSuggestion?: () => void
    onRejectSuggestion?: () => void
    onChange?: (content: string) => void
    isSaving?: boolean
}

export default function SmartEditor({
    initialContent,
    onSave,
    suggestedContent,
    onAcceptSuggestion,
    onRejectSuggestion,
    onChange,
    isSaving = false
}: SmartEditorProps) {
    const [content, setContent] = useState(initialContent)
    const [isDiffMode, setIsDiffMode] = useState(false)
    const [showEditor, setShowEditor] = useState(true) // Control editor visibility for clean unmount
    const [isTransitioning, setIsTransitioning] = useState(false) // Prevent race conditions
    const [diffEditorKey, setDiffEditorKey] = useState(0) // Force new instance on each diff mode entry
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<Monaco | null>(null)
    const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isDisposingRef = useRef(false) // Track if we're already disposing

    // Update content when initialContent changes (e.g. from AI sync)
    useEffect(() => {
        if (initialContent !== content) {
            setContent(initialContent)

            if (editorRef.current && !isDiffMode) {
                const model = editorRef.current.getModel()
                if (model) {
                    // Use executeEdits to preserve undo stack
                    // We replace the entire range
                    const fullRange = model.getFullModelRange()
                    editorRef.current.executeEdits('ai-sync', [{
                        range: fullRange,
                        text: initialContent,
                        forceMoveMarkers: true
                    }])
                    // Push undo stop to make it a distinct undoable action
                    editorRef.current.pushUndoStop()
                }
            }
        }
    }, [initialContent, isDiffMode])

    // Safe cleanup function for diff editor
    const cleanupDiffEditor = useCallback(() => {
        if (isDisposingRef.current) return
        isDisposingRef.current = true

        // Clear ref first to prevent any further access
        const editorToCleanup = diffEditorRef.current
        diffEditorRef.current = null

        // Monaco DiffEditor cleanup is handled by the @monaco-editor/react library
        // We should NOT manually dispose it as that causes the "TextModel got disposed" error
        // The library's internal cleanup will handle model disposal in the correct order

        isDisposingRef.current = false
    }, [])

    // Handle suggested content with proper cleanup
    useEffect(() => {
        if (isTransitioning) return // Prevent re-entry during transitions

        if (suggestedContent && monacoRef.current && !isDiffMode) {
            setIsTransitioning(true)
            // Force unmount current editor before showing diff
            setShowEditor(false)
            setTimeout(() => {
                // Increment key to force a completely new DiffEditor instance
                setDiffEditorKey(prev => prev + 1)
                setIsDiffMode(true)
                setShowEditor(true)
                setIsTransitioning(false)
            }, 100) // Increased delay to ensure cleanup
        } else if (!suggestedContent && isDiffMode && !isTransitioning) {
            setIsTransitioning(true)

            // Clean up diff editor ref (but don't dispose - let React handle it)
            cleanupDiffEditor()

            // Hide the editor to trigger React unmount
            setShowEditor(false)

            // Use longer delay to ensure Monaco has fully cleaned up
            setTimeout(() => {
                setIsDiffMode(false)

                // Show the regular editor after ensuring diff is fully unmounted
                setTimeout(() => {
                    setShowEditor(true)
                    setIsTransitioning(false)
                }, 150)
            }, 100)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suggestedContent, isDiffMode, cleanupDiffEditor])

    // Cleanup on unmount - cancel any pending saves
    // Note: We do NOT manually dispose Monaco editors here.
    // The @monaco-editor/react library handles disposal internally.
    // Manual disposal causes the "TextModel got disposed before DiffEditorWidget" error
    // because it disrupts the library's cleanup order.
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
                saveTimeoutRef.current = null
            }

            // Clear refs without disposing - let the library handle cleanup
            editorRef.current = null
            diffEditorRef.current = null
            monacoRef.current = null
        }
    }, [])

    const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
        editorRef.current = editor
        monacoRef.current = monaco

        // Auto-save on blur (debounced)
        editor.onDidBlurEditorText(() => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
            saveTimeoutRef.current = setTimeout(() => {
                const value = editor.getValue()
                // Only save if content changed AND has actual content (prevent saving empty on unmount)
                if (value !== initialContent && value.trim().length > 0) {
                    onSave(value)
                }
                saveTimeoutRef.current = null
            }, 500)
        })

        // Cmd/Ctrl + S to save
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            onSave(editor.getValue())
        })
    }

    const handleDiffEditorDidMount = (diffEditor: editor.IStandaloneDiffEditor, monaco: Monaco) => {
        diffEditorRef.current = diffEditor
        monacoRef.current = monaco
    }

    const handleAccept = () => {
        if (isTransitioning) return // Prevent double-clicks during transition

        if (suggestedContent) {
            // Store the content we want to save
            const contentToSave = suggestedContent

            // Mark as transitioning
            setIsTransitioning(true)

            // First hide the editor to allow proper unmount
            setShowEditor(false)

            // Then update state and call callbacks after Monaco has cleaned up
            setTimeout(() => {
                setContent(contentToSave)
                onSave(contentToSave)

                // Call the accept callback which should clear suggestedContent in parent
                // The useEffect will then handle transitioning back to regular editor
                if (onAcceptSuggestion) {
                    onAcceptSuggestion()
                }
            }, 100)
        } else {
            if (onAcceptSuggestion) {
                onAcceptSuggestion()
            }
        }
    }

    const handleReject = () => {
        if (isTransitioning) return // Prevent double-clicks during transition

        // Mark as transitioning
        setIsTransitioning(true)

        // First hide the editor to allow proper unmount
        setShowEditor(false)

        // Then call the callback after Monaco has cleaned up
        setTimeout(() => {
            if (onRejectSuggestion) {
                onRejectSuggestion()
            }
        }, 100)
    }

    const handleManualSave = () => {
        if (editorRef.current) {
            onSave(editorRef.current.getValue())
        }
    }

    return (
        <Card className="flex flex-col h-full overflow-hidden border rounded-lg shadow-sm bg-background">
            <div className="flex items-center justify-between p-2 border-b bg-muted/40">
                <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Editor Markdown</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">(Ctrl/Cmd + S para salvar)</span>
                    {initialContent !== content && (
                        <span className="text-xs text-blue-500 animate-pulse ml-2">Sincronizando...</span>
                    )}
                </div>
                {isDiffMode && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground mr-2">Sugestão da IA Disponível</span>
                        <Button size="sm" variant="default" onClick={handleAccept} className="bg-green-600 hover:bg-green-700">
                            <Check className="w-4 h-4 mr-1" /> Aceitar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={handleReject}>
                            <X className="w-4 h-4 mr-1" /> Rejeitar
                        </Button>
                    </div>
                )}
                {!isDiffMode && (
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => editorRef.current?.trigger('toolbar', 'undo', null)}
                            title="Desfazer (Ctrl+Z)"
                        >
                            <span className="text-xs">Desfazer</span>
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => editorRef.current?.trigger('toolbar', 'redo', null)}
                            title="Refazer (Ctrl+Y)"
                        >
                            <span className="text-xs">Refazer</span>
                        </Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button size="sm" onClick={handleManualSave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 mr-1 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-1" />
                                    Salvar
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-hidden">
                {showEditor && (
                    <>
                        {isDiffMode && suggestedContent ? (
                            <DiffEditor
                                key={`diff-editor-${diffEditorKey}`}
                                height="100%"
                                language="markdown"
                                theme="vs-dark"
                                original={content}
                                modified={suggestedContent}
                                onMount={handleDiffEditorDidMount}
                                options={{
                                    readOnly: true,
                                    renderSideBySide: true,
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                }}
                            />
                        ) : (
                            <Editor
                                key="regular-editor"
                                height="100%"
                                language="markdown"
                                theme="vs-dark"
                                value={content}
                                onChange={(value) => {
                                    const newContent = value || ''
                                    setContent(newContent)
                                    if (onChange) {
                                        onChange(newContent)
                                    }
                                }}
                                onMount={handleEditorDidMount}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 2,
                                    insertSpaces: true,
                                }}
                            />
                        )}
                    </>
                )}
            </div>
        </Card>
    )
}
