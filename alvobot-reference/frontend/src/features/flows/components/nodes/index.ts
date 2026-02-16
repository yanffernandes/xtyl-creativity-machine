import { CallFlowNode } from './CallFlowNode'
import { CardNode } from './CardNode'
import { CommentNode } from './CommentNode'
import { StartNode } from './StartNode'
import { TextNode } from './TextNode'
import { TrafficNode } from './TrafficNode'
import { WaitNode } from './WaitNode'

export { StartNode } from './StartNode'
export { TextNode } from './TextNode'
export { CardNode } from './CardNode'
export { WaitNode } from './WaitNode'
export { TrafficNode } from './TrafficNode'
export { CallFlowNode } from './CallFlowNode'
export { CommentNode } from './CommentNode'

// Node types registry for ReactFlow
export const nodeTypes = {
  start: StartNode,
  text: TextNode,
  card: CardNode,
  wait: WaitNode,
  traffic: TrafficNode,
  'call-flow': CallFlowNode,
  comment: CommentNode,
}
