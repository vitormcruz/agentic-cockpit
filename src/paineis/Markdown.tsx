import type { IDockviewPanelProps } from 'dockview-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type MarkdownParams = {
  content: string
}

export function PainelMarkdown({ params }: IDockviewPanelProps<MarkdownParams>) {
  return (
    <article className="content-panel markdown-panel" aria-label="Markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{params.content}</ReactMarkdown>
    </article>
  )
}
