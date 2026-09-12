import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { DockviewApi } from 'dockview-react'
import { executeAgenteCommand, type ExecutorAgenteCallbacks } from './executor'
import { isServicos, type AgenteCommand, type MensagemAgente, type Servico } from './types'

const RECONNECT_INITIAL_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 8000

export type AgenteContextValue = {
  mensagens: MensagemAgente[]
  isPensando: boolean
  isConectado: boolean
  servicos: Servico[]
  atualizarServicos: (services: Servico[]) => void
  enviarMensagem: (text: string) => void
}

type UseAgenteOptions = {
  api: DockviewApi | undefined
  onNotify: (message: string) => void
}

const AgenteContext = createContext<AgenteContextValue | undefined>(undefined)
let messageSequence = 0

function websocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/agente`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addMessage(
  setMensagens: React.Dispatch<React.SetStateAction<MensagemAgente[]>>,
  autor: MensagemAgente['autor'],
  texto: string,
) {
  messageSequence += 1
  setMensagens((messages) => [...messages, { id: messageSequence, autor, texto }])
}

function getMessageText(value: unknown): string | undefined {
  return isRecord(value) && typeof value.text === 'string' ? value.text : undefined
}

export function useAgente({ api, onNotify }: UseAgenteOptions): AgenteContextValue {
  const [mensagens, setMensagens] = useState<MensagemAgente[]>([])
  const [isPensando, setIsPensando] = useState(false)
  const [isConectado, setIsConectado] = useState(false)
  const [servicos, setServicos] = useState<Servico[]>([])
  const socketRef = useRef<WebSocket | undefined>(undefined)
  const callbacksRef = useRef<ExecutorAgenteCallbacks | undefined>(undefined)

  const appendMessage = useCallback((autor: MensagemAgente['autor'], texto: string) => {
    addMessage(setMensagens, autor, texto)
  }, [])

  const updateServices = useCallback((nextServices: Servico[]) => {
    setServicos(nextServices)
  }, [])

  useEffect(() => {
    callbacksRef.current = {
      api,
      onNotify,
      onMessage: (message) => appendMessage('agente', message),
      onUpdateServicos: updateServices,
    }
  }, [api, appendMessage, onNotify, updateServices])

  const handleEvent = useCallback(
    (rawEvent: string) => {
      let event: unknown
      try {
        event = JSON.parse(rawEvent)
      } catch {
        appendMessage('sistema', 'O agente enviou uma resposta inválida.')
        return
      }

      if (!isRecord(event) || typeof event.type !== 'string') {
        appendMessage('sistema', 'O agente enviou um evento inválido.')
        return
      }

      if (event.type === 'thinking') {
        setIsPensando(true)
        return
      }

      if (event.type === 'command') {
        executeAgenteCommand(event.command, callbacksRef.current ?? {
          api: undefined,
          onNotify,
          onMessage: (message) => appendMessage('agente', message),
          onUpdateServicos: updateServices,
        })
        return
      }

      if (event.type === 'message') {
        setIsPensando(false)
        const text = getMessageText(event)
        if (text) {
          appendMessage('agente', text)
        }
      }
    },
    [appendMessage, onNotify, updateServices],
  )

  useEffect(() => {
    let isActive = true
    let reconnectTimer: number | undefined
    let reconnectDelay = RECONNECT_INITIAL_DELAY_MS
    let socket: WebSocket | undefined

    function scheduleReconnect() {
      if (!isActive || reconnectTimer !== undefined) {
        return
      }

      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = undefined
        connect()
      }, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_DELAY_MS)
    }

    function connect() {
      if (!isActive) {
        return
      }

      socket = new WebSocket(websocketUrl())
      socketRef.current = socket
      socket.onopen = () => {
        reconnectDelay = RECONNECT_INITIAL_DELAY_MS
        setIsConectado(true)
      }
      socket.onmessage = (event) => handleEvent(event.data)
      socket.onerror = () => socket?.close()
      socket.onclose = () => {
        setIsConectado(false)
        setIsPensando(false)
        if (isActive) {
          appendMessage('sistema', 'Conexão com o agente perdida. Reconectando...')
          scheduleReconnect()
        }
      }
    }

    connect()

    return () => {
      isActive = false
      if (reconnectTimer !== undefined) {
        window.clearTimeout(reconnectTimer)
      }
      socket?.close()
      socketRef.current = undefined
    }
  }, [appendMessage, handleEvent])

  const enviarMensagem = useCallback(
    (text: string) => {
      const normalizedText = text.trim()
      if (!normalizedText) {
        return
      }

      appendMessage('usuario', normalizedText)
      const socket = socketRef.current
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        appendMessage('sistema', 'O agente está reconectando. Tente novamente em instantes.')
        return
      }

      setIsPensando(true)
      socket.send(JSON.stringify({ texto: normalizedText }))
    },
    [appendMessage],
  )

  return { mensagens, isPensando, isConectado, servicos, atualizarServicos: updateServices, enviarMensagem }
}

export function AgenteProvider({ value, children }: { value: AgenteContextValue; children: ReactNode }) {
  return createElement(AgenteContext.Provider, { value }, children)
}

export function useAgenteContext() {
  const context = useContext(AgenteContext)
  if (!context) {
    throw new Error('Painel de agente precisa estar dentro de AgenteProvider.')
  }

  return context
}

export { isServicos }
export type { AgenteCommand }
