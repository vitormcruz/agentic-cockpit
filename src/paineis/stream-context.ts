import { createContext } from 'react'
import type { EventoPipeline } from './stream'

export type PipelineStreamValue = {
  latestEvent: EventoPipeline | undefined
  errorMessage: string | undefined
  isConnected: boolean
}

export const PipelineStreamContext = createContext<PipelineStreamValue | undefined>(undefined)
