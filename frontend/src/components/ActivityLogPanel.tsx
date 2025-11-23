"use client"

import { useState, useEffect } from "react"
import { History, User, Bot, FileEdit, FolderPlus, Trash2, RotateCcw, Move } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { activityApi, Activity } from "@/lib/folders-api"
import { useToast } from "@/components/ui/use-toast"

interface ActivityLogPanelProps {
  projectId: string
}

const actionIcons: Record<string, any> = {
  create: FolderPlus,
  update: FileEdit,
  delete: Trash2,
  restore: RotateCcw,
  move: Move
}

const actionLabels: Record<string, string> = {
  create: "Criou",
  update: "Atualizou",
  delete: "Arquivou",
  restore: "Restaurou",
  move: "Moveu"
}

export default function ActivityLogPanel({ projectId }: ActivityLogPanelProps) {
  const [open, setOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadActivities()
      loadStats()
    }
  }, [open, projectId])

  const loadActivities = async () => {
    setLoading(true)
    try {
      const response = await activityApi.getProjectRecent(projectId, 50)
      setActivities(response.activities || [])
    } catch (error) {
      console.error("Failed to load activities", error)
      toast({
        title: "Erro",
        description: "Falha ao carregar histórico de atividades",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await activityApi.getStats(projectId)
      setStats(response)
    } catch (error) {
      console.error("Failed to load stats", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora mesmo'
    if (diffMins < 60) return `${diffMins}min atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    if (diffDays < 7) return `${diffDays}d atrás`

    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEntityTypeName = (type: string) => {
    return type === 'document' ? 'documento' : 'pasta'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Atividades
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Atividades</DialogTitle>
          <DialogDescription>
            Rastreamento de todas as mudanças feitas por humanos e IA
          </DialogDescription>
        </DialogHeader>

        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total_activities}</div>
              <div className="text-xs text-muted-foreground">Total de Ações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.human_actions}</div>
              <div className="text-xs text-muted-foreground">Ações Humanas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">{stats.ai_actions}</div>
              <div className="text-xs text-muted-foreground">Ações da IA</div>
            </div>
          </div>
        )}

        <ScrollArea className="h-[450px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">Nenhuma atividade registrada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Atividades aparecem aqui conforme você trabalha
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = actionIcons[activity.action] || FileEdit
                const actionLabel = actionLabels[activity.action] || activity.action

                return (
                  <Card key={activity.id} className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Actor Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        activity.actor_type === 'ai'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {activity.actor_type === 'ai' ? (
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>

                      {/* Activity Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={activity.actor_type === 'ai' ? 'secondary' : 'default'} className="text-xs">
                            {activity.actor_type === 'ai' ? 'IA' : 'Humano'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(activity.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>
                            {actionLabel} {getEntityTypeName(activity.entity_type)}
                            {activity.entity_name && (
                              <span className="font-medium ml-1">"{activity.entity_name}"</span>
                            )}
                          </span>
                        </div>

                        {/* Changes Preview */}
                        {activity.changes && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                            <div className="font-mono text-muted-foreground">
                              {activity.action === 'update' && activity.changes.before && activity.changes.after && (
                                <div className="space-y-1">
                                  {Object.keys(activity.changes.after).map(key => (
                                    <div key={key}>
                                      <span className="text-red-500">- {key}: {JSON.stringify(activity.changes.before[key])}</span>
                                      <br />
                                      <span className="text-green-500">+ {key}: {JSON.stringify(activity.changes.after[key])}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {activity.action === 'create' && activity.changes.after && (
                                <div className="text-green-500">
                                  + {JSON.stringify(activity.changes.after, null, 2)}
                                </div>
                              )}
                              {activity.action === 'delete' && activity.changes.before && (
                                <div className="text-red-500">
                                  - {JSON.stringify(activity.changes.before, null, 2)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
