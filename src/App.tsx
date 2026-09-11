import {
  DockviewReact,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
  themeDark,
} from 'dockview-react'
import './App.css'

type DemoPanelParams = {
  description: string
  eyebrow: string
  heading: string
}

function DemoPanel({ params }: IDockviewPanelProps<DemoPanelParams>) {
  return (
    <article className="demo-panel">
      <span className="demo-panel__eyebrow">{params.eyebrow}</span>
      <h2>{params.heading}</h2>
      <p>{params.description}</p>
    </article>
  )
}

const components = {
  demo: DemoPanel,
}

function addInitialPanels({ api }: DockviewReadyEvent) {
  api.addPanel({
    id: 'overview',
    component: 'demo',
    title: 'Visão geral',
    params: {
      description: 'Este painel será a base para os renderers do experimento.',
      eyebrow: 'Dockview + React',
      heading: 'Visão geral',
    },
  })

  api.addPanel({
    id: 'notes',
    component: 'demo',
    title: 'Notas do lab',
    position: {
      direction: 'right',
      referencePanel: 'overview',
    },
    params: {
      description: 'Arraste as abas e redimensione o split para explorar o docking.',
      eyebrow: 'Painel secundário',
      heading: 'Notas do lab',
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
