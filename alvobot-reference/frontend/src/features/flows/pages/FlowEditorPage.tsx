import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft,
  Save,
  Download,
  Upload,
  Trash2,
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Image,
  Clock,
  GitBranch,
  Workflow,
  Play,
  ChevronLeft,
  ChevronRight,
  StickyNote,
} from 'lucide-react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Spinner, Alert } from '@/shared/components'
import { showToast } from '@/shared/components/Toast'
import { useConfirmDialog } from '@/shared/hooks'
import styles from './FlowEditorPage.module.css'
import { useDeleteFlow } from '../api/mutations'
import { useFlow, useFlowOptions } from '../api/useFlows'
import { edgeTypes } from '../components/edges'
import { FlowUtmToggle } from '../components/FlowUtmToggle'
import { nodeTypes } from '../components/nodes'
import { SaveStatusIndicator } from '../components/SaveStatusIndicator'
import { NodeEditSidebar } from '../components/sidebar'
import { useAutoSave } from '../hooks/useAutoSave'
import { useFlowEditorStore } from '../stores/flowEditorStore'
import type {
  MessengerNodeType,
  MessengerNodeData,
  TextNodeData,
  CardNodeData,
  WaitNodeData,
  TrafficNodeData,
  CallFlowNodeData,
  CommentNodeData,
  StartNodeData,
} from '../types'

// Dock items - simple list like WeWeb
const DOCK_ITEMS = [
  { type: 'text' as MessengerNodeType, label: 'Texto', icon: MessageSquare },
  { type: 'card' as MessengerNodeType, label: 'Imagem', icon: Image },
  { type: 'traffic' as MessengerNodeType, label: 'Tráfego', icon: GitBranch },
  { type: 'wait' as MessengerNodeType, label: 'Aguardar', icon: Clock },
  { type: 'call-flow' as MessengerNodeType, label: 'Chamar Fluxo', icon: Workflow },
  { type: 'comment' as MessengerNodeType, label: 'Comentário', icon: StickyNote },
]

// Default data for each node type
const getDefaultNodeData = (type: MessengerNodeType): MessengerNodeData => {
  switch (type) {
    case 'start':
      return { type: 'start' } as StartNodeData
    case 'text':
      return {
        type: 'text',
        text: '',
        messageType: 'ACCOUNT_UPDATE',
        buttons: [],
      } as TextNodeData
    case 'card':
      return {
        type: 'card',
        title: '',
        subtitle: '',
        imageUrl: '',
        imageAspectRatio: 'square',
        url: '',
        messageType: 'ACCOUNT_UPDATE',
        buttons: [],
      } as CardNodeData
    case 'wait':
      return {
        type: 'wait',
        duration: 5,
        timeUnit: 'seconds',
      } as WaitNodeData
    case 'traffic':
      return {
        type: 'traffic',
        branches: [
          { id: `branch-${Date.now()}-1`, label: 'Opcao A', percentage: 50 },
          { id: `branch-${Date.now()}-2`, label: 'Opcao B', percentage: 50 },
        ],
      } as TrafficNodeData
    case 'call-flow':
      return {
        type: 'call-flow',
        selectedFlowId: null,
      } as CallFlowNodeData
    case 'comment':
      return {
        type: 'comment',
        text: 'Comentário',
      } as CommentNodeData
    default:
      return { type: 'start' } as StartNodeData
  }
}

function FlowEditorContent() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView, zoomIn, zoomOut, getZoom } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()
  const isNew = id === 'new'

  // Get project_id from URL params for new flows
  const projectIdParam = searchParams.get('project_id')
  const projectId = projectIdParam ? parseInt(projectIdParam, 10) : undefined

  const { data: flow, isLoading } = useFlow(id || '')
  const { data: flowOptions } = useFlowOptions()
  const deleteMutation = useDeleteFlow()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  // Zustand store for flow state
  const {
    flowName,
    isActive,
    utmEnabled,
    saveError,
    initializeFlow,
    setFlowName,
    setIsActive,
    setUtmEnabled,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    updateNode: updateStoreNode,
    resetStore,
  } = useFlowEditorStore()

  // Local React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isInitialized, setIsInitialized] = useState(false)

  // Auto-save hook
  const { saveNow, isSaving } = useAutoSave({
    debounceMs: 2000,
    enabled: isInitialized && (!isNew || !!projectId),
    projectId,
    onSaveSuccess: (newFlowId) => {
      // Navigate to the new flow URL after creation
      if (isNew) {
        navigate(`/flows/${newFlowId}`, { replace: true })
      }
    },
  })

  // Edit sidebar state
  const [editingSidebar, setEditingSidebar] = useState<{
    visible: boolean
    nodeId: string
    nodeType: string
    data: MessengerNodeData
  } | null>(null)

  // Available flows for call-flow nodes (exclude current flow)
  const availableFlows = useMemo(() => {
    if (!flowOptions) return []
    return flowOptions.filter((f) => f.id !== id)
  }, [flowOptions, id])

  // Enrich nodes with flowName for call-flow nodes
  const enrichedNodes = useMemo(() => {
    return nodes.map(node => {
      if (node.type === 'call-flow') {
        const data = node.data as CallFlowNodeData
        if (data.selectedFlowId) {
          const targetFlow = availableFlows.find(f => f.id === data.selectedFlowId)
          return {
            ...node,
            data: { ...data, flowName: targetFlow?.name }
          }
        }
      }
      return node
    })
  }, [nodes, availableFlows])

  // Sanitize nodes from database (supports both VueFlow and ReactFlow formats)
  const sanitizeNodes = useCallback((rawNodes: unknown[]): Node[] => {
    if (!Array.isArray(rawNodes)) return []

    return rawNodes
      .filter((node): node is Record<string, unknown> =>
        node !== null && typeof node === 'object'
      )
      .map((node, index) => {
        // Support both VueFlow format (x, y at root) and ReactFlow format (position: {x, y})
        const position = node.position as { x?: number; y?: number } | undefined
        const validPosition = {
          x: typeof node.x === 'number' ? node.x :
             typeof position?.x === 'number' ? position.x :
             100 + (index % 3) * 300,
          y: typeof node.y === 'number' ? node.y :
             typeof position?.y === 'number' ? position.y :
             100 + Math.floor(index / 3) * 200,
        }

        const nodeId = typeof node.id === 'string' ? node.id : `node-${Date.now()}-${index}`
        const nodeType = typeof node.type === 'string' ? node.type : 'text'
        const nodeData = typeof node.data === 'object' && node.data !== null
          ? node.data
          : getDefaultNodeData(nodeType as MessengerNodeType)

        return {
          id: nodeId,
          type: nodeType,
          position: validPosition,
          data: nodeData,
        } as Node
      })
  }, [])

  // Sanitize edges/connections from database (supports both VueFlow and ReactFlow formats)
  const sanitizeEdges = useCallback((rawEdges: unknown[]): Edge[] => {
    if (!Array.isArray(rawEdges)) return []

    return rawEdges
      .filter((edge): edge is Record<string, unknown> => {
        if (edge === null || typeof edge !== 'object') return false
        const e = edge as Record<string, unknown>
        // Support both formats: source/target (ReactFlow) or from/to (VueFlow)
        const hasReactFlowFormat = typeof e.source === 'string' && typeof e.target === 'string'
        const hasVueFlowFormat = typeof e.from === 'string' && typeof e.to === 'string'
        return hasReactFlowFormat || hasVueFlowFormat
      })
      .map((edge, index) => {
        // Convert VueFlow format (from/to) to ReactFlow format (source/target)
        const source = (edge.source as string) || (edge.from as string)
        const target = (edge.target as string) || (edge.to as string)

        // Handle sourceHandle - VueFlow uses nodeId-output-N format
        let sourceHandle = edge.sourceHandle as string | undefined
        if (sourceHandle && sourceHandle.includes('-output-')) {
          // Extract just the output index part for our format
          const match = sourceHandle.match(/-output-(\d+)$/)
          if (match) {
            sourceHandle = `source-${match[1]}`
          }
        }

        return {
          id: typeof edge.id === 'string' ? edge.id : `edge-${source}-${target}-${index}`,
          source,
          target,
          sourceHandle: sourceHandle || 'source',
          targetHandle: (edge.targetHandle as string) || 'target',
          type: 'custom',
          markerEnd: { type: MarkerType.ArrowClosed },
        } as Edge
      })
  }, [])

  // Load flow data and initialize store
  useEffect(() => {
    if (flow) {
      const loadedNodes = sanitizeNodes(flow.nodes as unknown[])
      const loadedEdges = sanitizeEdges(flow.edges as unknown[])

      // Initialize the store with loaded data
      initializeFlow(
        flow.id,
        flow.name,
        loadedNodes,
        loadedEdges,
        flow.is_active || false,
        flow.utm_enabled ?? true // Default to true if not set
      )

      // Set local React Flow state
      setNodes(loadedNodes)
      setEdges(loadedEdges)

      // Update node internals after a short delay to ensure handles are registered
      setTimeout(() => {
        loadedNodes.forEach((node) => {
          updateNodeInternals(node.id)
        })
        setIsInitialized(true)
      }, 100)
    } else if (isNew) {
      // Initialize for new flow
      initializeFlow(null, 'Novo Fluxo', [], [], false)
      setNodes([])
      setEdges([])
      setIsInitialized(true)
    }

    // Cleanup on unmount
    return () => {
      resetStore()
    }
  }, [flow, isNew, setNodes, setEdges, sanitizeNodes, sanitizeEdges, updateNodeInternals, initializeFlow, resetStore])

  // Sync nodes changes to store (for auto-save) - only after initialization
  useEffect(() => {
    if (isInitialized) {
      setStoreNodes(nodes)
      setStoreEdges(edges)
    }
  }, [nodes, edges, setStoreNodes, setStoreEdges, isInitialized])

  // Update zoom display
  useEffect(() => {
    const interval = setInterval(() => {
      setZoom(getZoom())
    }, 100)
    return () => clearInterval(interval)
  }, [getZoom])

  // Handle connection
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        type: 'custom',
        markerEnd: { type: MarkerType.ArrowClosed },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  // Add node at position
  const addNode = useCallback(
    (type: MessengerNodeType, position?: { x: number; y: number }) => {
      if (type === 'start' && nodes.some((n) => n.type === 'start')) {
        showToast.warning('Só pode haver um nó de início por fluxo')
        return
      }

      const pos = position || { x: 250, y: nodes.length * 150 + 50 }
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position: pos,
        data: getDefaultNodeData(type),
      }

      setNodes((nds) => [...nds, newNode])
    },
    [nodes, setNodes]
  )

  // Handle drag and drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/reactflow') as MessengerNodeType
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addNode(type, position)
    },
    [screenToFlowPosition, addNode]
  )

  const onDragStart = useCallback((type: MessengerNodeType, event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  // Node operations
  const deleteNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId)
      if (node?.type === 'start') {
        showToast.warning('O nó de início não pode ser deletado')
        return
      }
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    },
    [nodes, setNodes, setEdges]
  )

  const editNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return

      setEditingSidebar({
        visible: true,
        nodeId,
        nodeType: node.type || '',
        data: node.data as MessengerNodeData,
      })
    },
    [nodes]
  )

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId)
      if (!node || node.type === 'start') return

      const newId = `${node.type}-${Date.now()}`
      const newNode = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        selected: false,
        data: JSON.parse(JSON.stringify(node.data)),
      }

      setNodes((nds) => [...nds, newNode])
    },
    [nodes, setNodes]
  )

  const saveNodeEdit = useCallback(
    (nodeId: string, data: MessengerNodeData) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
      )
      updateStoreNode(nodeId, data)
    },
    [setNodes, updateStoreNode]
  )

  // Handle custom events from nodes
  useEffect(() => {
    const handleEditNode = (e: CustomEvent) => editNode(e.detail.nodeId)
    const handleDeleteNode = (e: CustomEvent) => deleteNode(e.detail.nodeId)
    const handleDuplicateNode = (e: CustomEvent) => duplicateNode(e.detail.nodeId)
    const handleDeleteEdge = (e: CustomEvent) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== e.detail?.edgeId))
    }

    document.addEventListener('flow:editNode', handleEditNode as EventListener)
    document.addEventListener('flow:deleteNode', handleDeleteNode as EventListener)
    document.addEventListener('flow:duplicateNode', handleDuplicateNode as EventListener)
    document.addEventListener('flow:deleteEdge', handleDeleteEdge as EventListener)

    return () => {
      document.removeEventListener('flow:editNode', handleEditNode as EventListener)
      document.removeEventListener('flow:deleteNode', handleDeleteNode as EventListener)
      document.removeEventListener('flow:duplicateNode', handleDuplicateNode as EventListener)
      document.removeEventListener('flow:deleteEdge', handleDeleteEdge as EventListener)
    }
  }, [editNode, deleteNode, duplicateNode, setEdges])

  // Manual save (immediate)
  const handleSave = () => {
    if (!flowName.trim()) {
      showToast.warning('Por favor, insira um nome para o fluxo')
      return
    }
    saveNow()
  }

  // Delete flow
  const handleDelete = async () => {
    if (!id || isNew) return

    const confirmed = await confirm({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir este fluxo? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      await deleteMutation.mutateAsync({ id, name: flowName })
      navigate('/flows')
    } catch (error) {
      console.error('Failed to delete flow:', error)
    }
  }

  // Export/Import
  const handleExport = () => {
    const flowData = { name: flowName, nodes, edges }
    const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flowName || 'flow'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string)
          if (data.nodes && data.edges) {
            setNodes(data.nodes)
            setEdges(data.edges)
            if (data.name) setFlowName(data.name)
          }
        } catch {
          showToast.error('Erro ao importar fluxo. Verifique o formato do arquivo.')
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // Zoom controls
  const handleZoomIn = () => zoomIn()
  const handleZoomOut = () => zoomOut()
  const handleFitView = () => fitView({ padding: 0.2 })
  const handleResetView = () => {
    fitView({ padding: 0.2 })
  }

  // Handle flow name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFlowName(e.target.value)
  }

  // Handle active toggle
  const handleToggleActive = () => {
    setIsActive(!isActive)
  }

  if (isLoading && !isNew) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <ConfirmDialog />
      {/* Header - WeWeb style */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backBtn}
            onClick={() => navigate('/flows')}
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>

          <div className={styles.headerInfo}>
            <input
              type="text"
              value={flowName}
              onChange={handleNameChange}
              className={styles.headerTitleInput}
              placeholder="Nome do fluxo"
            />
            <p className={styles.headerSubtitle}>
              {isNew ? 'Novo fluxo' : 'Editando fluxo'}
            </p>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* Save Status Indicator */}
          <SaveStatusIndicator />

          <div className={styles.headerDivider} />

          {/* Toggle Ativo/Inativo */}
          <button
            className={`${styles.toggleBtn} ${isActive ? styles.active : ''}`}
            onClick={handleToggleActive}
          >
            <span className={styles.toggleDot} />
            <span>{isActive ? 'Ativo' : 'Inativo'}</span>
          </button>

          <div className={styles.headerDivider} />

          {/* UTM Toggle */}
          <FlowUtmToggle enabled={utmEnabled} onChange={setUtmEnabled} />

          <div className={styles.headerDivider} />

          <button
            className={styles.iconBtn}
            onClick={handleDelete}
            disabled={isNew || deleteMutation.isPending}
            title="Deletar"
          >
            <Trash2 size={18} />
          </button>

          <button
            className={styles.iconBtn}
            onClick={handleSave}
            disabled={isSaving}
            title="Salvar agora"
          >
            <Save size={18} />
          </button>

          <button className={styles.iconBtn} onClick={handleExport} title="Baixar">
            <Download size={18} />
          </button>

          <button className={styles.iconBtn} onClick={handleImport} title="Upload">
            <Upload size={18} />
          </button>
        </div>
      </header>

      {/* Alert for errors */}
      {saveError && (
        <Alert variant="error" className={styles.alert}>
          Erro ao salvar: {saveError}
        </Alert>
      )}

      {/* Canvas Area */}
      <div className={styles.canvasArea} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={enrichedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            type: 'custom',
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          connectionLineStyle={{ stroke: '#52525B', strokeWidth: 2, strokeDasharray: '5,5' }}
          className={styles.reactFlow}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(0,0,0,0.1)"
          />
          <MiniMap
            nodeStrokeWidth={3}
            zoomable
            pannable
            className={styles.minimap}
          />
        </ReactFlow>

        {/* Floating Components Dock - WeWeb style */}
        <div className={`${styles.dock} ${dockCollapsed ? styles.collapsed : ''}`}>
          <button
            className={styles.dockCollapseBtn}
            onClick={() => setDockCollapsed(!dockCollapsed)}
          >
            {dockCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className={styles.dockItems}>
            {DOCK_ITEMS.map((item) => (
              <button
                key={item.type}
                className={styles.dockItem}
                draggable
                onDragStart={(e) => onDragStart(item.type, e)}
                onClick={() => addNode(item.type)}
                title={item.label}
              >
                <div className={styles.dockItemIcon}>
                  <item.icon size={18} />
                </div>
                {!dockCollapsed && (
                  <span className={styles.dockItemLabel}>{item.label}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom Controls - Left side vertical */}
        <div className={styles.zoomControls}>
          <button className={styles.zoomBtn} onClick={handleResetView} title="Reset">
            <RotateCcw size={16} />
          </button>
          <button className={styles.zoomBtn} onClick={handleFitView} title="Auto layout">
            <Sparkles size={16} />
          </button>
          <div className={styles.zoomDivider} />
          <button className={styles.zoomBtn} onClick={handleZoomIn} title="Zoom in">
            <Plus size={16} />
          </button>
          <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
          <button className={styles.zoomBtn} onClick={handleZoomOut} title="Zoom out">
            <Minus size={16} />
          </button>
          <div className={styles.zoomDivider} />
          <button className={styles.zoomBtn} onClick={handleFitView} title="Fit">
            <Maximize2 size={16} />
          </button>
        </div>

        {/* Empty State */}
        {nodes.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Play size={32} />
            </div>
            <h3>Comece seu fluxo</h3>
            <p>Arraste um componente do painel ou clique abaixo</p>
            <button className={styles.emptyBtn} onClick={() => addNode('start')}>
              <Plus size={18} />
              Adicionar Inicio
            </button>
          </div>
        )}

        {/* Edit Sidebar */}
        {editingSidebar?.visible && (
          <NodeEditSidebar
            nodeId={editingSidebar.nodeId}
            nodeType={editingSidebar.nodeType}
            data={editingSidebar.data}
            availableFlows={availableFlows}
            onSave={saveNodeEdit}
            onClose={() => setEditingSidebar(null)}
          />
        )}
      </div>
    </div>
  )
}

export function FlowEditorPage() {
  return (
    <ReactFlowProvider>
      <FlowEditorContent />
    </ReactFlowProvider>
  )
}
