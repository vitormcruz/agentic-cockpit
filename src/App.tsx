import { useState } from 'react'
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  themeDark,
} from 'dockview-react'
import {
  COMPONENTES_PAINEIS,
  PAINEL_REGISTRY,
  type PainelTipo,
} from './paineis/registry'
import './App.css'

type PainelPosicao = {
  direction: 'above' | 'below' | 'left' | 'right'
  referencePanel: string
}

type PainelInicial = {
  id: string
  position?: PainelPosicao
  tipo: PainelTipo
}

const PAINEIS_INICIAIS: PainelInicial[] = [
  { id: 'texto', tipo: 'texto' },
  {
    id: 'markdown',
    position: { direction: 'right', referencePanel: 'texto' },
    tipo: 'markdown',
  },
  {
    id: 'mermaid',
    position: { direction: 'below', referencePanel: 'texto' },
    tipo: 'mermaid',
  },
  {
    id: 'svg',
    position: { direction: 'right', referencePanel: 'mermaid' },
    tipo: 'svg',
  },
  {
    id: 'imagem',
    position: { direction: 'right', referencePanel: 'svg' },
    tipo: 'imagem',
  },
  {
    id: 'html',
    position: { direction: 'below', referencePanel: 'imagem' },
    tipo: 'html',
  },
]

let dynamicPanelSequence = 0

function addRegisteredPanel(
  api: DockviewApi,
  options: {
    id: string
    position?: PainelPosicao
    tipo: PainelTipo
    title?: string
  },
) {
  const painel = PAINEL_REGISTRY[options.tipo]

  api.addPanel({
    id: options.id,
    component: options.tipo,
    params: painel.params,
    position: options.position,
    title: options.title ?? painel.label,
  })
}

function addInitialPanels(api: DockviewApi) {
  for (const painel of PAINEIS_INICIAIS) {
    addRegisteredPanel(api, painel)
  }
}

function createDynamicPanel(api: DockviewApi, tipo: PainelTipo) {
  dynamicPanelSequence += 1
  const id = `painel-${tipo}-${dynamicPanelSequence}`
  const title = `${PAINEL_REGISTRY[tipo].label} ${dynamicPanelSequence}`
  addRegisteredPanel(api, { id, tipo, title })
}

function App() {
  const [dockviewApi, setDockviewApi] = useState<DockviewApi>()
  const [tipoSelecionado, setTipoSelecionado] = useState<PainelTipo>('texto')

  function handleReady({ api }: DockviewReadyEvent) {
    setDockviewApi(api)
    addInitialPanels(api)
  }

  function handleAddPanel() {
    if (dockviewApi) {
      createDynamicPanel(dockviewApi, tipoSelecionado)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-toolbar">
        <div>
          <p className="app-toolbar__eyebrow">Painel dinâmico lab</p>
          <h1>Renderers heterogêneos</h1>
        </div>
        <div className="panel-actions">
          <label htmlFor="panel-type">Tipo de painel</label>
          <select
            id="panel-type"
            value={tipoSelecionado}
            onChange={(event) => setTipoSelecionado(event.target.value as PainelTipo)}
          >
            {Object.entries(PAINEL_REGISTRY).map(([tipo, painel]) => (
              <option key={tipo} value={tipo}>
                {painel.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleAddPanel} disabled={!dockviewApi}>
            + Adicionar painel
          </button>
        </div>
      </header>
      <DockviewReact
        className="dockview-host"
        components={COMPONENTES_PAINEIS}
        onReady={handleReady}
        theme={themeDark}
      />
    </main>
  )
}

export default App
