import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { EstadoBackend } from '../paineis/api'
import { InfoAdicional } from './InfoAdicional'

type DrawerProps = {
  estado: EstadoBackend
  onClose: () => void
}

export function Drawer({ estado, onClose }: DrawerProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div
      className="fab-overlay fab-drawer-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <aside className="fab-drawer" role="dialog" aria-modal="true" aria-label="Drawer de informação">
        <div className="fab-overlay__heading">
          <p className="panel-heading__eyebrow">Drawer</p>
          <button className="fab-overlay__close" type="button" onClick={onClose} aria-label="Fechar drawer">
            ×
          </button>
        </div>
        <InfoAdicional estado={estado} />
      </aside>
    </div>,
    document.body,
  )
}
