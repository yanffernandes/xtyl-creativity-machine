"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { DollarSign, Zap, Brain, Activity, ArrowLeft, Home, BarChart3 } from "lucide-react"
import WorkspaceSidebar from "@/components/WorkspaceSidebar"
import Breadcrumbs from "@/components/Breadcrumbs"
import { useWorkspace } from "@/hooks/use-workspaces"

interface AIUsageStats {
  total_requests: number
  total_tokens: number
  total_input_tokens: number
  total_output_tokens: number
  total_cost: number
  by_model: Record<string, { requests: number; tokens: number; cost: number }>
  by_provider: Record<string, { requests: number; tokens: number; cost: number }>
  by_request_type: Record<string, { requests: number; tokens: number; cost: number }>
}

interface AIUsageSummary {
  today: AIUsageStats
  this_week: AIUsageStats
  this_month: AIUsageStats
  all_time: AIUsageStats
}

interface AIUsageLog {
  id: string
  model: string
  provider: string
  request_type: string
  input_tokens: number
  output_tokens: number
  total_cost: number
  created_at: string
  duration_ms: number
  tool_calls: string[] | null
}

export default function AIUsagePage() {
  const params = useParams()
  const router = useRouter()
  const workspaceId = params.id as string

  const { data: workspace } = useWorkspace(workspaceId)
  const [summary, setSummary] = useState<AIUsageSummary | null>(null)
  const [logs, setLogs] = useState<AIUsageLog[]>([])
  const [loading, setLoading] = useState(true)

  const breadcrumbItems = [
    { label: workspace?.name || "Workspace", href: `/workspace/${workspaceId}`, icon: <Home className="h-3.5 w-3.5" /> },
    { label: "Uso de IA", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  ]

  useEffect(() => {
    fetchData()
  }, [workspaceId])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch summary
      const summaryRes = await api.get(`/ai-usage/summary?workspace_id=${workspaceId}`)
      setSummary(summaryRes.data)

      // Fetch recent logs
      const logsRes = await api.get(`/ai-usage/logs?workspace_id=${workspaceId}&limit=50`)
      setLogs(logsRes.data)
    } catch (error) {
      console.error("Failed to fetch AI usage data", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading || !summary) {
    return (
      <div className="flex h-screen overflow-hidden relative">
        <div className="p-3 pr-0">
          <WorkspaceSidebar className="h-[calc(100vh-24px)]" />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-6 border-b border-white/10">
            <Breadcrumbs items={breadcrumbItems} className="mb-3" />
            <div>
              <h1 className="text-3xl font-bold">Uso de IA</h1>
              <p className="text-muted-foreground">Estatísticas de uso e custos</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-3 w-32 mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden relative">
      <div className="p-3 pr-0">
        <WorkspaceSidebar className="h-[calc(100vh-24px)]" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-6 border-b border-white/10">
          <Breadcrumbs items={breadcrumbItems} className="mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Uso de IA</h1>
              <p className="text-sm text-text-secondary mt-2">
                Estatísticas de uso e custos do workspace
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push(`/workspace/${workspaceId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

      {/* Summary Cards */}
      <Tabs defaultValue="month" className="space-y-6 max-w-7xl mx-auto">
        <TabsList>
          <TabsTrigger value="today">Hoje</TabsTrigger>
          <TabsTrigger value="week">Esta Semana</TabsTrigger>
          <TabsTrigger value="month">Este Mês</TabsTrigger>
          <TabsTrigger value="all">Todo Período</TabsTrigger>
        </TabsList>

        {["today", "week", "month", "all"].map((period) => {
          const periodKey = period === "today" ? "today" : period === "week" ? "this_week" : period === "month" ? "this_month" : "all_time"
          const stats = summary[periodKey as keyof AIUsageSummary] as AIUsageStats

          return (
            <TabsContent key={period} value={period} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card glass>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Requisições</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(stats.total_requests)}</div>
                    <p className="text-xs text-muted-foreground">Chamadas à IA</p>
                  </CardContent>
                </Card>

                <Card glass>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Tokens</CardTitle>
                    <Zap className="h-4 w-4 text-accent-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(stats.total_tokens)}</div>
                    <p className="text-xs text-text-secondary">
                      {formatNumber(stats.total_input_tokens)} input + {formatNumber(stats.total_output_tokens)} output
                    </p>
                  </CardContent>
                </Card>

                <Card glass>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-accent-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCost(stats.total_cost)}</div>
                    <p className="text-xs text-text-secondary">Em USD</p>
                  </CardContent>
                </Card>

                <Card glass>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Custo Médio</CardTitle>
                    <Brain className="h-4 w-4 text-accent-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.total_requests > 0 ? formatCost(stats.total_cost / stats.total_requests) : "$0.0000"}
                    </div>
                    <p className="text-xs text-text-secondary">Por requisição</p>
                  </CardContent>
                </Card>
              </div>

              {/* Breakdown by Model */}
              <Card glass>
                <CardHeader>
                  <CardTitle className="text-lg">Uso por Modelo</CardTitle>
                  <CardDescription className="text-text-secondary mt-1">Distribuição de uso entre diferentes modelos de IA</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modelo</TableHead>
                        <TableHead className="text-right">Requisições</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(stats.by_model).length > 0 ? (
                        Object.entries(stats.by_model)
                          .sort((a, b) => b[1].cost - a[1].cost)
                          .map(([model, data]) => (
                            <TableRow key={model}>
                              <TableCell className="font-medium">{model}</TableCell>
                              <TableCell className="text-right">{formatNumber(data.requests)}</TableCell>
                              <TableCell className="text-right">{formatNumber(data.tokens)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCost(data.cost)}</TableCell>
                            </TableRow>
                          ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum dado disponível para este período
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Breakdown by Request Type */}
              <Card glass>
                <CardHeader>
                  <CardTitle className="text-lg">Uso por Tipo de Requisição</CardTitle>
                  <CardDescription className="text-text-secondary mt-1">Chat vs. Tool Calls vs. Vision</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Requisições</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(stats.by_request_type).length > 0 ? (
                        Object.entries(stats.by_request_type).map(([type, data]) => (
                          <TableRow key={type}>
                            <TableCell className="font-medium capitalize">{type}</TableCell>
                            <TableCell className="text-right">{formatNumber(data.requests)}</TableCell>
                            <TableCell className="text-right">{formatNumber(data.tokens)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCost(data.cost)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum dado disponível para este período
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Recent Logs */}
      <Card glass className="max-w-7xl mx-auto mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Requisições Recentes</CardTitle>
          <CardDescription className="text-text-secondary mt-1">Últimas 50 chamadas à IA</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Duração</TableHead>
                <TableHead>Tools</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDate(log.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{log.model.split("/")[1] || log.model}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {log.request_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatNumber(log.input_tokens + log.output_tokens)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCost(log.total_cost)}</TableCell>
                    <TableCell className="text-right text-sm">{log.duration_ms}ms</TableCell>
                    <TableCell>
                      {log.tool_calls && log.tool_calls.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {log.tool_calls.map((tool, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhuma requisição registrada ainda
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  )
}
