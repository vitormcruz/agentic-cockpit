import type { IDockviewPanelHeaderProps } from 'dockview-react'

export const FLOATING_CARD_TAB_COMPONENT = 'floating-card-tab'

export function CardTab({ api }: IDockviewPanelHeaderProps) {
  const title = api.title ?? 'Floating card'

  return (
    <div className="floating-card-tab">
      <span className="floating-card-tab__title">{title}</span>
      <button
        className="floating-card-tab__close"
        type="button"
        aria-label={`Fechar ${title}`}
        onPointerDown={(event) => event.stopPropagation()}
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
