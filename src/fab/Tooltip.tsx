import { createPortal } from 'react-dom'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

type TooltipPosition = {
  left: number
  top: number
  placement: 'above' | 'below'
}

const TOOLTIP_WIDTH = 260
const VIEWPORT_PADDING = 12
const TOOLTIP_GAP = 8
const ESTIMATED_TOOLTIP_HEIGHT = 80

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function getTooltipPosition(anchor: HTMLButtonElement): TooltipPosition {
  const anchorBounds = anchor.getBoundingClientRect()
  const halfWidth = TOOLTIP_WIDTH / 2
  const minimumCenter = Math.min(window.innerWidth / 2, VIEWPORT_PADDING + halfWidth)
  const maximumCenter = Math.max(
    window.innerWidth / 2,
    window.innerWidth - VIEWPORT_PADDING - halfWidth,
  )
  const left = clamp(anchorBounds.left + anchorBounds.width / 2, minimumCenter, maximumCenter)
  const placement =
    anchorBounds.top >= ESTIMATED_TOOLTIP_HEIGHT + TOOLTIP_GAP + VIEWPORT_PADDING
      ? 'above'
      : 'below'

  return {
    left,
    top:
      placement === 'above'
        ? anchorBounds.top - TOOLTIP_GAP
        : anchorBounds.bottom + TOOLTIP_GAP,
    placement,
  }
}

export function Tooltip({ message }: { message: string }) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<TooltipPosition>({
    left: VIEWPORT_PADDING,
    top: VIEWPORT_PADDING,
    placement: 'below',
  })
  const tooltipId = useId()

  useLayoutEffect(() => {
    if (!isOpen) {
      return
    }

    function updatePosition() {
      if (anchorRef.current) {
        setPosition(getTooltipPosition(anchorRef.current))
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (
        target instanceof Node &&
        !anchorRef.current?.contains(target) &&
        !tooltipRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function toggleTooltip() {
    setIsOpen((open) => !open)
  }

  return (
    <>
      <button
        ref={anchorRef}
        className="floating-card-action"
        type="button"
        aria-label="Mostrar alerta do floating card"
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          toggleTooltip()
        }}
      >
        !
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            className={`floating-card-tooltip floating-card-tooltip--${position.placement}`}
            role="tooltip"
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
          >
            {message}
          </div>,
          document.body,
        )}
    </>
  )
}
