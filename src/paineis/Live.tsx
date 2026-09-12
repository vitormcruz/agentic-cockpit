import type { IDockviewPanelProps } from 'dockview-react'
import { usePipelineStream } from './usePipelineStream'

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('pt-BR')
}

export function PainelLive(_props: IDockviewPanelProps) {
  const { latestEvent, errorMessage, isConnected } = usePipelineStream()

  return (
    <section className="content-panel live-panel" aria-label="Atualização ao vivo">
      <header className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Server-Sent Events</p>
          <h2>Estado ao vivo</h2>
        </div>
        <span className={isConnected ? 'live-status live-status--connected' : 'live-status'}>
          {isConnected ? 'Conectado' : 'Desconectado'}
        </span>
      </header>

      {errorMessage && (
        <div className="panel-error" role="alert">
          <strong>Backend indisponível</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {!latestEvent && !errorMessage && (
        <p className="panel-status" role="status">
          Conectando ao stream...
        </p>
      )}

      {latestEvent && (
        <div className="live-event" aria-live="polite">
          <p className="live-event__label">Último evento</p>
          <time dateTime={latestEvent.timestamp}>{formatTimestamp(latestEvent.timestamp)}</time>
          <p className="live-event__step">Passo atual: {latestEvent.passo} de 4</p>
          <p className="live-event__summary">{latestEvent.resumo}</p>
        </div>
      )}
    </section>
  )
}
