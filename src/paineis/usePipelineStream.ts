import { useContext } from 'react'
import { PipelineStreamContext, type PipelineStreamValue } from './stream-context'

export function usePipelineStream(): PipelineStreamValue {
  const context = useContext(PipelineStreamContext)
  if (!context) {
    throw new Error('usePipelineStream precisa de PipelineStreamProvider.')
  }

  return context
}
