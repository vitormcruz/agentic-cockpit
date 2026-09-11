import { useEffect, useState } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import {
  apiErrorMessage,
  fetchApiJson,
  isEstadoBackend,
  type EstadoBackend,
} from './api'

const ESTADO_LABELS: Array<{ key: keyof EstadoBackend; label: string }> = [
  { key: 'skills', label: 'Skills' },
  { key: 'agents', label: 'Agents' },
  { key: 'commands', label: 'Commands' },
  { key: 'testes', label: 'Testes' },
]

export function PainelEstado(_props: IDockviewPanelProps) {
  const [estado, setEstado] = useState<EstadoBackend>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [refreshSequence, setRefreshSequence] = useState(0)

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    fetchApiJson<unknown>('/api/estado', controller.signal)
      .then((payload) => {
        if (!isEstadoBackend(payload)) {
          throw new Error('O backend retornou um formato de estado inválido.')
        }

        if (isActive) {
          setEstado(payload)
        }
      })
      .catch((error: unknown) => {
        if (isActive && !controller.signal.aborted) {
          setEstado(undefined)
          setErrorMessage(apiErrorMessage(error))
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [refreshSequence])

  function handleRefresh() {
    setIsLoading(true)
    setErrorMessage(undefined)
    setRefreshSequence((sequence) => sequence + 1)
  }

  return (
    <section className="content-panel data-panel" aria-label="Estado do backend">
      <header className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Contexto opencode</p>
          <h2>Estado do repositório</h2>
        </div>
        <button
          className="panel-heading__button"
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          Atualizar
        </button>
      </header>

      {isLoading && (
        <p className="panel-status" role="status">
          Lendo contagens reais...
        </p>
      )}

      {errorMessage && (
        <div className="panel-error" role="alert">
          <strong>Backend indisponível</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {estado && !errorMessage && (
        <table className="data-table">
          <caption className="visually-hidden">Contagens do repositório de configurações</caption>
          <thead>
            <tr>
              <th scope="col">Recurso</th>
              <th scope="col">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {ESTADO_LABELS.map(({ key, label }) => (
              <tr key={key}>
                <th scope="row">{label}</th>
                <td>{estado[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
