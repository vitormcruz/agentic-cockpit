import { useId } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import { usePipelineStream } from './usePipelineStream'
import { PIPELINE_EDGES, PIPELINE_STEPS } from './workflow-data'

const SVG_STEP_WIDTH = 130
const SVG_STEP_HEIGHT = 58
const SVG_STEP_Y = 36
const SVG_STEP_X = [20, 210, 400, 590]

function renderWorkflowStatus(
  isConnected: boolean,
  latestStep: number | undefined,
  errorMessage: string | undefined,
) {
  if (errorMessage) {
    return (
      <div className="panel-error" role="alert">
        <strong>Backend indisponível</strong>
        <p>{errorMessage}</p>
      </div>
    )
  }

  return (
    <p className="workflow-panel__status" role="status">
      {latestStep ? `Passo atual: ${latestStep} de 4` : 'Aguardando o primeiro passo...'}
      <span className={isConnected ? 'live-status live-status--connected' : 'live-status'}>
        {isConnected ? 'Conectado' : 'Conectando'}
      </span>
    </p>
  )
}

export function PainelWorkflowSvg(_props: IDockviewPanelProps) {
  const { latestEvent, errorMessage, isConnected } = usePipelineStream()
  const markerId = `workflow-arrow-${useId().replaceAll(':', '')}`
  const activeStep = latestEvent?.passo ?? 1

  return (
    <section className="content-panel workflow-panel" aria-label="Workflow do pipeline em SVG">
      <header className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Renderer custom</p>
          <h2>Workflow SVG</h2>
        </div>
        <span className="live-status live-status--connected">4 etapas</span>
      </header>

      <div className="workflow-svg-shell">
        <svg
          className="workflow-svg"
          viewBox="0 0 740 150"
          role="img"
          aria-label={`Pipeline SVG, passo atual ${activeStep}`}
        >
          <defs>
            <marker
              id={markerId}
              markerHeight="8"
              markerWidth="8"
              orient="auto-start-reverse"
              refX="7"
              refY="4"
              viewBox="0 0 8 8"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
          </defs>

          {PIPELINE_EDGES.map(({ source, target }) => {
            const sourceIndex = source - 1
            const targetIndex = target - 1
            const sourceX = SVG_STEP_X[sourceIndex] + SVG_STEP_WIDTH
            const targetX = SVG_STEP_X[targetIndex]
            const centerY = SVG_STEP_Y + SVG_STEP_HEIGHT / 2

            return (
              <line
                key={`${source}-${target}`}
                className="workflow-svg__edge"
                x1={sourceX}
                y1={centerY}
                x2={targetX}
                y2={centerY}
                markerEnd={`url(#${markerId})`}
              />
            )
          })}

          {PIPELINE_STEPS.map(({ id, label }, index) => (
            <g
              key={id}
              className={`workflow-svg__step ${id === activeStep ? 'workflow-step--active' : ''}`}
            >
              <rect
                x={SVG_STEP_X[index]}
                y={SVG_STEP_Y}
                width={SVG_STEP_WIDTH}
                height={SVG_STEP_HEIGHT}
                rx="10"
              />
              <text
                className="workflow-svg__label"
                x={SVG_STEP_X[index] + SVG_STEP_WIDTH / 2}
                y={SVG_STEP_Y + 35}
                textAnchor="middle"
              >
                {label}
              </text>
              <text
                className="workflow-svg__number"
                x={SVG_STEP_X[index] + SVG_STEP_WIDTH / 2}
                y={SVG_STEP_Y + SVG_STEP_HEIGHT + 28}
                textAnchor="middle"
              >
                {id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {renderWorkflowStatus(isConnected, latestEvent?.passo, errorMessage)}
    </section>
  )
}
