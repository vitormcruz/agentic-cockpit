import type { IDockviewPanelHeaderProps } from 'dockview-react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export const FLOATING_CARD_TAB_COMPONENT = 'floating-card-tab'

type CardTabProps = IDockviewPanelHeaderProps
type FloatingOverlay = HTMLElement

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function findFloatingOverlay(api: CardTabProps['api']): FloatingOverlay | undefined {
  if (api.location.type !== 'floating') {
    return undefined
  }

  return api.group.element.closest<HTMLElement>('.dv-resize-container') ?? undefined
}

// A v8.3.1 não expõe a posição do floating group no DockviewApi público.
// O DOM acompanha o gesto; o fromJSON sincroniza a posição no estado oficial ao soltar.
function persistFloatingCardPosition(
  containerApi: CardTabProps['containerApi'],
  groupId: string,
  overlay: FloatingOverlay,
  container: HTMLElement,
) {
  const layout = containerApi.toJSON()
  const floatingGroup = layout.floatingGroups?.find((candidate) => candidate.data?.id === groupId)

  if (!floatingGroup) {
    return
  }

  const containerRect = container.getBoundingClientRect()
  const overlayRect = overlay.getBoundingClientRect()

  floatingGroup.position = {
    left: overlayRect.left - containerRect.left,
    top: overlayRect.top - containerRect.top,
    width: overlayRect.width,
    height: overlayRect.height,
  }
  containerApi.fromJSON(layout, { reuseExistingPanels: true })
}

function startFloatingCardDrag(
  event: PointerEvent,
  api: CardTabProps['api'],
  containerApi: CardTabProps['containerApi'],
  captureTarget: HTMLElement,
) {
  const overlay = findFloatingOverlay(api)
  const container = overlay?.parentElement

  if (!overlay || !container) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const overlayRect = overlay.getBoundingClientRect()
  const pointerOffset = {
    x: event.clientX - overlayRect.left,
    y: event.clientY - overlayRect.top,
  }
  const pointerId = event.pointerId
  const targetWindow = overlay.ownerDocument.defaultView ?? window
  let hasMoved = false

  const moveOverlay = (moveEvent: PointerEvent) => {
    if (moveEvent.pointerId !== pointerId) {
      return
    }

    moveEvent.preventDefault()
    const containerRect = container.getBoundingClientRect()
    const currentOverlayRect = overlay.getBoundingClientRect()
    const maximumLeft = Math.max(0, containerRect.width - currentOverlayRect.width)
    const maximumTop = Math.max(0, containerRect.height - currentOverlayRect.height)
    const left = clamp(
      moveEvent.clientX - containerRect.left - pointerOffset.x,
      0,
      maximumLeft,
    )
    const top = clamp(
      moveEvent.clientY - containerRect.top - pointerOffset.y,
      0,
      maximumTop,
    )

    overlay.style.left = `${Math.round(left)}px`
    overlay.style.top = `${Math.round(top)}px`
    overlay.style.right = 'auto'
    overlay.style.bottom = 'auto'
    hasMoved = true
  }

  const finishDrag = (endEvent: PointerEvent) => {
    if (endEvent.pointerId !== pointerId) {
      return
    }

    targetWindow.removeEventListener('pointermove', moveOverlay)
    targetWindow.removeEventListener('pointerup', finishDrag)
    targetWindow.removeEventListener('pointercancel', finishDrag)
    captureTarget.releasePointerCapture?.(pointerId)
    overlay.classList.remove('floating-card-manual-dragging')

    if (hasMoved && api.location.type === 'floating') {
      persistFloatingCardPosition(containerApi, api.group.id, overlay, container)
    }
  }

  captureTarget.setPointerCapture?.(pointerId)
  overlay.classList.add('floating-card-manual-dragging')
  targetWindow.addEventListener('pointermove', moveOverlay)
  targetWindow.addEventListener('pointerup', finishDrag)
  targetWindow.addEventListener('pointercancel', finishDrag)
}

function isCloseButtonTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest('.floating-card-tab__close') !== null
}

export function CardTab({ api, containerApi }: CardTabProps) {
  const title = api.title ?? 'Floating card'

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (isCloseButtonTarget(event.target) || event.button !== 0) {
      return
    }

    startFloatingCardDrag(event.nativeEvent, api, containerApi, event.currentTarget)
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div className="floating-card-tab" onPointerDownCapture={handlePointerDown}>
      <span className="floating-card-tab__title">{title}</span>
      <button
        className="floating-card-tab__close"
        type="button"
        aria-label={`Fechar ${title}`}
        onPointerDownCapture={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          api.close()
        }}
      >
        ×
      </button>
    </div>
  )
}
