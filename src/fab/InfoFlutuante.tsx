import type { IDockviewPanelProps } from 'dockview-react'
import { isEstadoBackend, type EstadoBackend } from '../paineis/api'
import { InfoAdicional } from './InfoAdicional'

export const FAB_INFO_COMPONENT = 'fab-info'

type InfoFlutuanteParams = {
  estado: EstadoBackend
}

export function PainelInfoFlutuante({ params }: IDockviewPanelProps<InfoFlutuanteParams>) {
  if (!isEstadoBackend(params.estado)) {
    return (
      <section className="content-panel fab-info-panel" aria-label="Informação adicional">
        <div className="panel-error" role="alert">
          <strong>Informação indisponível</strong>
          <p>O painel não recebeu um estado válido do backend.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="content-panel fab-info-panel" aria-label="Informação adicional">
      <InfoAdicional estado={params.estado} />
    </section>
  )
}
