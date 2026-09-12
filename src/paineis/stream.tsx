import { useEffect, useState, type ReactNode } from 'react'
import { apiErrorMessage } from './api'
import { PipelineStreamContext } from './stream-context'

const STREAM_CONNECTION_TIMEOUT_MS = 8000

export type PassoPipeline = 1 | 2 | 3 | 4

export type EventoPipeline = {
  timestamp: string
  resumo: string
  passo: PassoPipeline
}

function isPassoPipeline(value: unknown): value is PassoPipeline {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 4
  )
}

function parsePipelineEvent(rawEvent: string): EventoPipeline {
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
    throw new Error('O backend enviou um evento sem timestamp, resumo ou passo.')
  }

  const eventRecord = parsedEvent as Record<string, unknown>
  if (
    typeof eventRecord.timestamp !== 'string' ||
    typeof eventRecord.resumo !== 'string' ||
    !isPassoPipeline(eventRecord.passo)
  ) {
    throw new Error('O backend enviou um evento sem timestamp, resumo ou passo.')
  }

  return {
    timestamp: eventRecord.timestamp,
    resumo: eventRecord.resumo,
    passo: eventRecord.passo,
  }
}

export function PipelineStreamProvider({ children }: { children: ReactNode }) {
  const [latestEvent, setLatestEvent] = useState<EventoPipeline>()
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
        const liveEvent = parsePipelineEvent(event.data)
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
    <PipelineStreamContext.Provider value={{ latestEvent, errorMessage, isConnected }}>
      {children}
    </PipelineStreamContext.Provider>
  )
}
