import type { EconomyPhase } from '@rts/protocol'
import type { AnimatedSprite } from 'pixi.js'

export const FACTION_BY_OWNER: readonly ('blue' | 'red' | 'purple' | 'yellow')[] = ['blue', 'red', 'purple', 'yellow']

export interface EconomyFrames {
  readonly gather: AnimatedSprite | null
  readonly carryIdle: AnimatedSprite | null
  readonly carryRun: AnimatedSprite | null
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
  moving: boolean,
  carrying = false
): AnimatedSprite | null {
  if (phase === 'gathering') {
    return frames.gather
  }
  // A worker carrying cargo shows the carry pose even without a gather order
  // (for example after a manual move interrupted the return trip).
  if (phase === 'to_base' || carrying) {
    return moving ? frames.carryRun : frames.carryIdle
  }
  return null
}
