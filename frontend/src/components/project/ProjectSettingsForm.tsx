"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getProjectSettings, updateProjectSettings, ProjectSettings } from "@/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { projectKeys } from "@/hooks/use-projects"

interface ProjectSettingsFormProps {
    projectId: string
    workspaceId: string
}

const BRAND_VOICE_OPTIONS = [
    { value: "professional_formal", label: "Professional & Formal" },
    { value: "casual_friendly", label: "Casual & Friendly" },
    { value: "technical_precise", label: "Technical & Precise" },
    { value: "creative_playful", label: "Creative & Playful" },
    { value: "authoritative_expert", label: "Authoritative & Expert" },
    { value: "custom", label: "Custom" },
]

export default function ProjectSettingsForm({ projectId, workspaceId }: ProjectSettingsFormProps) {
    const router = useRouter()
    const { toast } = useToast()
    const queryClient = useQueryClient()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    // Form state
    const [clientName, setClientName] = useState("")
    const [description, setDescription] = useState("")
    const [targetAudience, setTargetAudience] = useState("")
    const [brandVoice, setBrandVoice] = useState("")
    const [brandVoiceCustom, setBrandVoiceCustom] = useState("")
    const [keyMessages, setKeyMessages] = useState<string[]>([])
    const [competitors, setCompetitors] = useState<string[]>([])
    const [customNotes, setCustomNotes] = useState("")

    // Validation
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Load settings
    useEffect(() => {
        loadSettings()
    }, [projectId])

    async function loadSettings() {
        try {
            setIsLoading(true)
            const settings = await getProjectSettings(projectId)
            if (settings) {
                setClientName(settings.client_name || "")
                setDescription(settings.description || "")
                setTargetAudience(settings.target_audience || "")
                setBrandVoice(settings.brand_voice || "")
                setBrandVoiceCustom(settings.brand_voice_custom || "")
                setKeyMessages(settings.key_messages || [])
                setCompetitors(settings.competitors || [])
                setCustomNotes(settings.custom_notes || "")

                // Open advanced section if any advanced fields have values
                if (settings.brand_voice || settings.key_messages?.length || settings.competitors?.length || settings.custom_notes) {
                    setShowAdvanced(true)
                }
            }
        } catch (error) {
            console.error("Error loading settings:", error)
            toast({
                title: "Error",
                description: "Failed to load project settings",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    function validate(): boolean {
        const newErrors: Record<string, string> = {}

        if (!clientName.trim()) {
            newErrors.clientName = "Client name is required"
        } else if (clientName.length > 200) {
            newErrors.clientName = "Client name must be 200 characters or less"
        }

        if (description && description.length > 2000) {
            newErrors.description = "Description must be 2000 characters or less"
        }

        if (targetAudience && targetAudience.length > 1000) {
            newErrors.targetAudience = "Target audience must be 1000 characters or less"
        }

        if (brandVoice === "custom" && brandVoiceCustom && brandVoiceCustom.length > 500) {
            newErrors.brandVoiceCustom = "Custom brand voice must be 500 characters or less"
        }

        if (customNotes && customNotes.length > 5000) {
            newErrors.customNotes = "Custom notes must be 5000 characters or less"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    async function handleSave() {
        if (!validate()) {
            toast({
                title: "Validation Error",
                description: "Please fix the errors before saving",
                variant: "destructive",
            })
            return
        }

        try {
            setIsSaving(true)

            const settings: ProjectSettings = {
                client_name: clientName.trim(),
                description: description.trim() || null,
                target_audience: targetAudience.trim() || null,
                brand_voice: brandVoice || null,
                brand_voice_custom: brandVoice === "custom" ? brandVoiceCustom.trim() || null : null,
                key_messages: keyMessages.filter(m => m.trim()).length > 0 ? keyMessages.filter(m => m.trim()) : null,
                competitors: competitors.filter(c => c.trim()).length > 0 ? competitors.filter(c => c.trim()) : null,
                custom_notes: customNotes.trim() || null,
            }

            await updateProjectSettings(projectId, settings)

            // Invalidate project cache to refresh sidebar with new project name
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() })

            toast({
                title: "Settings Saved",
                description: "Project settings have been updated successfully",
            })
        } catch (error: any) {
            console.error("Error saving settings:", error)
            toast({
                title: "Error",
                description: error.response?.data?.detail || "Failed to save project settings",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    function addKeyMessage() {
        if (keyMessages.length < 10) {
            setKeyMessages([...keyMessages, ""])
        }
    }

    function updateKeyMessage(index: number, value: string) {
        const updated = [...keyMessages]
        updated[index] = value
        setKeyMessages(updated)
    }

    function removeKeyMessage(index: number) {
        setKeyMessages(keyMessages.filter((_, i) => i !== index))
    }

    function addCompetitor() {
        if (competitors.length < 10) {
            setCompetitors([...competitors, ""])
        }
    }

    function updateCompetitor(index: number, value: string) {
        const updated = [...competitors]
        updated[index] = value
        setCompetitors(updated)
    }

    function removeCompetitor(index: number) {
        setCompetitors(competitors.filter((_, i) => i !== index))
    }

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                {/* Basic Information Skeleton */}
                <div className="bg-surface-secondary rounded-xl border border-border-primary p-6">
                    <div className="h-5 bg-surface-tertiary rounded w-40 mb-6" />
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="h-4 bg-surface-tertiary rounded w-24" />
                            <div className="h-10 bg-surface-tertiary rounded" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 bg-surface-tertiary rounded w-32" />
                            <div className="h-24 bg-surface-tertiary rounded" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 bg-surface-tertiary rounded w-28" />
                            <div className="h-20 bg-surface-tertiary rounded" />
                        </div>
                    </div>
                </div>
                {/* Advanced Settings Skeleton */}
                <div className="bg-surface-secondary rounded-xl border border-border-primary p-6">
                    <div className="h-5 bg-surface-tertiary rounded w-36" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Basic Information Card */}
            <div className="bg-surface-secondary rounded-xl border border-border-primary p-6">
                <h2 className="text-lg font-semibold text-text-primary mb-6">Basic Information</h2>

                <div className="space-y-5">
                    {/* Client Name */}
                    <div className="space-y-2">
                        <Label htmlFor="clientName" className="text-text-secondary">
                            Client Name <span className="text-accent-error">*</span>
                        </Label>
                        <Input
                            id="clientName"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Enter client or company name"
                            className={`bg-surface-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-accent-primary/20 ${errors.clientName ? "border-accent-error" : ""}`}
                        />
                        {errors.clientName && (
                            <p className="text-sm text-accent-error">{errors.clientName}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-text-secondary">
                            Project Description
                        </Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this project is about..."
                            rows={4}
                            className={`bg-surface-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-accent-primary/20 resize-none ${errors.description ? "border-accent-error" : ""}`}
                        />
                        <p className="text-xs text-text-tertiary">{description.length}/2000 characters</p>
                        {errors.description && (
                            <p className="text-sm text-accent-error">{errors.description}</p>
                        )}
                    </div>

                    {/* Target Audience */}
                    <div className="space-y-2">
                        <Label htmlFor="targetAudience" className="text-text-secondary">
                            Target Audience
                        </Label>
                        <Textarea
                            id="targetAudience"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            placeholder="Describe the target audience (e.g., young professionals aged 25-35, tech-savvy, urban dwellers...)"
                            rows={3}
                            className={`bg-surface-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-accent-primary/20 resize-none ${errors.targetAudience ? "border-accent-error" : ""}`}
                        />
                        <p className="text-xs text-text-tertiary">{targetAudience.length}/1000 characters</p>
                        {errors.targetAudience && (
                            <p className="text-sm text-accent-error">{errors.targetAudience}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Advanced Settings Card */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <div className="bg-surface-secondary rounded-xl border border-border-primary overflow-hidden">
                    <CollapsibleTrigger asChild>
                        <button className="w-full flex items-center justify-between p-6 hover:bg-surface-tertiary/50 transition-colors">
                            <h2 className="text-lg font-semibold text-text-primary">Advanced Settings</h2>
                            {showAdvanced ? (
                                <ChevronUp className="w-5 h-5 text-text-secondary" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-text-secondary" />
                            )}
                        </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <div className="px-6 pb-6 space-y-5 border-t border-border-primary">
                            {/* Brand Voice */}
                            <div className="space-y-2 pt-5">
                                <Label htmlFor="brandVoice" className="text-text-secondary">
                                    Brand Voice / Tone
                                </Label>
                                <Select value={brandVoice} onValueChange={setBrandVoice}>
                                    <SelectTrigger className="bg-surface-tertiary border-border-primary text-text-primary focus:border-accent-primary focus:ring-accent-primary/20">
                                        <SelectValue placeholder="Select a brand voice" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-surface-secondary border-border-primary">
                                        {BRAND_VOICE_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className="text-text-primary hover:bg-surface-tertiary focus:bg-surface-tertiary"
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {brandVoice === "custom" && (
                                    <div className="mt-3">
                                        <Input
                                            value={brandVoiceCustom}
                                            onChange={(e) => setBrandVoiceCustom(e.target.value)}
                                            placeholder="Describe your custom brand voice..."
                                            className={`bg-surface-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-accent-primary/20 ${errors.brandVoiceCustom ? "border-accent-error" : ""}`}
                                        />
                                        {errors.brandVoiceCustom && (
                                            <p className="text-sm text-accent-error mt-1">{errors.brandVoiceCustom}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Key Messages */}
                            <div className="space-y-2">
                                <Label className="text-text-secondary">Key Messages / Talking Points</Label>
                                <div className="space-y-2">
                                    {keyMessages.map((message, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={message}
                                                onChange={(e) => updateKeyMessage(index, e.target.value)}
                                                placeholder={`Key message ${index + 1}`}
                                                className="bg-surface-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-accent-primary/20"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeKeyMessage(index)}
                                                className="text-text-tertiary hover:text-accent-error hover:bg-accent-error/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {keyMessages.length < 10 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addKeyMessage}
                                            className="border-border-primary text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Key Message
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Competitors */}
                            <div className="space-y-2">
                                <Label className="text-text-secondary">Competitors</Label>
                                <div className="space-y-2">
                                    {competitors.map((competitor, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={competitor}
                                                onChange={(e) => updateCompetitor(index, e.target.value)}
                                                placeholder={`Competitor ${index + 1}`}
                                                className="bg-surface-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-accent-primary/20"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeCompetitor(index)}
                                                className="text-text-tertiary hover:text-accent-error hover:bg-accent-error/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {competitors.length < 10 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={addCompetitor}
                                            className="border-border-primary text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Competitor
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Custom Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="customNotes" className="text-text-secondary">
                                    Additional Notes
                                </Label>
                                <Textarea
                                    id="customNotes"
                                    value={customNotes}
                                    onChange={(e) => setCustomNotes(e.target.value)}
                                    placeholder="Any additional context that would help the AI generate better content..."
                                    rows={4}
                                    className={`bg-surface-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:ring-accent-primary/20 resize-none ${errors.customNotes ? "border-accent-error" : ""}`}
                                />
                                <p className="text-xs text-text-tertiary">{customNotes.length}/5000 characters</p>
                                {errors.customNotes && (
                                    <p className="text-sm text-accent-error">{errors.customNotes}</p>
                                )}
                            </div>
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-text-tertiary">
                    These settings will be used as context for AI-generated content in this project.
                </p>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/workspace/${workspaceId}/project/${projectId}`)}
                        className="border-border-primary text-text-secondary hover:bg-surface-tertiary hover:text-text-primary"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-accent-primary hover:bg-accent-primary/90 text-white"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Settings
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
