import { useEffect, useRef, useState } from 'react'
import {
  apiErrorMessage,
  fetchApiJson,
  isEstadoBackend,
  type EstadoBackend,
} from '../paineis/api'
import { Drawer } from './Drawer'
import { Modal } from './Modal'
import { Popover } from './Popover'
import { Toast } from './Toast'
import { tocarSomAberturaCard } from './som'

type FabProps = {
  dockviewReady: boolean
  onOpenFloating: (estado: EstadoBackend) => void
  onOpenFloatingCard: (estado: EstadoBackend) => void
  onOpenPopout: (estado: EstadoBackend) => void
}

type OverlayType = 'modal' | 'drawer' | 'toast'

export function Fab({ dockviewReady, onOpenFloating, onOpenFloatingCard, onOpenPopout }: FabProps) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [estado, setEstado] = useState<EstadoBackend>()
  const [errorMessage, setErrorMessage] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)
  const [activeOverlay, setActiveOverlay] = useState<OverlayType>()

  useEffect(() => {
    if (!isPopoverOpen) {
      return
    }

    let isActive = true
    const controller = new AbortController()

    fetchApiJson<unknown>('/api/estado', controller.signal)
      .then((payload) => {
        if (!isEstadoBackend(payload)) {
          throw new Error('O backend retornou um formato de estado inválido.')
        }

        if (isActive) {
          setEstado(payload)
        }
      })
      .catch((error: unknown) => {
        if (isActive && !controller.signal.aborted) {
          setEstado(undefined)
          setErrorMessage(apiErrorMessage(error))
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [isPopoverOpen])

  function closePopover() {
    setIsPopoverOpen(false)
  }

  function togglePopover() {
    if (!isPopoverOpen) {
      setIsLoading(true)
      setErrorMessage(undefined)
      setEstado(undefined)
    }

    setIsPopoverOpen((open) => !open)
  }

  function openOverlay(type: OverlayType) {
    if (estado) {
      setActiveOverlay(type)
      closePopover()
    }
  }

  function openFloating() {
    if (estado) {
      onOpenFloating(estado)
      closePopover()
    }
  }

  function openFloatingCard() {
    if (estado) {
      tocarSomAberturaCard()
      onOpenFloatingCard(estado)
      closePopover()
    }
  }

  function openPopout() {
    if (estado) {
      onOpenPopout(estado)
      closePopover()
    }
  }

  return (
    <>
      <button
        ref={anchorRef}
        className="fab-button"
        type="button"
        aria-label="Abrir widgets flutuantes"
        aria-expanded={isPopoverOpen}
        onClick={togglePopover}
      >
        <span aria-hidden="true">+</span>
      </button>

      {isPopoverOpen && (
        <Popover
          anchorRef={anchorRef}
          estado={estado}
          errorMessage={errorMessage}
          isLoading={isLoading}
          dockviewReady={dockviewReady}
          onClose={closePopover}
          onOpenFloating={openFloating}
          onOpenFloatingCard={openFloatingCard}
          onOpenPopout={openPopout}
          onOpenModal={() => openOverlay('modal')}
          onOpenDrawer={() => openOverlay('drawer')}
          onOpenToast={() => openOverlay('toast')}
        />
      )}

      {activeOverlay === 'modal' && estado && (
        <Modal estado={estado} onClose={() => setActiveOverlay(undefined)} />
      )}
      {activeOverlay === 'drawer' && estado && (
        <Drawer estado={estado} onClose={() => setActiveOverlay(undefined)} />
      )}
      {activeOverlay === 'toast' && estado && (
        <Toast estado={estado} onClose={() => setActiveOverlay(undefined)} />
      )}
    </>
  )
}
