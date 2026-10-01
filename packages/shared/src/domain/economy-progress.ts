export const ECONOMY_PHASES = ['to_resource', 'harvesting', 'to_base', 'waiting_for_base'] as const
export type EconomyPhase = (typeof ECONOMY_PHASES)[number]

export const ECONOMY_PROGRESS_TONES = ['harvesting', 'delivery'] as const
export const PROGRESS_TONES = ['harvesting', 'construction', 'training', 'delivery'] as const
export type ProgressTone = (typeof PROGRESS_TONES)[number]
export type EconomyProgressTone = (typeof ECONOMY_PROGRESS_TONES)[number]

/** Maps each economy phase to the semantic progress color used by all clients. */
export function economyProgressTone(phase: EconomyPhase): EconomyProgressTone {
  if (phase === 'to_resource' || phase === 'harvesting') {
    return 'harvesting'
  }
  return 'delivery'
}
