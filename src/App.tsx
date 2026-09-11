import {
  DockviewReact,
  type DockviewReadyEvent,
  themeDark,
} from 'dockview-react'
import { PainelImagem } from './paineis/Imagem'
import { PainelMarkdown } from './paineis/Markdown'
import { PainelMermaid } from './paineis/Mermaid'
import { PainelSvg } from './paineis/Svg'
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
  imagem: PainelImagem,
  markdown: PainelMarkdown,
  mermaid: PainelMermaid,
  svg: PainelSvg,
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

  api.addPanel({
    id: 'mermaid',
    component: 'mermaid',
    title: 'Mermaid',
    position: {
      direction: 'below',
      referencePanel: 'texto',
    },
    params: {
      definition: `flowchart LR
  A[Entrada] --> B{Renderer}
  B --> C[Conteúdo]
  B --> D[Layout Dockview]`,
    },
  })

  api.addPanel({
    id: 'svg',
    component: 'svg',
    title: 'SVG inline',
    position: {
      direction: 'right',
      referencePanel: 'mermaid',
    },
  })

  api.addPanel({
    id: 'imagem',
    component: 'imagem',
    title: 'Imagem local',
    position: {
      direction: 'right',
      referencePanel: 'svg',
    },
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
