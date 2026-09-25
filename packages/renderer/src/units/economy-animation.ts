import type { EconomyPhase } from '@rts/protocol'
import type { AnimatedSprite } from 'pixi.js'

export const FACTIONS = ['blue', 'red', 'purple', 'yellow'] as const
export type Faction = (typeof FACTIONS)[number]

export function factionForOwner(owner: number): Faction {
  return FACTIONS[owner % FACTIONS.length] ?? 'blue'
}

export function unitAssetKey(owner: number, kind: 'pawn' | 'warrior' | 'archer', subtype: string): string {
  return `units.${factionForOwner(owner)}.${kind}.${kind}_${subtype}`
}

export interface EconomyFrames {
  readonly build: AnimatedSprite | null
  readonly gather: AnimatedSprite | null
  readonly carryIdle: AnimatedSprite | null
  readonly carryRun: AnimatedSprite | null
}

export function economyFrameKey(owner: number, anim: keyof EconomyFrames): string {
  let subtype = 'run_gold'
  if (anim === 'build') {
    subtype = 'interact_hammer'
  }
  if (anim === 'gather') {
    subtype = 'interact_pickaxe'
  }
  if (anim === 'carryIdle') {
    subtype = 'idle_gold'
  }
  return unitAssetKey(owner, 'pawn', subtype)
}

export function economyAnimation(
  frames: EconomyFrames,
  phase: EconomyPhase | undefined,
  moving: boolean,
  carrying = false,
  building = false
): AnimatedSprite | null {
  if (building) {
    return frames.build
  }
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
