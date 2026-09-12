import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { EstadoBackend } from '../paineis/api'
import { InfoAdicional } from './InfoAdicional'

type PopoverProps = {
  anchorRef: RefObject<HTMLButtonElement | null>
  estado: EstadoBackend | undefined
  errorMessage: string | undefined
  isLoading: boolean
  dockviewReady: boolean
  onClose: () => void
  onOpenFloating: () => void
  onOpenPopout: () => void
  onOpenModal: () => void
  onOpenDrawer: () => void
  onOpenToast: () => void
}

type PopoverPosition = {
  left: number
  bottom: number
}

function getPopoverPosition(anchor: HTMLButtonElement): PopoverPosition {
  const anchorBounds = anchor.getBoundingClientRect()
  const popoverWidth = 330
  const left = Math.min(
    Math.max(16, anchorBounds.right - popoverWidth),
    window.innerWidth - popoverWidth - 16,
  )

  return {
    left,
    bottom: Math.max(16, window.innerHeight - anchorBounds.top + 12),
  }
}

export function Popover({
  anchorRef,
  estado,
  errorMessage,
  isLoading,
  dockviewReady,
  onClose,
  onOpenFloating,
  onOpenPopout,
  onOpenModal,
  onOpenDrawer,
  onOpenToast,
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<PopoverPosition>({ left: 16, bottom: 80 })
  const hasState = Boolean(estado)
  const canUseDockview = hasState && dockviewReady

  useLayoutEffect(() => {
    function updatePosition() {
      if (anchorRef.current) {
        setPosition(getPopoverPosition(anchorRef.current))
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (
        target instanceof Node &&
        !popoverRef.current?.contains(target) &&
        !anchorRef.current?.contains(target)
      ) {
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div
      ref={popoverRef}
      className="fab-popover"
      role="dialog"
      aria-label="Formas de widget flutuante"
      style={{ left: `${position.left}px`, bottom: `${position.bottom}px` }}
    >
      <div className="fab-popover__heading">
        <div>
          <p className="panel-heading__eyebrow">Widgets flutuantes</p>
          <h2>Escolha uma forma</h2>
        </div>
        <button className="fab-overlay__close" type="button" onClick={onClose} aria-label="Fechar opções">
          ×
        </button>
      </div>

      {isLoading && (
        <p className="panel-status" role="status">
          Carregando informação adicional...
        </p>
      )}

      {errorMessage && (
        <div className="panel-error" role="alert">
          <strong>Backend indisponível</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {estado && !errorMessage && <InfoAdicional estado={estado} />}

      <div className="fab-popover__actions">
        <button type="button" onClick={onOpenFloating} disabled={!canUseDockview}>
          Floating group
        </button>
        <button type="button" onClick={onOpenPopout} disabled={!canUseDockview}>
          Popout window
        </button>
        <button type="button" onClick={onOpenModal} disabled={!hasState}>
          Modal
        </button>
        <button type="button" onClick={onOpenDrawer} disabled={!hasState}>
          Drawer
        </button>
        <button type="button" onClick={onOpenToast} disabled={!hasState}>
          Toast
        </button>
      </div>
    </div>,
    document.body,
  )
}
