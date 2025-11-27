"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Image as ImageIcon, Download, Plus, X } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import AssetSelectorModal from "@/components/AssetSelectorModal"

interface ImageModel {
  id: string
  name: string
  description: string
  context_length?: number
  pricing?: {
    prompt?: string
    completion?: string
  }
  created?: number
}

interface TextModel {
  id: string
  name: string
}

interface GeneratedImage {
  document_id: string
  file_url: string
  thumbnail_url: string
  title: string
  generation_metadata: any
}

interface Document {
  id: string
  title: string
  content?: string
  media_type?: string
}

interface ImageGenerationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  folderId?: string
  onImageGenerated?: () => void
  documentId?: string // For refinement mode
  existingPrompt?: string
  documents?: Document[] // Available documents to choose from
}

export default function ImageGenerationPanel({
  open,
  onOpenChange,
  projectId,
  folderId,
  onImageGenerated,
  documentId,
  existingPrompt,
  documents = []
}: ImageGenerationPanelProps) {
  const [models, setModels] = useState<ImageModel[]>([])
  const [textModels, setTextModels] = useState<TextModel[]>([])
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash-image-preview")
  const [prompt, setPrompt] = useState(existingPrompt || "")
  const [title, setTitle] = useState("")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [quality, setQuality] = useState("standard")
  const [style, setStyle] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<string>("")
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string, content: string, imageUrl?: string }>>([])
  const [useAgent, setUseAgent] = useState(false)
  const [selectedReferenceAssets, setSelectedReferenceAssets] = useState<Array<{id: string, usage_mode: string, [key: string]: any}>>([])
  const [showAssetSelector, setShowAssetSelector] = useState(false)
  const { toast } = useToast()

  const isRefinementMode = !!documentId

  // Filter only text documents for prompt source
  const textDocuments = documents.filter(doc => doc.media_type !== "image")

  useEffect(() => {
    if (open) {
      loadModels()
      loadTextModels()
      // In refinement mode, start with empty prompt for new instructions
      // In normal mode, use existingPrompt if provided
      if (!isRefinementMode && existingPrompt) {
        setPrompt(existingPrompt)
      } else if (isRefinementMode) {
        setPrompt("") // Clear prompt for refinement instructions
      }
    }
  }, [open, existingPrompt, isRefinementMode])

  const loadModels = async () => {
    try {
      const response = await api.get("/image-generation/models")
      setModels(response.data)
    } catch (error) {
      console.error("Failed to load models:", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar modelos de IA",
        variant: "destructive"
      })
    }
  }

  const loadTextModels = async () => {
    try {
      const response = await api.get("/chat/models")
      setTextModels(response.data)
    } catch (error) {
      console.error("Failed to load text models:", error)
    }
  }

  const handleDocumentSelect = (docId: string) => {
    setSelectedDocument(docId)
    const doc = textDocuments.find(d => d.id === docId)
    if (doc && !useAgent) {
      // If not using agent, just use document content directly
      setPrompt(doc.content || "")
    }
  }

  const handleGenerateCreativePrompt = async () => {
    if (!selectedDocument && !prompt.trim()) {
      toast({
        title: "Atenção",
        description: "Selecione um documento ou escreva uma descrição",
        variant: "destructive"
      })
      return
    }

    setIsGeneratingPrompt(true)

    try {
      const doc = textDocuments.find(d => d.id === selectedDocument)
      const baseContent = doc?.content || prompt

      // Use a default text model or the first available one
      const modelToUse = "google/gemini-2.0-flash-001" // Default fast model

      // Call AI to generate creative prompt
      const response = await api.post("/chat/completion", {
        project_id: projectId,
        model: modelToUse,
        messages: [
          {
            role: "user",
            content: `Você é um especialista em criação de prompts para geração de imagens com IA.

Baseado no seguinte conteúdo/objetivo do criativo:

${baseContent}

Crie um prompt detalhado e criativo para geração de imagem que:
1. Descreva a cena visual de forma clara e detalhada
2. Inclua estilo artístico, iluminação, cores, composição
3. Seja otimizado para modelos de geração de imagem como Gemini, DALL-E ou Flux
4. Seja conciso mas rico em detalhes visuais

Retorne APENAS o prompt de geração de imagem, sem explicações adicionais.`
          }
        ],
        use_rag: false
      })

      const generatedPrompt = response.data.choices[0].message.content
      setPrompt(generatedPrompt)

      toast({
        title: "Prompt gerado!",
        description: "Prompt criativo gerado com sucesso"
      })
    } catch (error: any) {
      console.error("Failed to generate prompt:", error)
      toast({
        title: "Erro",
        description: "Falha ao gerar prompt criativo",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, descreva a imagem que deseja gerar",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    setGeneratedImage(null)

    try {
      let response

      if (isRefinementMode && documentId) {
        // Refine existing image (from props)
        response = await api.post("/image-generation/refine", {
          document_id: documentId,
          refinement_prompt: prompt,
          model: selectedModel,
          aspect_ratio: aspectRatio,
          quality,
          style: style || undefined,
          reference_assets: selectedReferenceAssets.length > 0
            ? selectedReferenceAssets.map(a => ({ id: a.id, usage_mode: a.usage_mode }))
            : undefined
        })
      } else if (generatedImage) {
        // Refine the currently generated image
        response = await api.post("/image-generation/refine", {
          document_id: generatedImage.document_id,
          refinement_prompt: prompt,
          model: selectedModel,
          aspect_ratio: aspectRatio,
          quality,
          style: style || undefined,
          reference_assets: selectedReferenceAssets.length > 0
            ? selectedReferenceAssets.map(a => ({ id: a.id, usage_mode: a.usage_mode }))
            : undefined
        })
      } else {
        // Generate new image
        response = await api.post("/image-generation/generate", {
          prompt,
          project_id: projectId,
          title: title || `Generated - ${new Date().toLocaleString()}`,
          model: selectedModel,
          aspect_ratio: aspectRatio,
          quality,
          style: style || undefined,
          folder_id: folderId || undefined,
          reference_assets: selectedReferenceAssets.length > 0
            ? selectedReferenceAssets.map(a => ({ id: a.id, usage_mode: a.usage_mode }))
            : undefined
        })
      }

      setGeneratedImage(response.data)

      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        {
          role: "user",
          content: prompt
        },
        {
          role: "assistant",
          content: "Imagem gerada com sucesso",
          imageUrl: response.data.file_url
        }
      ])

      toast({
        title: "Sucesso!",
        description: isRefinementMode
          ? "Imagem refinada com sucesso"
          : "Imagem gerada com sucesso"
      })

      // Notify parent
      if (onImageGenerated) {
        onImageGenerated()
      }
    } catch (error: any) {
      console.error("Image generation failed:", error)
      toast({
        title: "Erro",
        description: error.response?.data?.detail || "Falha ao gerar imagem",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    setPrompt(existingPrompt || "")
    setTitle("")
    setGeneratedImage(null)
    setConversationHistory([])
    setSelectedDocument("")
    setUseAgent(false)
    onOpenChange(false)
  }

  const handleRefine = () => {
    if (!generatedImage || !prompt.trim()) return

    // Trigger generation with current prompt as refinement
    // We need to set the documentId to the current image's ID to trigger refinement mode logic in handleGenerate
    // But handleGenerate uses the prop documentId or the state logic.
    // Let's modify handleGenerate to handle this better, or just call the API directly here.
    // Actually, simpler: just call handleGenerate.
    // But we need to ensure the backend treats it as refinement.

    // If we have a generated image, we should use its ID for refinement
    if (generatedImage) {
      // We need to temporarily set the mode or pass the ID
      // Let's update handleGenerate to check for generatedImage.document_id
      handleGenerate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isRefinementMode ? "Refinar Imagem" : "Gerar Nova Imagem"}
          </DialogTitle>
          <DialogDescription>
            {isRefinementMode
              ? "Descreva como deseja modificar a imagem existente"
              : "Use IA para criar imagens criativas para seus projetos"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Configuration */}
          <div className="space-y-4">
            {/* Document Selection */}
            {!isRefinementMode && textDocuments.length > 0 && (
              <div>
                <Label htmlFor="document">Usar conteúdo de um documento (opcional)</Label>
                <Select value={selectedDocument} onValueChange={handleDocumentSelect} disabled={isGenerating}>
                  <SelectTrigger id="document" className="mt-1">
                    <SelectValue placeholder="Selecione um documento..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {textDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* AI Agent Toggle */}
            {!isRefinementMode && (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-secondary/20">
                <input
                  type="checkbox"
                  id="use-agent"
                  checked={useAgent}
                  onChange={(e) => setUseAgent(e.target.checked)}
                  className="h-4 w-4"
                  disabled={isGenerating}
                />
                <Label htmlFor="use-agent" className="cursor-pointer flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Usar agente para criar prompt criativo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    O agente irá criar um prompt detalhado baseado no conteúdo selecionado ou na descrição fornecida
                  </p>
                </Label>
              </div>
            )}

            {/* Generate Creative Prompt Button */}
            {!isRefinementMode && useAgent && (
              <Button
                onClick={handleGenerateCreativePrompt}
                disabled={isGeneratingPrompt || isGenerating || (!selectedDocument && !prompt.trim())}
                className="w-full"
                variant="outline"
              >
                {isGeneratingPrompt ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando prompt...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Prompt Criativo
                  </>
                )}
              </Button>
            )}

            {/* Show original prompt as reference in refinement mode */}
            {isRefinementMode && existingPrompt && (
              <div className="p-3 bg-secondary/30 rounded-lg border">
                <Label className="text-xs text-muted-foreground mb-1 block">Prompt Original (referência)</Label>
                <p className="text-sm text-muted-foreground line-clamp-3">{existingPrompt}</p>
              </div>
            )}

            <div>
              <Label htmlFor="prompt">
                {isRefinementMode ? "Instruções de Refinamento" : "Descrição da Imagem"}
              </Label>
              <Textarea
                id="prompt"
                placeholder={isRefinementMode
                  ? "Ex: Mude a cor de fundo para azul e adicione mais brilho..."
                  : useAgent
                    ? "O prompt será gerado pelo agente..."
                    : "Ex: Um anúncio moderno e minimalista para um produto tech..."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] mt-1"
                disabled={isGenerating}
                readOnly={useAgent && !prompt}
              />
            </div>

            {!isRefinementMode && (
              <div>
                <Label htmlFor="title">Título do Documento (opcional)</Label>
                <Input
                  id="title"
                  placeholder="Deixe vazio para gerar automaticamente"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                  disabled={isGenerating}
                />
              </div>
            )}

            {/* Reference Assets Section - Available in both creation and refinement modes */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Imagens de Referência (opcional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAssetSelector(true)}
                    disabled={isGenerating || selectedReferenceAssets.length >= 5}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar ({selectedReferenceAssets.length}/5)
                  </Button>
                </div>

                {selectedReferenceAssets.length > 0 && (
                  <>
                    {/* Selected Assets Preview with Individual Usage Mode */}
                    <div className="space-y-3">
                      {selectedReferenceAssets.map((asset) => (
                        <div key={asset.id} className="flex gap-3 items-start p-3 border rounded-lg">
                          {/* Thumbnail */}
                          <div className="relative group shrink-0">
                            <div
                              className="w-20 h-20 rounded border-2 border-primary/20 overflow-hidden"
                              style={{
                                backgroundImage: `
                                  linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                                  linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                                  linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                                  linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                                `,
                                backgroundSize: '8px 8px',
                                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                                backgroundColor: '#ffffff'
                              }}
                            >
                              <img
                                src={asset.thumbnail_url || asset.file_url}
                                alt={asset.title}
                                className="w-full h-full object-contain p-1"
                              />
                            </div>
                          </div>

                          {/* Asset Info and Usage Mode */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate flex-1 min-w-0">{asset.title}</p>
                              <button
                                onClick={() => setSelectedReferenceAssets(prev =>
                                  prev.filter(a => a.id !== asset.id)
                                )}
                                className="text-destructive hover:bg-destructive/10 rounded p-1 shrink-0"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            <Select
                              value={asset.usage_mode}
                              onValueChange={(value) => {
                                setSelectedReferenceAssets(prev =>
                                  prev.map(a =>
                                    a.id === asset.id ? { ...a, usage_mode: value } : a
                                  )
                                )
                              }}
                            >
                              <SelectTrigger className="h-9 text-xs w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-w-[320px]">
                                <SelectItem value="style">
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">🎨 Aplicar estilo visual</span>
                                    <span className="text-xs text-muted-foreground">Usar a estética e paleta de cores</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="compose">
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">🖼️ Compor elementos</span>
                                    <span className="text-xs text-muted-foreground">Incorporar partes da imagem</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="base">
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">📐 Usar como base</span>
                                    <span className="text-xs text-muted-foreground">Modificar a partir desta imagem</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
            </div>

            <div>
              <Label htmlFor="model">Modelo de IA</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
                <SelectTrigger id="model" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] max-w-[400px]">
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col items-start max-w-full">
                        <span className="font-medium text-sm truncate max-w-[360px]">{model.name}</span>
                        {model.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[360px]">
                            {model.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="aspect-ratio">Proporção</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isGenerating}>
                  <SelectTrigger id="aspect-ratio" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1:1">
                      <div className="flex items-center gap-2">
                        <span>Quadrado</span>
                        <span className="text-xs text-muted-foreground">1024×1024</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="16:9">
                      <div className="flex items-center gap-2">
                        <span>Paisagem</span>
                        <span className="text-xs text-muted-foreground">1344×768</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="9:16">
                      <div className="flex items-center gap-2">
                        <span>Retrato</span>
                        <span className="text-xs text-muted-foreground">768×1344</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="4:3">
                      <div className="flex items-center gap-2">
                        <span>Tela 4:3</span>
                        <span className="text-xs text-muted-foreground">1184×864</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="3:4">
                      <div className="flex items-center gap-2">
                        <span>Vertical 3:4</span>
                        <span className="text-xs text-muted-foreground">864×1184</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="21:9">
                      <div className="flex items-center gap-2">
                        <span>Ultra wide</span>
                        <span className="text-xs text-muted-foreground">1536×672</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="2:3">
                      <div className="flex items-center gap-2">
                        <span>Foto 2:3</span>
                        <span className="text-xs text-muted-foreground">832×1248</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="3:2">
                      <div className="flex items-center gap-2">
                        <span>Foto 3:2</span>
                        <span className="text-xs text-muted-foreground">1248×832</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quality">Qualidade</Label>
                <Select value={quality} onValueChange={setQuality} disabled={isGenerating}>
                  <SelectTrigger id="quality" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="hd">HD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedModel === "dall-e-3" && (
              <div>
                <Label htmlFor="style">Estilo (DALL-E 3)</Label>
                <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
                  <SelectTrigger id="style" className="mt-1">
                    <SelectValue placeholder="Selecione um estilo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Padrão</SelectItem>
                    <SelectItem value="vivid">Vivid (vibrante)</SelectItem>
                    <SelectItem value="natural">Natural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Right: Preview & History */}
          <div className="flex flex-col gap-4">
            <div>
              <Label>Preview</Label>
              <Card className="mt-1 p-4 min-h-[400px] flex flex-col bg-secondary/20">
                {/* Conversation History */}
                {conversationHistory.length > 0 && (
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[300px]">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Histórico da Conversa</p>
                    {conversationHistory.map((msg, idx) => (
                      <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'user' ? (
                          <div className="bg-primary/10 rounded-lg p-2 max-w-[80%]">
                            <p className="text-xs text-muted-foreground mb-1">Você:</p>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        ) : (
                          <div className="bg-secondary rounded-lg p-2 max-w-[80%]">
                            <p className="text-xs text-muted-foreground mb-1">IA:</p>
                            {msg.imageUrl && (
                              <img
                                src={msg.imageUrl}
                                alt="Generated"
                                className="w-full h-auto rounded border mb-2"
                              />
                            )}
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Generation */}
                <div className="flex items-center justify-center flex-1 min-h-[300px]">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Gerando imagem...</p>
                      <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
                    </div>
                  ) : generatedImage ? (
                    <div className="flex flex-col gap-3 w-full">
                      <img
                        src={generatedImage.file_url}
                        alt={generatedImage.title}
                        className="w-full h-auto rounded-lg border max-h-[400px] object-contain bg-black/5"
                      />

                      {/* Refinement Input Area */}
                      <div className="flex flex-col gap-2 mt-2 p-3 bg-background rounded-lg border shadow-sm">
                        <Label htmlFor="refine-input" className="text-xs font-medium text-muted-foreground">
                          Continuar editando esta imagem
                        </Label>
                        <div className="flex gap-2">
                          <Textarea
                            id="refine-input"
                            placeholder="Ex: Mude o fundo para uma cidade futurista, adicione chuva..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="min-h-[60px] resize-none text-sm"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleRefine()
                              }
                            }}
                          />
                          <Button
                            className="h-auto self-end"
                            onClick={handleRefine}
                            disabled={!prompt.trim() || isGenerating}
                          >
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(generatedImage.file_url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ) : conversationHistory.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-16 w-16 opacity-20" />
                      <p className="text-sm">A imagem aparecerá aqui</p>
                    </div>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
            {generatedImage ? "Fechar" : "Cancelar"}
          </Button>
          {!generatedImage && (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isRefinementMode ? "Refinar" : "Gerar Imagem"}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Asset Selector Modal */}
      <AssetSelectorModal
        open={showAssetSelector}
        onOpenChange={setShowAssetSelector}
        projectId={projectId}
        maxSelection={5}
        onConfirm={(assets) => {
          // Initialize each asset with default usage_mode if not already set
          const assetsWithUsageMode = assets.map(asset => {
            const existing = selectedReferenceAssets.find(a => a.id === asset.id)
            return {
              ...asset,
              usage_mode: existing?.usage_mode || 'style'
            }
          })
          setSelectedReferenceAssets(assetsWithUsageMode)
        }}
        initialSelection={selectedReferenceAssets.map(a => a.id)}
      />
    </Dialog>
  )
}
