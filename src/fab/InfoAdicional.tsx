import type { EstadoBackend } from '../paineis/api'

const ESTADO_LABELS: Array<{ key: keyof EstadoBackend; label: string }> = [
  { key: 'skills', label: 'Skills' },
  { key: 'agents', label: 'Agents' },
  { key: 'commands', label: 'Commands' },
  { key: 'testes', label: 'Testes' },
]

export function InfoAdicional({ estado }: { estado: EstadoBackend }) {
  return (
    <section className="additional-info" aria-label="Informação adicional do backend">
      <header className="additional-info__heading">
        <p className="panel-heading__eyebrow">Backend real</p>
        <h2>Informação adicional</h2>
      </header>
      <dl className="additional-info__metrics">
        {ESTADO_LABELS.map(({ key, label }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{estado[key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
