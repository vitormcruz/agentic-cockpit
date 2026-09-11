import type { IDockviewPanelProps } from 'dockview-react'

export type TextoParams = {
  content: string
}

export function PainelTexto({ params }: IDockviewPanelProps<TextoParams>) {
  return (
    <section className="content-panel text-panel" aria-label="Texto plano">
      <pre>{params.content}</pre>
    </section>
  )
}
