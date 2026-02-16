import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  ReactFlowProvider,
  SmoothStepEdge,
  BezierEdge,
  StraightEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Explicitly define edge types
const edgeTypes = {
  smoothstep: SmoothStepEdge,
  default: BezierEdge,
  straight: StraightEdge,
}

// Simple test nodes
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { label: 'Node 1' },
  },
  {
    id: '2',
    type: 'default',
    position: { x: 400, y: 100 },
    data: { label: 'Node 2' },
  },
  {
    id: '3',
    type: 'default',
    position: { x: 250, y: 300 },
    data: { label: 'Node 3' },
  },
]

// Simple test edges - with explicit visible styles
const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    label: 'Edge 1-2',
    style: { stroke: '#ff0000', strokeWidth: 3 }, // RED - very visible!
  },
  {
    id: 'e1-3',
    source: '1',
    target: '3',
    label: 'Edge 1-3',
    style: { stroke: '#00ff00', strokeWidth: 3 }, // GREEN - very visible!
  },
]

function TestFlowContent() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Debug: Log edges on mount and changes
  useEffect(() => {
    console.info('=== TEST PAGE DEBUG ===')
    console.info('Nodes:', nodes)
    console.info('Edges:', edges)

    // Check if React Flow styles are loaded
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
    console.info('Stylesheets loaded:', styles.length)

    // Check for React Flow elements in DOM
    setTimeout(() => {
      const rfContainer = document.querySelector('.react-flow')
      const edgesContainer = document.querySelector('.react-flow__edges')
      const edgePaths = document.querySelectorAll('.react-flow__edge-path')

      console.info('React Flow container:', rfContainer)
      console.info('Edges container:', edgesContainer)
      console.info('Edge paths found:', edgePaths.length)

      if (edgesContainer) {
        console.info('Edges container HTML:', edgesContainer.innerHTML)
      }

      // Check computed styles on edge paths
      edgePaths.forEach((path, i) => {
        const computed = window.getComputedStyle(path)
        console.info(`Edge path ${i} computed styles:`, {
          stroke: computed.stroke,
          strokeWidth: computed.strokeWidth,
          fill: computed.fill,
          visibility: computed.visibility,
          display: computed.display,
          opacity: computed.opacity,
        })
      })
    }, 1000)
  }, [nodes, edges])

  const onConnect = useCallback(
    (params: Connection) => {
      console.info('New connection:', params)
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges]
  )

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#f8fafc' }}>
      <div style={{ padding: '16px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>React Flow Test Page</h1>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
          Nodes: {nodes.length} | Edges: {edges.length} | Check console for debug info
        </p>
      </div>

      <div style={{ width: '100%', height: 'calc(100vh - 80px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          edgeTypes={edgeTypes}
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}

export function TestFlowPage() {
  return (
    <ReactFlowProvider>
      <TestFlowContent />
    </ReactFlowProvider>
  )
}
