import { useMemo } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import {
  Background,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { usePipelineStream } from './usePipelineStream'
import { PIPELINE_EDGES, PIPELINE_STEPS } from './workflow-data'

type WorkflowNodeData = {
  label: string
  step: number
  active: boolean
}

type WorkflowNode = Node<WorkflowNodeData, 'workflow-step'>

function WorkflowStepNode({ data }: NodeProps<WorkflowNode>) {
  const nodeClassName = `workflow-flow__node ${data.active ? 'workflow-step--active' : ''}`

  return (
    <div className={nodeClassName}>
      <Handle className="workflow-flow__handle" type="target" position={Position.Left} />
      <div className="workflow-flow__node-card">{data.label}</div>
      <span className="workflow-flow__node-number">{data.step}</span>
      <Handle className="workflow-flow__handle" type="source" position={Position.Right} />
    </div>
  )
}

const NODE_TYPES: NodeTypes = {
  'workflow-step': WorkflowStepNode,
}

const EDGES: Edge[] = PIPELINE_EDGES.map(({ source, target }) => ({
  id: `workflow-edge-${source}-${target}`,
  source: String(source),
  target: String(target),
  type: 'straight',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#6d9fff' },
  style: { stroke: '#6d9fff', strokeWidth: 3 },
}))

export function PainelWorkflowFlow(_props: IDockviewPanelProps) {
  const { latestEvent, errorMessage, isConnected } = usePipelineStream()
  const activeStep = latestEvent?.passo ?? 1
  const nodes = useMemo<WorkflowNode[]>(
    () =>
      PIPELINE_STEPS.map(({ id, label }, index) => ({
        id: String(id),
        type: 'workflow-step',
        position: { x: index * 155, y: 46 },
        data: { label, step: id, active: id === activeStep },
      })),
    [activeStep],
  )

  return (
    <section className="content-panel workflow-panel" aria-label="Workflow do pipeline em React Flow">
      <header className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">@xyflow/react</p>
          <h2>Workflow React Flow</h2>
        </div>
        <span className="live-status live-status--connected">4 nós</span>
      </header>

      <div className="workflow-flow-canvas">
        <ReactFlow
          nodes={nodes}
          edges={EDGES}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
        >
          <Background color="#2c3b59" gap={24} size={1} />
        </ReactFlow>
      </div>

      {errorMessage ? (
        <div className="panel-error" role="alert">
          <strong>Backend indisponível</strong>
          <p>{errorMessage}</p>
        </div>
      ) : (
        <p className="workflow-panel__status" role="status">
          {latestEvent ? `Passo atual: ${latestEvent.passo} de 4` : 'Aguardando o primeiro passo...'}
          <span className={isConnected ? 'live-status live-status--connected' : 'live-status'}>
            {isConnected ? 'Conectado' : 'Conectando'}
          </span>
        </p>
      )}
    </section>
  )
}
