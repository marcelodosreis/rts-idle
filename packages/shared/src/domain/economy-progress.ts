export const ECONOMY_PHASES = ['to_node', 'gathering', 'to_base', 'waiting_for_base'] as const
export type EconomyPhase = (typeof ECONOMY_PHASES)[number]

export const ECONOMY_PROGRESS_TONES = ['mining', 'delivery'] as const
export const PROGRESS_TONES = ['mining', 'construction', 'training', 'delivery'] as const
export type ProgressTone = (typeof PROGRESS_TONES)[number]
export type EconomyProgressTone = (typeof ECONOMY_PROGRESS_TONES)[number]

/** Maps each economy phase to the semantic progress color used by all clients. */
export function economyProgressTone(phase: EconomyPhase): EconomyProgressTone {
  if (phase === 'to_node' || phase === 'gathering') {
    return 'mining'
  }
  return 'delivery'
}
