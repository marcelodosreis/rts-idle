import type { AnimatedSprite } from 'pixi.js'
import type { AssetLibrary } from '../assets/asset-library.js'
import type { UnitKind } from '../core/types.js'
import { type EconomyFrames, economyFrameKey } from './economy-animation.js'

const PAWN_FRAME_KEYS = [
  'build',
  'repairRun',
  'repairInteract',
  'gather',
  'carryIdle',
  'carryRun',
  'gatherAxe',
  'carryWoodIdle',
  'carryWoodRun',
  'travelAxeIdle',
  'travelAxeRun',
  'travelPickaxeIdle',
  'travelPickaxeRun'
] as const satisfies readonly (keyof EconomyFrames)[]

/** Loads every economy frame a pawn may show; other kinds have none. */
export async function loadEconomyFrames(library: AssetLibrary, owner: number, kind: UnitKind): Promise<EconomyFrames> {
  const frames: Record<keyof EconomyFrames, AnimatedSprite | null> = {
    build: null,
    repairRun: null,
    repairInteract: null,
    gather: null,
    carryIdle: null,
    carryRun: null,
    gatherAxe: null,
    carryWoodIdle: null,
    carryWoodRun: null,
    travelAxeIdle: null,
    travelAxeRun: null,
    travelPickaxeIdle: null,
    travelPickaxeRun: null
  }
  if (kind !== 'pawn') {
    return frames
  }
  const loaded = await Promise.all(PAWN_FRAME_KEYS.map((key) => library.animated(economyFrameKey(owner, key))))
  PAWN_FRAME_KEYS.forEach((key, index) => {
    frames[key] = loaded[index] ?? null
  })
  return frames
}
