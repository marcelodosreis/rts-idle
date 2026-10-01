import type { EconomyPhase } from '@rts/protocol'
import type { ResourceType, UnitKind } from '@rts/shared'
import type { AnimatedSprite } from 'pixi.js'

export const FACTIONS = ['blue', 'red', 'purple', 'yellow'] as const
export type Faction = (typeof FACTIONS)[number]

export function factionForOwner(owner: number): Faction {
  return FACTIONS[owner % FACTIONS.length] ?? 'blue'
}

export function unitAssetKey(owner: number, kind: UnitKind, subtype: string): string {
  const assetName = kind === 'lancer' || kind === 'monk' ? subtype : `${kind}_${subtype}`
  return `units.${factionForOwner(owner)}.${kind}.${assetName}`
}

export interface EconomyFrames {
  readonly build: AnimatedSprite | null
  readonly repairRun: AnimatedSprite | null
  readonly repairInteract: AnimatedSprite | null
  readonly gather: AnimatedSprite | null
  readonly carryIdle: AnimatedSprite | null
  readonly carryRun: AnimatedSprite | null
  /** Tree gathering with the axe (gold mine keeps the pickaxe frames). */
  readonly gatherAxe: AnimatedSprite | null
  /** Returning with a wood load. */
  readonly carryWoodIdle: AnimatedSprite | null
  readonly carryWoodRun: AnimatedSprite | null
  /** Walking to/from a resource holding the matching tool. */
  readonly travelAxeIdle: AnimatedSprite | null
  readonly travelAxeRun: AnimatedSprite | null
  readonly travelPickaxeIdle: AnimatedSprite | null
  readonly travelPickaxeRun: AnimatedSprite | null
}

export interface EconomyAnimationState {
  readonly phase: EconomyPhase | undefined
  readonly moving: boolean
  /** Gathered/carried material, so wood shows axe/wood sprites and gold shows pickaxe/gold. */
  readonly material?: ResourceType
  readonly carrying?: boolean
  readonly building?: boolean
  readonly repairing?: boolean
}

const ECONOMY_FRAME_SUBTYPES: Readonly<Record<keyof EconomyFrames, string>> = {
  build: 'interact_hammer',
  repairRun: 'run_hammer',
  repairInteract: 'interact_hammer',
  gather: 'interact_pickaxe',
  carryIdle: 'idle_gold',
  carryRun: 'run_gold',
  gatherAxe: 'interact_axe',
  carryWoodIdle: 'idle_wood',
  carryWoodRun: 'run_wood',
  travelAxeIdle: 'idle_axe',
  travelAxeRun: 'run_axe',
  travelPickaxeIdle: 'idle_pickaxe',
  travelPickaxeRun: 'run_pickaxe'
}

export function economyFrameKey(owner: number, anim: keyof EconomyFrames): string {
  return unitAssetKey(owner, 'pawn', ECONOMY_FRAME_SUBTYPES[anim])
}

function carryFrame(frames: EconomyFrames, material: ResourceType | undefined, moving: boolean): AnimatedSprite | null {
  if (material === 'WOOD') {
    return moving ? (frames.carryWoodRun ?? frames.carryRun) : (frames.carryWoodIdle ?? frames.carryIdle)
  }
  return moving ? frames.carryRun : frames.carryIdle
}

function travelFrame(
  frames: EconomyFrames,
  material: ResourceType | undefined,
  moving: boolean
): AnimatedSprite | null {
  if (material === 'WOOD') {
    return moving ? frames.travelAxeRun : frames.travelAxeIdle
  }
  return moving ? frames.travelPickaxeRun : frames.travelPickaxeIdle
}

export function economyAnimation(frames: EconomyFrames, state: EconomyAnimationState): AnimatedSprite | null {
  const { phase, moving, material, carrying = false, building = false, repairing = false } = state
  if (building) {
    return frames.build
  }
  if (repairing) {
    return moving ? frames.repairRun : frames.repairInteract
  }
  if (phase === 'harvesting') {
    return material === 'WOOD' ? (frames.gatherAxe ?? frames.gather) : frames.gather
  }
  // A worker carrying cargo shows the carry pose even without a gather order
  // (for example after a manual move interrupted the return trip).
  if (phase === 'to_base' || carrying) {
    return carryFrame(frames, material, moving)
  }
  if (phase === 'to_resource') {
    return travelFrame(frames, material, moving)
  }
  return null
}
