import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { EstadoBackend } from '../paineis/api'
import { InfoAdicional } from './InfoAdicional'

type ModalProps = {
  estado: EstadoBackend
  onClose: () => void
}

export function Modal({ estado, onClose }: ModalProps) {
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
      className="fab-overlay fab-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section className="fab-modal" role="dialog" aria-modal="true" aria-label="Modal de informação">
        <div className="fab-overlay__heading">
          <p className="panel-heading__eyebrow">Modal</p>
          <button className="fab-overlay__close" type="button" onClick={onClose} aria-label="Fechar modal">
            ×
          </button>
        </div>
        <InfoAdicional estado={estado} />
      </section>
    </div>,
    document.body,
  )
}
