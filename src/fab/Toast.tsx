import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { EstadoBackend } from '../paineis/api'
import { InfoAdicional } from './InfoAdicional'

const TOAST_DURATION_MS = 3000

type ToastProps = {
  estado?: EstadoBackend
  message?: string
  onClose: () => void
}

export function Toast({ estado, message, onClose }: ToastProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onClose, TOAST_DURATION_MS)
    return () => window.clearTimeout(timeoutId)
  }, [message, onClose])

  return createPortal(
    <aside className="fab-toast" role="status" aria-live="polite" aria-label="Toast de informação">
      <div className="fab-toast__heading">
        <p className="panel-heading__eyebrow">Toast, 3 segundos</p>
        <button className="fab-overlay__close" type="button" onClick={onClose} aria-label="Fechar toast">
          ×
        </button>
      </div>
      {message ? <p className="fab-toast__message">{message}</p> : estado && <InfoAdicional estado={estado} />}
    </aside>,
    document.body,
  )
}
