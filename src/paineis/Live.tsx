import { useEffect, useState } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import { apiErrorMessage } from './api'

const STREAM_CONNECTION_TIMEOUT_MS = 8000

type EventoLive = {
  timestamp: string
  resumo: string
}

function parseLiveEvent(rawEvent: string): EventoLive {
  let parsedEvent: unknown

  try {
    parsedEvent = JSON.parse(rawEvent)
  } catch {
    throw new Error('O backend enviou um evento inválido.')
  }

  if (
    typeof parsedEvent !== 'object' ||
    parsedEvent === null ||
    Array.isArray(parsedEvent)
  ) {
    throw new Error('O backend enviou um evento sem timestamp ou resumo.')
  }

  const eventRecord = parsedEvent as Record<string, unknown>
  if (typeof eventRecord.timestamp !== 'string' || typeof eventRecord.resumo !== 'string') {
    throw new Error('O backend enviou um evento sem timestamp ou resumo.')
  }

  return {
    timestamp: eventRecord.timestamp,
    resumo: eventRecord.resumo,
  }
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('pt-BR')
}

export function PainelLive(_props: IDockviewPanelProps) {
  const [latestEvent, setLatestEvent] = useState<EventoLive>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let isActive = true
    const eventSource = new EventSource('/api/stream')
    const connectionTimeoutId = window.setTimeout(() => {
      if (isActive) {
        eventSource.close()
        setIsConnected(false)
        setErrorMessage('O backend não abriu o stream no tempo esperado.')
      }
    }, STREAM_CONNECTION_TIMEOUT_MS)

    eventSource.onopen = () => {
      if (isActive) {
        setIsConnected(true)
        setErrorMessage(undefined)
      }
    }

    eventSource.onmessage = (event) => {
      if (!isActive) {
        return
      }

      try {
        const liveEvent = parseLiveEvent(event.data)
        window.clearTimeout(connectionTimeoutId)
        setLatestEvent(liveEvent)
        setIsConnected(true)
        setErrorMessage(undefined)
      } catch (error: unknown) {
        setIsConnected(false)
        setErrorMessage(apiErrorMessage(error))
      }
    }

    eventSource.onerror = () => {
      if (isActive) {
        setIsConnected(false)
        setErrorMessage('Backend indisponível. O stream será reconectado automaticamente.')
      }
    }

    return () => {
      isActive = false
      window.clearTimeout(connectionTimeoutId)
      eventSource.close()
    }
  }, [])

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
          <p className="live-event__summary">{latestEvent.resumo}</p>
        </div>
      )}
    </section>
  )
}
