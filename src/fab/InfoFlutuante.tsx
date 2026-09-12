import type { IDockviewPanelProps } from 'dockview-react'
import { isEstadoBackend, type EstadoBackend } from '../paineis/api'
import { FLOATING_CARD_TAB_COMPONENT } from './CardTab'
import { InfoAdicional } from './InfoAdicional'
import { tocarSomAberturaCard } from './som'
import { Tooltip } from './Tooltip'

export const FAB_INFO_COMPONENT = 'fab-info'

type InfoFlutuanteParams = {
  estado: EstadoBackend
  variant?: 'help'
}

type PanelApi = IDockviewPanelProps<InfoFlutuanteParams>['api']
type ContainerApi = IDockviewPanelProps<InfoFlutuanteParams>['containerApi']

type FloatingCardPosition = {
  x: number
  y: number
}

const FLOATING_CARD_OFFSET = 32
const FLOATING_CARD_WIDTH = 360
const FLOATING_CARD_HEIGHT = 300
const FLOATING_CARD_FALLBACK_POSITION: FloatingCardPosition = { x: 176, y: 176 }
const FLOATING_CARD_TOOLTIP_MESSAGE =
  'Os números vêm de /api/estado. Arraste pelo header, use X para fechar e ? para abrir a ajuda.'
let helpCardSequence = 0

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function findFloatingOverlay(api: PanelApi) {
  if (api.location.type !== 'floating') {
    return undefined
  }

  return api.group.element.closest<HTMLElement>('.dv-resize-container') ?? undefined
}

function moveCoordinateAway(current: number, maximum: number) {
  if (current + FLOATING_CARD_OFFSET <= maximum) {
    return current + FLOATING_CARD_OFFSET
  }

  return Math.max(0, current - FLOATING_CARD_OFFSET)
}

function getHelpCardPosition(api: PanelApi): FloatingCardPosition {
  const overlay = findFloatingOverlay(api)
  const container = overlay?.parentElement

  if (!overlay || !container) {
    return FLOATING_CARD_FALLBACK_POSITION
  }

  const containerBounds = container.getBoundingClientRect()
  const overlayBounds = overlay.getBoundingClientRect()
  const maximumX = Math.max(0, containerBounds.width - FLOATING_CARD_WIDTH)
  const maximumY = Math.max(0, containerBounds.height - FLOATING_CARD_HEIGHT)
  const currentX = clamp(overlayBounds.left - containerBounds.left, 0, maximumX)
  const currentY = clamp(overlayBounds.top - containerBounds.top, 0, maximumY)

  return {
    x: moveCoordinateAway(currentX, maximumX),
    y: moveCoordinateAway(currentY, maximumY),
  }
}

function createHelpCardId(containerApi: ContainerApi) {
  let id: string

  do {
    helpCardSequence += 1
    id = `fab-info-help-${helpCardSequence}`
  } while (containerApi.getPanel(id))

  return id
}

function openHelpFloatingCard(
  containerApi: ContainerApi,
  currentPanelApi: PanelApi,
  estado: EstadoBackend,
) {
  tocarSomAberturaCard()
  const position = getHelpCardPosition(currentPanelApi)
  const panel = containerApi.addPanel({
    id: createHelpCardId(containerApi),
    component: FAB_INFO_COMPONENT,
    tabComponent: FLOATING_CARD_TAB_COMPONENT,
    params: { estado, variant: 'help' },
    title: 'Ajuda do floating card',
    floating: {
      ...position,
      width: FLOATING_CARD_WIDTH,
      height: FLOATING_CARD_HEIGHT,
      dragHandle: 'tabbar',
    },
  })
  panel.group.api.locked = 'no-drop-target'
}

function FloatingCardActions({ onOpenHelp }: { onOpenHelp: () => void }) {
  return (
    <div className="floating-card-actions" aria-label="Ações do floating card">
      <button
        className="floating-card-action"
        type="button"
        aria-label="Abrir ajuda do floating card"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          onOpenHelp()
        }}
      >
        ?
      </button>
      <Tooltip message={FLOATING_CARD_TOOLTIP_MESSAGE} />
    </div>
  )
}

function FloatingCardHelp({ estado }: { estado: EstadoBackend }) {
  return (
    <section
      className="content-panel fab-info-panel floating-card-body"
      aria-label="Ajuda do floating card"
    >
      <div className="floating-card-help">
        <p className="panel-heading__eyebrow">Dica de uso</p>
        <h2>Como usar este card</h2>
        <p>
          O card resume contagens reais do backend. Agora ele mostra {estado.skills} skills,{' '}
          {estado.agents} agents, {estado.commands} commands e {estado.testes} testes.
        </p>
        <ul>
          <li>Arraste pelo header para mover a janela livremente.</li>
          <li>Use o X no header para fechar sem afetar os outros painéis.</li>
          <li>O botão ! exibe um alerta rápido sem abrir outro painel.</li>
        </ul>
      </div>
    </section>
  )
}

function InvalidInfoPanel() {
  return (
    <section className="content-panel fab-info-panel" aria-label="Informação adicional">
      <div className="panel-error" role="alert">
        <strong>Informação indisponível</strong>
        <p>O painel não recebeu um estado válido do backend.</p>
      </div>
    </section>
  )
}

export function PainelInfoFlutuante({
  api,
  containerApi,
  params,
}: IDockviewPanelProps<InfoFlutuanteParams>) {
  if (!isEstadoBackend(params.estado)) {
    return <InvalidInfoPanel />
  }

  if (params.variant === 'help') {
    return <FloatingCardHelp estado={params.estado} />
  }

  return (
    <section
      className="content-panel fab-info-panel floating-card-body"
      aria-label="Informação adicional"
    >
      <InfoAdicional estado={params.estado} />
      {api.tabComponent === FLOATING_CARD_TAB_COMPONENT && (
        <FloatingCardActions
          onOpenHelp={() => openHelpFloatingCard(containerApi, api, params.estado)}
        />
      )}
    </section>
  )
}
