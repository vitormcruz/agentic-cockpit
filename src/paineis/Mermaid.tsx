import { useEffect, useRef, useState } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import mermaid from 'mermaid'

export type MermaidParams = {
  definition: string
}

let renderSequence = 0

function createRenderId() {
  renderSequence += 1
  return `mermaid-diagram-${renderSequence}`
}

export function PainelMermaid({ params }: IDockviewPanelProps<MermaidParams>) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    const diagramContainer = diagramRef.current
    if (!diagramContainer) {
      return
    }

    let isCancelled = false
    const renderId = createRenderId()

    diagramContainer.replaceChildren()
    setIsRendering(true)
    setErrorMessage(undefined)
    mermaid.initialize({
      securityLevel: 'strict',
      startOnLoad: false,
      theme: 'dark',
    })

    mermaid
      .render(renderId, params.definition)
      .then(({ svg, bindFunctions }) => {
        if (isCancelled) {
          return
        }

        const parsedSvg = new DOMParser().parseFromString(svg, 'image/svg+xml')
        const svgElement = parsedSvg.documentElement
        diagramContainer.appendChild(document.importNode(svgElement, true))
        bindFunctions?.(diagramContainer)
        setIsRendering(false)
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return
        }

        const message = error instanceof Error ? error.message : 'Falha ao renderizar Mermaid.'
        setErrorMessage(message)
        setIsRendering(false)
      })

    return () => {
      isCancelled = true
      diagramContainer.replaceChildren()
    }
  }, [params.definition])

  return (
    <section className="content-panel mermaid-panel" aria-label="Diagrama Mermaid">
      <div
        ref={diagramRef}
        className="mermaid-container"
        aria-busy={isRendering}
      />
      {isRendering && <p className="panel-status">Renderizando diagrama...</p>}
      {errorMessage && (
        <p className="panel-status panel-status--error" role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  )
}
