import type { PainelTipo } from '../paineis/registry'

export type AgentePainelTipo = PainelTipo | 'agente' | 'servicos'

export type Servico = {
  nome: string
  porta: number
  estado: string
}

export function isServico(value: unknown): value is Servico {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  const service = value as Record<string, unknown>
  return (
    typeof service.nome === 'string' &&
    Number.isInteger(service.porta) &&
    typeof service.estado === 'string'
  )
}

export function isServicos(value: unknown): value is Servico[] {
  return Array.isArray(value) && value.every(isServico)
}

export type AgenteCommand = {
  name: string
  panel_type?: AgentePainelTipo
  title?: string
  floating?: boolean
  panel_id?: string
  text?: string
  level?: string
  services?: Servico[]
  definition?: string
  content?: string
  params?: Record<string, unknown>
}

export type MensagemAgente = {
  id: number
  autor: 'usuario' | 'agente' | 'sistema'
  texto: string
}
