import type { AssetKind } from './manifest-types.js'

/**
 * Curated asset index: the semantic set we ship today, mapping source files in
 * the vendor pack (`tmp/tiny_swords`) to normalized target paths under the
 * assets root. Everything the game does not yet use stays out of this list —
 * see `docs/assets/capabilities.md` for the full pack inventory.
 *
 * Source pack: Tiny Swords (Kay Lousberg / Pixel Frog), license-pending
 * (ADR-015 golden rule).
 */

export const FACTS = ['blue', 'red', 'purple', 'yellow'] as const
export type Faction = (typeof FACTS)[number]

/** Maps our faction key to the vendor directory name. */
export const FACTION_DIR: Readonly<Record<Faction, string>> = {
  blue: 'Blue Units',
  red: 'Red Units',
  purple: 'Purple Units',
  yellow: 'Yellow Units'
}

export interface CuratedSource {
  readonly key: string
  /** Path relative to the vendor pack root (`tmp/tiny_swords`). */
  readonly source: string
  /** Target path relative to the assets root. */
  readonly file: string
  readonly kind: AssetKind
  /** Explicit cell size for `tileset`. */
  readonly cell?: number
  readonly duration?: number
  readonly anchorX: number
  readonly anchorY: number
  readonly flipOnMoveX?: boolean
}

const UNIT_ANIMS: readonly { readonly anim: string; readonly file: string; readonly duration: number }[] = [
  { anim: 'idle', file: 'Pawn_Idle.png', duration: 120 },
  { anim: 'run', file: 'Pawn_Run.png', duration: 100 },
  { anim: 'attack', file: 'Pawn_Interact Hammer.png', duration: 150 }
]

function unitEntry(faction: Faction, type: string, anim: string, file: string, duration: number): CuratedSource {
  return {
    key: `units.${faction}.${type.toLowerCase()}.${anim}`,
    source: `Units/${FACTION_DIR[faction]}/${type}/${file}`,
    file: `units/${faction}/${type.toLowerCase()}/${anim}.png`,
    kind: 'strip' as const,
    duration,
    anchorX: 0.5,
    anchorY: 1,
    flipOnMoveX: true
  }
}

export const CURATED: readonly CuratedSource[] = [
  ...FACTS.flatMap((faction) =>
    UNIT_ANIMS.map(({ anim, file, duration }) => unitEntry(faction, 'Pawn', anim, file, duration))
  ),
  ...FACTS.flatMap((faction) => [
    unitEntry(faction, 'Warrior', 'idle', 'Warrior_Idle.png', 120),
    unitEntry(faction, 'Warrior', 'run', 'Warrior_Run.png', 100),
    unitEntry(faction, 'Warrior', 'attack', 'Warrior_Attack1.png', 150),
    unitEntry(faction, 'Archer', 'idle', 'Archer_Idle.png', 120),
    unitEntry(faction, 'Archer', 'run', 'Archer_Run.png', 100),
    unitEntry(faction, 'Archer', 'attack', 'Archer_Shoot.png', 150),
    {
      key: `units.${faction}.archer.arrow`,
      source: `Units/${FACTION_DIR[faction]}/Archer/Arrow.png`,
      file: `units/${faction}/archer/arrow.png`,
      kind: 'static' as const,
      anchorX: 0.5,
      anchorY: 0.5
    }
  ]),
  {
    key: 'terrain.tileset.color1',
    source: 'Terrain/Tileset/Tilemap_color1.png',
    file: 'terrain/tileset/color1.png',
    kind: 'tileset' as const,
    cell: 64,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.water.foam',
    source: 'Terrain/Tileset/Water Foam.png',
    file: 'terrain/water/foam.png',
    kind: 'strip' as const,
    duration: 150,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.water.background',
    source: 'Terrain/Tileset/Water Background color.png',
    file: 'terrain/water/background.png',
    kind: 'static' as const,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.shadow',
    source: 'Terrain/Tileset/Shadow.png',
    file: 'terrain/shadow.png',
    kind: 'static' as const,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'terrain.decorations.rock1',
    source: 'Terrain/Decorations/Rocks/Rock1.png',
    file: 'terrain/decorations/rock1.png',
    kind: 'static' as const,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'fx.explosion_01',
    source: 'Particle FX/Explosion_01.png',
    file: 'fx/explosion_01.png',
    kind: 'strip' as const,
    duration: 100,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.bars.smallbar_base',
    source: 'UI Elements/UI Elements/Bars/SmallBar_Base.png',
    file: 'ui/bars/smallbar_base.png',
    kind: 'static' as const,
    anchorX: 0.5,
    anchorY: 0.5
  },
  {
    key: 'ui.bars.smallbar_fill',
    source: 'UI Elements/UI Elements/Bars/SmallBar_Fill.png',
    file: 'ui/bars/smallbar_fill.png',
    kind: 'static' as const,
    anchorX: 0.5,
    anchorY: 0.5
  }
]
