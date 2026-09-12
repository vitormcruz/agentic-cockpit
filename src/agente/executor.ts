import type { DockviewApi } from 'dockview-react'
import { PAINEL_REGISTRY, type PainelTipo } from '../paineis/registry'
import { isServicos, type AgenteCommand, type Servico } from './types'

let agentPanelSequence = 0

export type ExecutorAgenteCallbacks = {
  api: DockviewApi | undefined
  onNotify: (message: string) => void
  onMessage: (message: string) => void
  onUpdateServicos: (services: Servico[]) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getPainelTipo(value: unknown): PainelTipo | undefined {
  if (typeof value !== 'string' || !(value in PAINEL_REGISTRY)) {
    return undefined
  }

  return value as PainelTipo
}

function addPanel(api: DockviewApi, command: Record<string, unknown>) {
  const panelType = getPainelTipo(command.panel_type)
  if (!panelType) {
    throw new Error('O tipo de painel solicitado não está disponível.')
  }

  agentPanelSequence += 1
  const panelDefinition = PAINEL_REGISTRY[panelType]
  const commandParams = isRecord(command.params) ? command.params : {}
  const title = typeof command.title === 'string' ? command.title : panelDefinition.label

  const panelOptions = {
    id: `agente-${panelType}-${agentPanelSequence}`,
    component: panelType,
    params: { ...panelDefinition.params, ...commandParams },
    title,
  }

  if (command.floating === true) {
    api.addPanel({
      ...panelOptions,
      floating: {
        x: 120,
        y: 120,
        width: 420,
        height: 360,
      },
    })
    return
  }

  api.addPanel(panelOptions)
}

function closePanel(api: DockviewApi, command: Record<string, unknown>) {
  const panelId = typeof command.panel_id === 'string' ? command.panel_id : undefined
  const panelType = getPainelTipo(command.panel_type)
  const panels = api.panels.filter((panel) => {
    if (panelId) {
      return panel.id === panelId
    }

    return panelType !== undefined && panel.toJSON().contentComponent === panelType
  })

  panels.forEach((panel) => panel.api.close())
}

function executeCommand(command: Record<string, unknown>, callbacks: ExecutorAgenteCallbacks) {
  switch (command.name) {
    case 'open_panel':
      if (!callbacks.api) {
        callbacks.onNotify('O layout ainda não está pronto para abrir um painel.')
        return
      }
      addPanel(callbacks.api, command)
      return
    case 'close_panel':
      if (callbacks.api) {
        closePanel(callbacks.api, command)
      }
      return
    case 'notify':
      if (typeof command.text === 'string') {
        callbacks.onNotify(command.text)
      }
      return
    case 'message':
      if (typeof command.text === 'string') {
        callbacks.onMessage(command.text)
      }
      return
    case 'update_servicos':
      if (isServicos(command.services)) {
        callbacks.onUpdateServicos(command.services)
      }
      return
    default:
      callbacks.onNotify('O agente enviou um comando que não foi reconhecido.')
  }
}

export function executeAgenteCommand(command: unknown, callbacks: ExecutorAgenteCallbacks) {
  if (!isRecord(command) || typeof command.name !== 'string') {
    callbacks.onNotify('O agente enviou um comando inválido.')
    return
  }

  try {
    executeCommand(command, callbacks)
  } catch {
    callbacks.onNotify('Não foi possível executar a ação solicitada pelo agente.')
  }
}

export type { AgenteCommand }
