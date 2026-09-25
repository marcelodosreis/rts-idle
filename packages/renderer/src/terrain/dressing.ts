import { createRng, type DressingKind, type RngState, rngNextInt } from '@rts/shared'
import type { AutoTileTerrain } from './autotile.js'

/**
 * Deterministic terrain dressing (master plan §20.2, capabilities.md §3):
 * scatters decorations and resources over an autotile grid from a seed, so
 * the sprite lab's terrain playground and the game's terrain layer produce
 * identical layouts for the same input. Presentation-only; never shared with
 * the simulation.
 */

// The kind union lives in `game-data` (content-as-data). Re-exported here so
// `@rts/renderer`'s public surface is unchanged.
export type { DressingKind } from '@rts/shared'

export interface DressingItem {
  readonly x: number
  readonly y: number
  readonly kind: DressingKind
  /** 0-based variant index (e.g. bush 0-3, cloud 0-7) chosen deterministically. */
  readonly variant: number
  /** Variant count for this kind (spans the curated variants). */
  readonly variants: number
}

export interface DressingConfig {
  /** Max count per kind; `0` (or absent) disables the kind. */
  readonly counts: Readonly<Partial<Record<DressingKind, number>>>
  /** Variant count per kind (drives the cyclic variant pick). */
  readonly variants: Readonly<Record<DressingKind, number>>
}

export const DEFAULT_DRESSING_VARIANTS: Readonly<Record<DressingKind, number>> = {
  bush: 4,
  tree: 4,
  rock: 4,
  cloud: 8,
  water_rock: 4,
  gold: 1,
  gold_stone: 6,
  wood: 1,
  meat: 1,
  sheep: 3
}

/**
 * Asset manifest keys backing each dressing kind, in variant order. The single
 * source of truth for decoration art, shared by the sprite lab and the game's
 * terrain layer so both resolve identical sprites for the same kind.
 */
export const DRESSING_ASSET_KEYS: Readonly<Record<DressingKind, readonly string[]>> = {
  bush: [
    'terrain.decorations.bushes.bushe1',
    'terrain.decorations.bushes.bushe2',
    'terrain.decorations.bushes.bushe3',
    'terrain.decorations.bushes.bushe4'
  ],
  tree: [
    'terrain.resources.wood.trees.tree1',
    'terrain.resources.wood.trees.tree2',
    'terrain.resources.wood.trees.tree3',
    'terrain.resources.wood.trees.tree4'
  ],
  rock: [
    'terrain.decorations.rock1',
    'terrain.decorations.rocks.rock2',
    'terrain.decorations.rocks.rock3',
    'terrain.decorations.rocks.rock4'
  ],
  cloud: [
    'terrain.decorations.clouds.clouds_01',
    'terrain.decorations.clouds.clouds_02',
    'terrain.decorations.clouds.clouds_03',
    'terrain.decorations.clouds.clouds_04',
    'terrain.decorations.clouds.clouds_05',
    'terrain.decorations.clouds.clouds_06',
    'terrain.decorations.clouds.clouds_07',
    'terrain.decorations.clouds.clouds_08'
  ],
  water_rock: [
    'terrain.decorations.rocks_in_the_water.water_rocks_01',
    'terrain.decorations.rocks_in_the_water.water_rocks_02',
    'terrain.decorations.rocks_in_the_water.water_rocks_03',
    'terrain.decorations.rocks_in_the_water.water_rocks_04'
  ],
  gold: ['terrain.resources.gold.gold_resource.gold_resource'],
  gold_stone: [
    'terrain.resources.gold.gold_stones.gold_stone_1',
    'terrain.resources.gold.gold_stones.gold_stone_2',
    'terrain.resources.gold.gold_stones.gold_stone_3',
    'terrain.resources.gold.gold_stones.gold_stone_4',
    'terrain.resources.gold.gold_stones.gold_stone_5',
    'terrain.resources.gold.gold_stones.gold_stone_6'
  ],
  wood: ['terrain.resources.wood.wood_resource.wood_resource'],
  meat: ['terrain.resources.meat.meat_resource.meat_resource'],
  sheep: ['terrain.resources.meat.sheep.sheep_idle']
}

/** Baseline decoration scatter for a 32×32 map (used by the game terrain layer). */
export const DEFAULT_DRESSING_COUNTS: Readonly<Partial<Record<DressingKind, number>>> = {
  bush: 40,
  tree: 24,
  rock: 16,
  cloud: 10,
  water_rock: 12,
  gold: 6,
  gold_stone: 8,
  wood: 4,
  meat: 4,
  sheep: 4
}

function shuffle<T>(items: readonly T[], nextInt: (maxExclusive: number) => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = nextInt(i + 1)
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

interface Tile {
  readonly x: number
  readonly y: number
}

/** Which terrain kinds host each dressing kind (master plan layer semantics). */
function hostFor(kind: DressingKind): (terrain: AutoTileTerrain) => boolean {
  switch (kind) {
    case 'water_rock':
      return (terrain) => terrain === 'water'
    case 'cloud':
      return (terrain) => terrain === 'land' || terrain === 'elevated'
    default:
      return (terrain) => terrain === 'land'
  }
}

/** Deterministically scatters dressing items over the grid. */
export function dressTerrain(
  grid: readonly (readonly AutoTileTerrain[])[],
  seed: number,
  config: DressingConfig
): readonly DressingItem[] {
  let rng: RngState = createRng(seed)
  const nextInt = (maxExclusive: number): number => {
    const result = rngNextInt(rng, maxExclusive)
    rng = result.nextState
    return result.value
  }
  const height = grid.length
  const width = height > 0 ? grid[0]!.length : 0
  const occupied = new Set<number>()
  const items: DressingItem[] = []

  const kinds = Object.keys(config.counts) as DressingKind[]
  for (const kind of kinds) {
    const max = config.counts[kind] ?? 0
    if (max <= 0) {
      continue
    }
    const hosts = hostFor(kind)
    const candidates: Tile[] = []
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const terrain = grid[y]?.[x]
        if (terrain === undefined || !hosts(terrain)) {
          continue
        }
        const index = y * width + x
        if (occupied.has(index)) {
          continue
        }
        candidates.push({ x, y })
      }
    }
    const variants = config.variants[kind] ?? 1
    for (const tile of shuffle(candidates, nextInt).slice(0, max)) {
      const index = tile.y * width + tile.x
      occupied.add(index)
      items.push({ x: tile.x, y: tile.y, kind, variant: nextInt(variants), variants })
    }
  }
  return items
}
