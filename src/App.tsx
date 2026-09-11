import {
  DockviewReact,
  type DockviewReadyEvent,
  themeDark,
} from 'dockview-react'
import { PainelHtml } from './paineis/Html'
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

const HTML_DEMO = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; }
      body { display: grid; min-height: 100vh; margin: 0; place-items: center; background: #17243c; color: #f5f7fb; }
      main { width: min(80%, 24rem); padding: 2rem; border: 1px solid #496a9d; border-radius: 1rem; background: #28518c; text-align: center; }
      button { padding: .7rem 1rem; border: 0; border-radius: .5rem; background: #91b7ff; color: #17243c; cursor: pointer; font: inherit; font-weight: 700; }
      button:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
    </style>
  </head>
  <body>
    <main>
      <h1>HTML no sandbox</h1>
      <p>O JavaScript deste botão só altera o documento do iframe.</p>
      <button id="change-color" type="button">Trocar cor</button>
    </main>
    <script>
      const colors = ['#17243c', '#3d315b', '#24554d'];
      let colorIndex = 0;
      document.querySelector('#change-color').addEventListener('click', () => {
        colorIndex = (colorIndex + 1) % colors.length;
        document.body.style.background = colors[colorIndex];
      });
    </script>
  </body>
</html>`

const components = {
  html: PainelHtml,
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

  api.addPanel({
    id: 'html',
    component: 'html',
    title: 'HTML sandbox',
    position: {
      direction: 'below',
      referencePanel: 'imagem',
    },
    params: { content: HTML_DEMO },
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
