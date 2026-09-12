import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import { useAgenteContext } from '../agente/useAgente'

const INTENCOES = [
  'Mostrar servidores ativos',
  'Explique o que você pode fazer',
  'Feche o que você abriu',
] as const

export function PainelAgente(_props: IDockviewPanelProps) {
  const { mensagens, isPensando, isConectado, enviarMensagem } = useAgenteContext()
  const [texto, setTexto] = useState('')
  const historicoFimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    historicoFimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [mensagens, isPensando])

  function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!texto.trim() || !isConectado || isPensando) {
      return
    }

    enviarMensagem(texto)
    setTexto('')
  }

  function usarIntencao(intencao: string) {
    if (isPensando || !isConectado) {
      return
    }

    enviarMensagem(intencao)
  }

  return (
    <section className="content-panel agent-panel" aria-label="Conversa com o agente">
      <header className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">WebSocket + LLM</p>
          <h2>Agente</h2>
        </div>
        <span className={isConectado ? 'live-status live-status--connected' : 'live-status'}>
          {isConectado ? 'Conectado' : 'Reconectando'}
        </span>
      </header>

      <div className="agent-chat-history" role="log" aria-live="polite" aria-busy={isPensando}>
        {mensagens.length === 0 && (
          <p className="panel-status">Converse comigo para abrir painéis e consultar o ambiente.</p>
        )}
        {mensagens.map((mensagem) => (
          <article className={`agent-message agent-message--${mensagem.autor}`} key={mensagem.id}>
            <span className="agent-message__author">
              {mensagem.autor === 'usuario' ? 'Você' : mensagem.autor === 'agente' ? 'Agente' : 'Sistema'}
            </span>
            <p>{mensagem.texto}</p>
          </article>
        ))}
        {isPensando && (
          <p className="agent-thinking" role="status">
            Pensando...
          </p>
        )}
        <div ref={historicoFimRef} />
      </div>

      <form className="agent-compose" onSubmit={enviar}>
        <label className="visually-hidden" htmlFor="agent-input">
          Mensagem para o agente
        </label>
        <textarea
          id="agent-input"
          rows={2}
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          placeholder="Peça uma ação ou informação..."
          disabled={!isConectado || isPensando}
        />
        <button type="submit" disabled={!isConectado || isPensando || !texto.trim()}>
          Enviar
        </button>
      </form>

      <div className="agent-intents" aria-label="Intenções rápidas">
        {INTENCOES.map((intencao) => (
          <button
            key={intencao}
            type="button"
            onClick={() => usarIntencao(intencao)}
            disabled={!isConectado || isPensando}
          >
            {intencao}
          </button>
        ))}
      </div>
    </section>
  )
}
