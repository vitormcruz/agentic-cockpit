import type { IDockviewPanelProps } from 'dockview-react'

export type HtmlParams = {
  content: string
}

export function PainelHtml({ params }: IDockviewPanelProps<HtmlParams>) {
  return (
    <section className="content-panel html-panel" aria-label="HTML arbitrário">
      <iframe
        title="Demonstração de HTML arbitrário em sandbox"
        sandbox="allow-scripts"
        srcDoc={params.content}
      />
    </section>
  )
}
