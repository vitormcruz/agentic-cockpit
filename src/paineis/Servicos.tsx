import { useEffect, useRef, useState } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import { apiErrorMessage, fetchApiJson } from './api'
import { useAgenteContext } from '../agente/useAgente'
import { isServicos, type Servico } from '../agente/types'

const SERVICE_EXIT_ANIMATION_MS = 220

type FaseServico = 'entrando' | 'estavel' | 'saindo'
type ServicoRenderizado = Servico & { fase: FaseServico }

function mergeServices(current: ServicoRenderizado[], next: Servico[]): ServicoRenderizado[] {
  const currentByPort = new Map(current.map((service) => [service.porta, service]))
  const nextPorts = new Set(next.map((service) => service.porta))
  const activeServices = next.map((service) => ({
    ...service,
    fase: currentByPort.has(service.porta) ? ('estavel' as const) : ('entrando' as const),
  }))
  const leavingServices = current
    .filter((service) => !nextPorts.has(service.porta))
    .map((service) => ({ ...service, fase: 'saindo' as const }))

  return [...activeServices, ...leavingServices]
}

export function PainelServicos(_props: IDockviewPanelProps) {
  const { servicos, isConectado, atualizarServicos } = useServicesContext()
  const [displayedServices, setDisplayedServices] = useState<ServicoRenderizado[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [refreshSequence, setRefreshSequence] = useState(0)
  const removalTimersRef = useRef<Map<number, number>>(new Map())

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setDisplayedServices((current) => mergeServices(current, servicos))
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [servicos])

  useEffect(() => {
    const timers = removalTimersRef.current
    const leavingPorts = displayedServices
      .filter((service) => service.fase === 'saindo')
      .map((service) => service.porta)

    leavingPorts.forEach((port) => {
      if (timers.has(port)) {
        return
      }

      timers.set(
        port,
        window.setTimeout(() => {
          setDisplayedServices((current) =>
            current.filter((service) => service.porta !== port || service.fase !== 'saindo'),
          )
          timers.delete(port)
        }, SERVICE_EXIT_ANIMATION_MS),
      )
    })

    timers.forEach((timer, port) => {
      if (!leavingPorts.includes(port)) {
        window.clearTimeout(timer)
        timers.delete(port)
      }
    })
  }, [displayedServices])

  useEffect(() => {
    const timers = removalTimersRef.current

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [])

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    fetchApiJson<unknown>('/api/servicos', controller.signal)
      .then((payload) => {
        if (!isServicos(payload)) {
          throw new Error('O backend retornou uma lista de serviços inválida.')
        }

        if (isActive) {
          atualizarServicos(payload)
          setErrorMessage(undefined)
        }
      })
      .catch((error: unknown) => {
        if (isActive && !controller.signal.aborted) {
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
  }, [atualizarServicos, refreshSequence])

  function handleRefresh() {
    setIsLoading(true)
    setErrorMessage(undefined)
    setRefreshSequence((sequence) => sequence + 1)
  }

  return (
    <section className="content-panel services-panel" aria-label="Serviços ativos">
      <header className="panel-heading">
        <div>
          <p className="panel-heading__eyebrow">Inventário real</p>
          <h2>Serviços ativos</h2>
        </div>
        <div className="services-panel__actions">
          <span className={isConectado ? 'live-status live-status--connected' : 'live-status'}>
            {displayedServices.length} ativos
          </span>
          <button className="panel-heading__button" type="button" onClick={handleRefresh} disabled={isLoading}>
            Atualizar
          </button>
        </div>
      </header>

      {isLoading && (
        <p className="panel-status" role="status">
          Consultando portas em escuta...
        </p>
      )}

      {errorMessage && (
        <div className="panel-error" role="alert">
          <strong>Inventário indisponível</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {!isLoading && !errorMessage && displayedServices.length === 0 && (
        <p className="panel-status" role="status">
          Nenhum serviço em escuta foi encontrado.
        </p>
      )}

      {displayedServices.length > 0 && (
        <ul className="services-list" aria-label="Lista de serviços">
          {displayedServices.map((service) => (
            <li className={`services-list__item services-list__item--${service.fase}`} key={service.porta}>
              <div>
                <strong>{service.nome}</strong>
                <span>porta {service.porta}</span>
              </div>
              <span className="service-state">{service.estado}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function useServicesContext() {
  const context = useAgenteContext()
  return {
    servicos: context.servicos,
    isConectado: context.isConectado,
    atualizarServicos: context.atualizarServicos,
  }
}
