"use client"

import { useEffect, useRef, useState } from 'react'
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
}

export default function SmartEditor({
    initialContent,
    onSave,
    suggestedContent,
    onAcceptSuggestion,
    onRejectSuggestion,
    onChange
}: SmartEditorProps) {
    const [content, setContent] = useState(initialContent)
    const [isDiffMode, setIsDiffMode] = useState(false)
    const [showEditor, setShowEditor] = useState(true) // Control editor visibility for clean unmount
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<Monaco | null>(null)
    const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

    // Handle suggested content with proper cleanup
    useEffect(() => {
        if (suggestedContent && monacoRef.current) {
            // Force unmount current editor before showing diff
            setShowEditor(false)
            setTimeout(() => {
                setIsDiffMode(true)
                setShowEditor(true)
            }, 50) // Small delay to ensure cleanup
        } else if (!suggestedContent) {
            // When exiting diff mode, dispose diff editor first
            if (diffEditorRef.current) {
                try {
                    diffEditorRef.current.dispose()
                } catch (error) {
                    // Ignore dispose errors silently
                    console.debug('DiffEditor dispose:', error)
                }
                diffEditorRef.current = null
            }

            // Then unmount diff editor if in diff mode
            if (isDiffMode) {
                setShowEditor(false)
                setTimeout(() => {
                    setIsDiffMode(false)
                    setShowEditor(true)
                }, 50)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [suggestedContent])

    // Cleanup on unmount - cancel any pending saves and dispose editors
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
                saveTimeoutRef.current = null
            }

            // Dispose diff editor if exists
            if (diffEditorRef.current) {
                try {
                    diffEditorRef.current.dispose()
                } catch (error) {
                    console.debug('DiffEditor cleanup:', error)
                }
            }

            // Dispose regular editor if exists
            if (editorRef.current) {
                try {
                    editorRef.current.dispose()
                } catch (error) {
                    console.debug('Editor cleanup:', error)
                }
            }

            // Clear refs
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
        if (suggestedContent) {
            setContent(suggestedContent)
            if (editorRef.current) {
                editorRef.current.setValue(suggestedContent)
            }
            onSave(suggestedContent)
        }
        if (onAcceptSuggestion) {
            onAcceptSuggestion()
        }
        // Trigger the cleanup via suggestedContent becoming null
        // The useEffect will handle the transition
    }

    const handleReject = () => {
        if (onRejectSuggestion) {
            onRejectSuggestion()
        }
        // Trigger the cleanup via suggestedContent becoming null
        // The useEffect will handle the transition
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
                        <Button size="sm" onClick={handleManualSave}>
                            <Save className="w-4 h-4 mr-1" />
                            Salvar
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-hidden">
                {showEditor && (
                    <>
                        {isDiffMode && suggestedContent ? (
                            <DiffEditor
                                key="diff-editor"
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
