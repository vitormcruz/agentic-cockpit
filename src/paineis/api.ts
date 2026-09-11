const API_REQUEST_TIMEOUT_MS = 8000

export type EstadoBackend = {
  skills: number
  agents: number
  commands: number
  testes: number
}

export function isEstadoBackend(value: unknown): value is EstadoBackend {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const estado = value as Record<string, unknown>
  return (
    Number.isInteger(estado.skills) &&
    Number.isInteger(estado.agents) &&
    Number.isInteger(estado.commands) &&
    Number.isInteger(estado.testes)
  )
}

function connectAbortSignals(externalSignal: AbortSignal, requestController: AbortController) {
  if (externalSignal.aborted) {
    requestController.abort()
    return () => undefined
  }

  const abortRequest = () => requestController.abort()
  externalSignal.addEventListener('abort', abortRequest, { once: true })
  return () => externalSignal.removeEventListener('abort', abortRequest)
}

async function requestApi(path: string, externalSignal: AbortSignal): Promise<Response> {
  const requestController = new AbortController()
  const disconnectAbortSignals = connectAbortSignals(externalSignal, requestController)
  const timeoutId = window.setTimeout(() => requestController.abort(), API_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(path, { signal: requestController.signal })

    if (!response.ok) {
      throw new Error(`O backend respondeu com HTTP ${response.status}.`)
    }

    return response
  } finally {
    window.clearTimeout(timeoutId)
    disconnectAbortSignals()
  }
}

export async function fetchApiJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await requestApi(path, signal)
  return (await response.json()) as T
}

export async function fetchApiText(path: string, signal: AbortSignal): Promise<string> {
  const response = await requestApi(path, signal)
  return response.text()
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'O backend não respondeu no tempo esperado.'
  }

  if (error instanceof TypeError) {
    return 'Não foi possível conectar ao backend.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Não foi possível conectar ao backend.'
}
