import { useEffect, useRef, useState } from 'react'
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

type LayoutSerializado = ReturnType<DockviewApi['toJSON']>

type TimerRef = {
  current: number | undefined
}

const LAYOUT_STORAGE_KEY = 'painel-dinamico-lab:layout'
const LAYOUT_SAVE_DEBOUNCE_MS = 250

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCompatibleLayout(value: unknown): value is LayoutSerializado {
  if (!isRecord(value) || !isRecord(value.grid) || !isRecord(value.panels)) {
    return false
  }

  if (
    typeof value.grid.width !== 'number' ||
    typeof value.grid.height !== 'number' ||
    typeof value.grid.orientation !== 'string'
  ) {
    return false
  }

  if (
    value.grid.root !== undefined &&
    (!isRecord(value.grid.root) ||
      (value.grid.root.type !== 'leaf' && value.grid.root.type !== 'branch'))
  ) {
    return false
  }

  return Object.entries(value.panels).every(([panelId, panel]) => {
    if (!isRecord(panel)) {
      return false
    }

    return (
      panel.id === panelId &&
      typeof panel.contentComponent === 'string' &&
      panel.contentComponent in PAINEL_REGISTRY
    )
  })
}

function removeStoredLayout() {
  try {
    window.localStorage.removeItem(LAYOUT_STORAGE_KEY)
  } catch {
    // localStorage pode estar indisponível no contexto do browser.
  }
}

function readStoredLayout(): LayoutSerializado | undefined {
  let rawLayout: string | null

  try {
    rawLayout = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
  } catch {
    return undefined
  }

  if (!rawLayout) {
    return undefined
  }

  try {
    const parsedLayout: unknown = JSON.parse(rawLayout)
    if (isCompatibleLayout(parsedLayout)) {
      return parsedLayout
    }

    removeStoredLayout()
    return undefined
  } catch {
    removeStoredLayout()
    return undefined
  }
}

function persistLayout(api: DockviewApi) {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(api.toJSON()))
  } catch {
    // A persistência é opcional e não pode impedir o uso do painel.
  }
}

function cancelScheduledPersistence(timerRef: TimerRef) {
  if (timerRef.current === undefined) {
    return
  }

  window.clearTimeout(timerRef.current)
  timerRef.current = undefined
}

function scheduleLayoutPersistence(api: DockviewApi, timerRef: TimerRef) {
  cancelScheduledPersistence(timerRef)
  timerRef.current = window.setTimeout(() => {
    timerRef.current = undefined
    persistLayout(api)
  }, LAYOUT_SAVE_DEBOUNCE_MS)
}

function applyDefaultLayout(api: DockviewApi) {
  api.clear()
  addInitialPanels(api)
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
  const layoutSubscriptionRef = useRef<{ dispose(): void } | undefined>(undefined)
  const persistTimerRef = useRef<number | undefined>(undefined)
  const isApplyingLayoutRef = useRef(false)

  useEffect(() => {
    return () => {
      layoutSubscriptionRef.current?.dispose()
      cancelScheduledPersistence(persistTimerRef)
    }
  }, [])

  function handleReady({ api }: DockviewReadyEvent) {
    setDockviewApi(api)
    isApplyingLayoutRef.current = true

    try {
      const storedLayout = readStoredLayout()
      let restoredLayout = false

      if (storedLayout) {
        try {
          api.fromJSON(storedLayout)
          restoredLayout = true
        } catch {
          removeStoredLayout()
        }
      }

      if (!restoredLayout) {
        applyDefaultLayout(api)
      }
    } finally {
      isApplyingLayoutRef.current = false
    }

    layoutSubscriptionRef.current?.dispose()
    layoutSubscriptionRef.current = api.onDidLayoutChange(() => {
      if (!isApplyingLayoutRef.current) {
        scheduleLayoutPersistence(api, persistTimerRef)
      }
    })
  }

  function handleAddPanel() {
    if (dockviewApi) {
      createDynamicPanel(dockviewApi, tipoSelecionado)
    }
  }

  function handleRestoreDefault() {
    if (!dockviewApi) {
      return
    }

    cancelScheduledPersistence(persistTimerRef)
    removeStoredLayout()
    isApplyingLayoutRef.current = true

    try {
      applyDefaultLayout(dockviewApi)
    } finally {
      isApplyingLayoutRef.current = false
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
          <button
            className="panel-actions__secondary"
            type="button"
            onClick={handleRestoreDefault}
            disabled={!dockviewApi}
          >
            Restaurar padrão
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
