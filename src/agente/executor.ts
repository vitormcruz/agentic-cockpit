import type { DockviewApi } from 'dockview-react'
import { FLOATING_CARD_TAB_COMPONENT } from '../fab/CardTab'
import { tocarSomAberturaCard } from '../fab/som'
import { PAINEL_REGISTRY, type PainelTipo } from '../paineis/registry'
import { isServicos, type AgenteCommand, type Servico } from './types'

let agentPanelSequence = 0

const CARD_PANEL_TYPES = ['html', 'markdown', 'mermaid', 'texto'] as const
type CardPanelType = (typeof CARD_PANEL_TYPES)[number]

const FLOATING_CARD_POSITION = {
  x: 128,
  y: 128,
  width: 360,
  height: 300,
  dragHandle: 'tabbar' as const,
}

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

function isCardPanelType(value: PainelTipo): value is CardPanelType {
  return CARD_PANEL_TYPES.includes(value as CardPanelType)
}

function getCommandParams(command: Record<string, unknown>) {
  const params = isRecord(command.params) ? { ...command.params } : {}

  for (const field of ['definition', 'content']) {
    if (!(field in params) && typeof command[field] === 'string') {
      params[field] = command[field]
    }
  }

  return params
}

function addPanel(api: DockviewApi, command: Record<string, unknown>) {
  const panelType = getPainelTipo(command.panel_type)
  if (!panelType) {
    throw new Error('O tipo de painel solicitado não está disponível.')
  }

  agentPanelSequence += 1
  const panelDefinition = PAINEL_REGISTRY[panelType]
  const commandParams = getCommandParams(command)
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

function getCardPanelType(command: Record<string, unknown>, params: Record<string, unknown>) {
  if (command.panel_type !== undefined) {
    const requestedType = getPainelTipo(command.panel_type)
    if (!requestedType) {
      throw new Error('O tipo de conteúdo do floating card não está disponível.')
    }
    if (!isCardPanelType(requestedType)) {
      throw new Error('O floating card aceita somente conteúdo Mermaid, Markdown, texto ou HTML.')
    }

    return requestedType
  }

  if (typeof params.definition === 'string') {
    return 'mermaid'
  }
  if (typeof params.content === 'string') {
    return 'markdown'
  }

  throw new Error('O floating card precisa de um tipo e de conteúdo.')
}

function validateCardContent(panelType: CardPanelType, params: Record<string, unknown>) {
  const contentField = panelType === 'mermaid' ? 'definition' : 'content'
  const content = params[contentField]
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(`O floating card precisa de conteúdo em ${contentField}.`)
  }
}

function addFloatingCard(api: DockviewApi, command: Record<string, unknown>) {
  const commandParams = getCommandParams(command)
  const panelType = getCardPanelType(command, commandParams)
  validateCardContent(panelType, commandParams)

  agentPanelSequence += 1
  const panelDefinition = PAINEL_REGISTRY[panelType]
  const title = typeof command.title === 'string' ? command.title : 'Card do agente'
  const panel = api.addPanel({
    id: `agente-card-${agentPanelSequence}`,
    component: panelType,
    tabComponent: FLOATING_CARD_TAB_COMPONENT,
    params: { ...panelDefinition.params, ...commandParams },
    title,
    floating: FLOATING_CARD_POSITION,
  })

  panel.group.api.locked = 'no-drop-target'
  tocarSomAberturaCard()
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
    case 'open_card':
      if (!callbacks.api) {
        callbacks.onNotify('O layout ainda não está pronto para abrir um floating card.')
        return
      }
      addFloatingCard(callbacks.api, command)
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
