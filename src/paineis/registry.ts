import { FAB_INFO_COMPONENT, PainelInfoFlutuante } from '../fab/InfoFlutuante'
import { PainelDoc } from './Doc'
import { PainelEstado } from './Estado'
import { PainelHtml } from './Html'
import { PainelImagem } from './Imagem'
import { PainelLive } from './Live'
import { PainelMarkdown } from './Markdown'
import { PainelMermaid } from './Mermaid'
import { PainelSvg } from './Svg'
import { PainelTexto } from './Texto'

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

const MERMAID_DEMO = `flowchart LR
  A[Entrada] --> B{Renderer}
  B --> C[Conteúdo]
  B --> D[Layout Dockview]`

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

export const PAINEL_REGISTRY = {
  doc: {
    component: PainelDoc,
    label: 'Documento do contexto',
    params: {},
  },
  estado: {
    component: PainelEstado,
    label: 'Estado do backend',
    params: {},
  },
  html: {
    component: PainelHtml,
    label: 'HTML sandbox',
    params: { content: HTML_DEMO },
  },
  imagem: {
    component: PainelImagem,
    label: 'Imagem local',
    params: {},
  },
  live: {
    component: PainelLive,
    label: 'Estado ao vivo',
    params: {},
  },
  markdown: {
    component: PainelMarkdown,
    label: 'Markdown',
    params: { content: MARKDOWN_DEMO },
  },
  mermaid: {
    component: PainelMermaid,
    label: 'Mermaid',
    params: { definition: MERMAID_DEMO },
  },
  svg: {
    component: PainelSvg,
    label: 'SVG inline',
    params: {},
  },
  texto: {
    component: PainelTexto,
    label: 'Texto plano',
    params: { content: TEXTO_DEMO },
  },
} as const

export type PainelTipo = keyof typeof PAINEL_REGISTRY

export const COMPONENTES_PAINEIS = {
  [FAB_INFO_COMPONENT]: PainelInfoFlutuante,
  doc: PAINEL_REGISTRY.doc.component,
  estado: PAINEL_REGISTRY.estado.component,
  html: PAINEL_REGISTRY.html.component,
  imagem: PAINEL_REGISTRY.imagem.component,
  live: PAINEL_REGISTRY.live.component,
  markdown: PAINEL_REGISTRY.markdown.component,
  mermaid: PAINEL_REGISTRY.mermaid.component,
  svg: PAINEL_REGISTRY.svg.component,
  texto: PAINEL_REGISTRY.texto.component,
}
