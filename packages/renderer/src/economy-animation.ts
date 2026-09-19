import type { EconomyPhase } from '@rts/protocol'

export const FACTION_BY_OWNER: readonly ('blue' | 'red' | 'purple' | 'yellow')[] = ['blue', 'red', 'purple', 'yellow']

export interface EconomyFrames {
  readonly gather: unknown | null
  readonly carryIdle: unknown | null
  readonly carryRun: unknown | null
}

export function economyFrameKey(owner: number, anim: keyof EconomyFrames): string {
  const faction = FACTION_BY_OWNER[owner % FACTION_BY_OWNER.length] ?? 'blue'
  let subtype = 'run_gold'
  if (anim === 'gather') {
    subtype = 'interact_pickaxe'
  }
  if (anim === 'carryIdle') {
    subtype = 'idle_gold'
  }
  return `units.${faction}.pawn.pawn_${subtype}`
}

export function economyAnimation(
  frames: EconomyFrames,
  phase: EconomyPhase | undefined,
  moving: boolean
): unknown | null {
  if (phase === 'gathering') {
    return frames.gather
  }
  if (phase === 'to_base') {
    return moving ? frames.carryRun : frames.carryIdle
  }
  return null
}
