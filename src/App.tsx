import {
  DockviewReact,
  type DockviewReadyEvent,
  themeDark,
} from 'dockview-react'
import { PainelMarkdown } from './paineis/Markdown'
import { PainelTexto } from './paineis/Texto'
import './App.css'

const TEXTO_DEMO = `Painel de texto plano

Conteúdo monoespaçado para validar leitura rápida e quebra de linha dentro
de um painel redimensionável do Dockview.`

const MARKDOWN_DEMO = [
  '# Markdown no painel',
  '',
  'O renderer aceita conteúdo rico sem tirar o painel do layout.',
  '',
  '## O que está sendo validado',
  '',
  '- headings e listas',
  '- bloco de código',
  '- tabela com **GFM**',
  '',
  '```tsx',
  "const painel = 'conteúdo heterogêneo'",
  '```',
  '',
  '> O Dockview gerencia a janela. O app decide como renderizar o conteúdo.',
  '',
  '| Tipo | Renderer | Estado |',
  '| --- | --- | --- |',
  '| Texto | `<pre>` | pronto |',
  '| Markdown | `react-markdown` | pronto |',
].join('\n')

const components = {
  markdown: PainelMarkdown,
  texto: PainelTexto,
}

function addInitialPanels({ api }: DockviewReadyEvent) {
  api.addPanel({
    id: 'texto',
    component: 'texto',
    title: 'Texto plano',
    params: { content: TEXTO_DEMO },
  })

  api.addPanel({
    id: 'markdown',
    component: 'markdown',
    title: 'Markdown',
    position: {
      direction: 'right',
      referencePanel: 'texto',
    },
    params: { content: MARKDOWN_DEMO },
  })
}

function App() {
  return (
    <main className="app-shell">
      <DockviewReact
        className="dockview-host"
        components={components}
        onReady={addInitialPanels}
        theme={themeDark}
      />
    </main>
  )
}

export default App
