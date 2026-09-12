export const PIPELINE_STEPS = [
  { id: 1, label: 'Entrada' },
  { id: 2, label: 'Processamento' },
  { id: 3, label: 'Validação' },
  { id: 4, label: 'Saída' },
] as const

export const PIPELINE_EDGES = [
  { source: 1, target: 2 },
  { source: 2, target: 3 },
  { source: 3, target: 4 },
] as const
