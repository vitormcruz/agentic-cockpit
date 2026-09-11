import { useEffect, useState } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { apiErrorMessage, fetchApiText } from './api'

export function PainelDoc(_props: IDockviewPanelProps) {
  const [markdown, setMarkdown] = useState<string>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [isLoading, setIsLoading] = useState(true)
  const [refreshSequence, setRefreshSequence] = useState(0)

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    fetchApiText('/api/markdown', controller.signal)
      .then((content) => {
        if (isActive) {
          setMarkdown(content)
        }
      })
      .catch((error: unknown) => {
        if (isActive && !controller.signal.aborted) {
          setMarkdown(undefined)
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
    <article className="content-panel markdown-panel doc-panel" aria-label="Documento do contexto">
      <header className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Documento real</p>
          <h2>README do contexto</h2>
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
          Carregando documento...
        </p>
      )}

      {errorMessage && (
        <div className="panel-error" role="alert">
          <strong>Backend indisponível</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {markdown && !errorMessage && (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      )}
    </article>
  )
}
