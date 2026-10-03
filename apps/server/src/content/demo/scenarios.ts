import { competitiveBaseLocations } from '@rts/game-data'
import { type BuildingType, type CastleTier, type Fixed, type PlayerId, tilesToFixed, type UnitKind } from '@rts/shared'

export interface DemoSpawn {
  readonly owner: PlayerId
  readonly kind: UnitKind
  readonly x: Fixed
  readonly y: Fixed
  readonly worker?: boolean
  readonly initialHp?: number
}

export interface DemoBaseSpawn {
  readonly owner: PlayerId
  readonly x: Fixed
  readonly y: Fixed
  readonly initialHp?: number
  readonly buildingType?: BuildingType
  readonly tier?: CastleTier
}

export interface DemoScenario {
  readonly id: string
  readonly label: string
  readonly startingGold?: number
  readonly startingCastleTier?: CastleTier
  readonly spawns: readonly DemoSpawn[]
  readonly buildings?: readonly DemoBaseSpawn[]
  /** Engagement pairs: index of the attacking spawn → index of its target. */
  readonly attacks: readonly (readonly [number, number])[]
  /**
   * When true (default), the player's own units (owner 0) spawn idle and never
   * move until ordered; only enemies march/attack.
   */
  readonly playerIdle?: boolean
}

function tile(x: number, y: number): { readonly x: Fixed; readonly y: Fixed } {
  return { x: tilesToFixed(x), y: tilesToFixed(y) }
}

const PAWN: UnitKind = 'pawn'
const WARRIOR: UnitKind = 'warrior'
const ARCHER: UnitKind = 'archer'
const MONK: UnitKind = 'monk'
const LANCER: UnitKind = 'lancer'
const [PLAYER_BASE, OPPONENT_BASE] = competitiveBaseLocations()

/** Demo seed — shared with `demo.ts`; keeps every scenario deterministic. */
export const DEMO_SEED = 123456

/** Eight units per side, including one Monk and one Lancer support pair. */
const KINDS_PER_SIDE: readonly UnitKind[] = [PAWN, WARRIOR, ARCHER, PAWN, WARRIOR, ARCHER, MONK, LANCER]

/**
 * Eight-versus-eight scenario: eight units per side with two of each core archetype,
 * one Monk, and one Lancer, mirrored so each blue unit faces the same kind
 * of red counterpart. Blue sits in a compact block near the camera home
 * (tile 8), red is mirrored opposite; the squads are close enough to be visible
 * at the start, and the enemy side marches over to attack the idle player.
 */
function eightVsEightScenario(): DemoScenario {
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
  return { id: '8v8', label: '8v8', spawns, attacks }
}

function defaultScenario(): DemoScenario {
  return {
    id: 'default',
    label: 'Default',
    startingGold: 250,
    spawns: [
      { owner: 0, kind: PAWN, worker: true, ...tile(7, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(8, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(9, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(10, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(11, 11) },
      { owner: 1, kind: PAWN, ...tile(22, 27) },
      { owner: 1, kind: PAWN, ...tile(23, 27) },
      { owner: 1, kind: PAWN, ...tile(24, 27) },
      { owner: 1, kind: PAWN, ...tile(25, 27) },
      { owner: 1, kind: PAWN, ...tile(26, 27) }
    ],
    buildings: [
      { owner: 0, ...tile(PLAYER_BASE.x, PLAYER_BASE.y) },
      { owner: 1, ...tile(OPPONENT_BASE.x, OPPONENT_BASE.y) }
    ],
    attacks: [
      [5, 0],
      [6, 1],
      [7, 2],
      [8, 3],
      [9, 4]
    ]
  }
}

function regressionScenario(): DemoScenario {
  return {
    id: 'regression',
    label: 'Regression',
    startingGold: 600,
    spawns: [
      { owner: 0, kind: PAWN, worker: true, ...tile(8, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(9, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(10, 11) },
      { owner: 0, kind: PAWN, worker: true, ...tile(11, 11) },
      { owner: 0, kind: WARRIOR, initialHp: 90, ...tile(13, 8) },
      { owner: 0, kind: ARCHER, ...tile(14, 8) },
      { owner: 0, kind: MONK, ...tile(15, 8) },
      { owner: 0, kind: LANCER, ...tile(16, 8) },
      { owner: 1, kind: PAWN, ...tile(18, 17) },
      { owner: 1, kind: WARRIOR, ...tile(19, 17) },
      { owner: 1, kind: ARCHER, ...tile(20, 17) },
      { owner: 1, kind: PAWN, ...tile(21, 17) },
      { owner: 1, kind: WARRIOR, ...tile(18, 18) },
      { owner: 1, kind: ARCHER, ...tile(19, 18) },
      { owner: 1, kind: MONK, ...tile(20, 18) },
      { owner: 1, kind: LANCER, ...tile(21, 18) }
    ],
    buildings: [
      { owner: 0, initialHp: 250, ...tile(PLAYER_BASE.x, PLAYER_BASE.y) },
      { owner: 0, buildingType: 'HOUSE', ...tile(16, 10) },
      { owner: 1, ...tile(OPPONENT_BASE.x, OPPONENT_BASE.y) }
    ],
    attacks: [
      [8, 0],
      [9, 1],
      [10, 2],
      [11, 3],
      [12, 4],
      [13, 5],
      [14, 6],
      [15, 7]
    ]
  }
}

function monkHealScenario(): DemoScenario {
  return {
    id: 'monk-heal',
    label: 'Monk Heal',
    startingGold: 250,
    spawns: [
      { owner: 0, kind: MONK, ...tile(8, 11) },
      { owner: 0, kind: 'warrior', initialHp: 90, ...tile(9, 11) },
      { owner: 0, kind: MONK, ...tile(8, 12) },
      { owner: 0, kind: 'warrior', initialHp: 90, ...tile(9, 12) }
    ],
    buildings: [{ owner: 1, ...tile(OPPONENT_BASE.x, OPPONENT_BASE.y) }],
    attacks: []
  }
}

/**
 * Demo scenario catalog. Each faction spawns in its own spot near the camera
 * home, so the whole opening is visible; in offensive mode the enemy side
 * marches to attack the idle player squad. Coordinates sit within the 32-tile
 * map, centered on the camera's home tile (8).
 */
export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  defaultScenario(),
  regressionScenario(),
  monkHealScenario(),
  eightVsEightScenario(),
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
  }
]

/** Resolves a scenario id to its definition (defaults to the first scenario). */
export function scenarioById(id: string | undefined): DemoScenario {
  return (
    DEMO_SCENARIOS.find((scenario) => scenario.id === id) ??
    DEMO_SCENARIOS.find((scenario) => scenario.id === 'default')!
  )
}
