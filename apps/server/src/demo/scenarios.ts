import { type Fixed, type PlayerId, tilesToFixed, type UnitKind } from '@rts/shared'

export interface DemoSpawn {
  readonly owner: PlayerId
  readonly kind: UnitKind
  readonly x: Fixed
  readonly y: Fixed
  readonly worker?: boolean
}

export interface DemoBaseSpawn {
  readonly owner: PlayerId
  readonly x: Fixed
  readonly y: Fixed
}

export interface DemoMineralNodeSpawn {
  readonly x: Fixed
  readonly y: Fixed
  readonly remaining: number
}

export interface DemoScenario {
  readonly id: string
  readonly label: string
  readonly startingGold?: number
  readonly spawns: readonly DemoSpawn[]
  readonly buildings?: readonly DemoBaseSpawn[]
  readonly mineralNodes?: readonly DemoMineralNodeSpawn[]
  /** Engagement pairs: index of the attacking spawn → index of its target. */
  readonly attacks: readonly (readonly [number, number])[]
  /**
   * When true (default), the player's own units (owner 0) spawn idle and never
   * move until ordered; only enemies march/attack. Cinematic scenarios (win /
   * defeat) set it false so both sides fight and the result resolves itself.
   */
  readonly playerIdle?: boolean
}

function tile(x: number, y: number): { readonly x: Fixed; readonly y: Fixed } {
  return { x: tilesToFixed(x), y: tilesToFixed(y) }
}

const PAWN: UnitKind = 'pawn'
const WARRIOR: UnitKind = 'warrior'
const ARCHER: UnitKind = 'archer'

/** Demo seed — shared with `demo.ts`; keeps every scenario deterministic. */
export const DEMO_SEED = 123456

/** Six units per side, two of each archetype (pawn/warrior/archer). */
const KINDS_PER_SIDE: readonly UnitKind[] = [PAWN, WARRIOR, ARCHER, PAWN, WARRIOR, ARCHER]

/**
 * Default scenario: six units per side with two of each archetype (two pawns,
 * two warriors, two archers), mirrored so each blue unit faces the same kind
 * of red counterpart. Blue sits in a compact block near the camera home
 * (tile 8), red is mirrored opposite; the squads are close enough to be visible
 * at the start, and the enemy side marches over to attack the idle player.
 */
function defaultScenario(): DemoScenario {
  const spawns: DemoSpawn[] = []
  const attacks: (readonly [number, number])[] = []
  // Blue block first, then the mirrored red block, so pair `i` attacks `i + 6`.
  for (let i = 0; i < KINDS_PER_SIDE.length; i += 1) {
    const bx = 6 + (i % 2)
    const by = 6 + Math.floor(i / 2)
    spawns.push({ owner: 0, kind: KINDS_PER_SIDE[i]!, ...tile(bx, by) })
  }
  for (let i = 0; i < KINDS_PER_SIDE.length; i += 1) {
    const bx = 6 + (i % 2)
    const by = 6 + Math.floor(i / 2)
    spawns.push({ owner: 1, kind: KINDS_PER_SIDE[i]!, ...tile(16 - bx, 16 - by) })
  }
  for (let i = 0; i < KINDS_PER_SIDE.length; i += 1) {
    attacks.push([i, i + KINDS_PER_SIDE.length], [i + KINDS_PER_SIDE.length, i])
  }
  return { id: '6v6', label: '6v6', spawns, attacks }
}

/**
 * Demo scenario catalog. Each faction spawns in its own spot near the camera
 * home, so the whole opening is visible; in offensive mode the enemy side
 * marches to attack the idle player squad. Coordinates sit within the 32-tile
 * map, centered on the camera's home tile (8).
 */
export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  defaultScenario(),
  {
    id: 'economy',
    label: 'Economy',
    startingGold: 250,
    spawns: [
      { owner: 0, kind: PAWN, worker: true, ...tile(8, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(9, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(10, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(11, 11) }
    ],
    buildings: [
      { owner: 0, ...tile(6, 8) },
      { owner: 1, ...tile(24, 24) }
    ],
    mineralNodes: [{ remaining: 3000, ...tile(10, 8) }],
    attacks: []
  },
  {
    id: '2v2',
    label: '2v2',
    spawns: [
      { owner: 0, kind: PAWN, ...tile(6, 6) },
      { owner: 0, kind: PAWN, ...tile(7, 6) },
      { owner: 1, kind: PAWN, ...tile(10, 10) },
      { owner: 1, kind: PAWN, ...tile(9, 10) }
    ],
    attacks: [
      [0, 2],
      [1, 3],
      [2, 0],
      [3, 1]
    ]
  },
  {
    id: '4v4',
    label: '4v4',
    spawns: [
      { owner: 0, kind: PAWN, ...tile(6, 6) },
      { owner: 0, kind: PAWN, ...tile(7, 6) },
      { owner: 0, kind: PAWN, ...tile(6, 7) },
      { owner: 0, kind: PAWN, ...tile(7, 7) },
      { owner: 1, kind: PAWN, ...tile(10, 10) },
      { owner: 1, kind: PAWN, ...tile(9, 10) },
      { owner: 1, kind: PAWN, ...tile(10, 9) },
      { owner: 1, kind: PAWN, ...tile(9, 9) }
    ],
    attacks: [
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
      [4, 0],
      [5, 1],
      [6, 2],
      [7, 3]
    ]
  },
  {
    id: 'mixed',
    label: 'Melee vs ranged',
    spawns: [
      { owner: 0, kind: WARRIOR, ...tile(6, 6) },
      { owner: 0, kind: ARCHER, ...tile(7, 6) },
      { owner: 1, kind: WARRIOR, ...tile(10, 10) },
      { owner: 1, kind: ARCHER, ...tile(9, 10) }
    ],
    attacks: [
      [0, 2],
      [1, 3],
      [2, 0],
      [3, 1]
    ]
  },
  {
    id: 'ffa',
    label: 'Free for all',
    spawns: [
      { owner: 0, kind: PAWN, ...tile(6, 6) },
      { owner: 1, kind: PAWN, ...tile(10, 6) },
      { owner: 2, kind: PAWN, ...tile(6, 10) },
      { owner: 3, kind: PAWN, ...tile(10, 10) }
    ],
    attacks: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0]
    ]
  },
  {
    id: 'win',
    label: 'Overwhelming force',
    playerIdle: false,
    spawns: [
      { owner: 0, kind: PAWN, ...tile(6, 6) },
      { owner: 0, kind: PAWN, ...tile(7, 6) },
      { owner: 0, kind: PAWN, ...tile(6, 7) },
      { owner: 1, kind: PAWN, ...tile(10, 10) }
    ],
    attacks: [
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 0]
    ]
  },
  {
    id: 'defeat',
    label: 'Against the odds',
    playerIdle: false,
    spawns: [
      { owner: 0, kind: PAWN, ...tile(10, 10) },
      { owner: 1, kind: PAWN, ...tile(6, 6) },
      { owner: 1, kind: PAWN, ...tile(7, 6) },
      { owner: 1, kind: PAWN, ...tile(6, 7) }
    ],
    attacks: [
      [0, 1],
      [1, 0],
      [2, 0],
      [3, 0]
    ]
  }
]

/** Resolves a scenario id to its definition (defaults to the first scenario). */
export function scenarioById(id: string | undefined): DemoScenario {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id) ?? DEMO_SCENARIOS[0]!
}
