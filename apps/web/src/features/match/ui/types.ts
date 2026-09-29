import type { ConstructionStatus, EconomyPhase, OrderState, SnapshotProduction } from '@rts/protocol'
import type { BuildingType, ResearchType, TrainableUnitKind, UnitKind } from '@rts/shared'

/** HUD-only construction status: authoritative statuses plus a derived paused state. */
export const HUD_CONSTRUCTION_STATUSES = [
  'FOUNDATION',
  'UNDER_CONSTRUCTION',
  'COMPLETED',
  'PAUSED'
] as const satisfies readonly (ConstructionStatus | 'PAUSED')[]

export type HudConstructionStatus = (typeof HUD_CONSTRUCTION_STATUSES)[number]

/** A selected unit projected for the HUD (id, archetype, movement state). */
export interface HudSelectionUnit {
  readonly id: number
  readonly kind: UnitKind
  readonly owner: number
  readonly moving: boolean
  readonly orderState?: OrderState
  readonly hp?: number
  readonly maxHp?: number
  readonly damage?: number
  readonly armor?: number
  readonly movementSpeedFixed?: number
  readonly cargoCapacity?: number
  readonly repairProgressTicks?: number
  readonly repairProgressMax?: number
  readonly healCooldownRemaining?: number
  readonly economy?: {
    readonly phase: EconomyPhase
    readonly cargoAmount: number
    readonly cargoCapacity: number
    readonly progressTicks: number
    readonly progressMax: number
  }
  /** True while the worker holds cargo, independent of its current order. */
  readonly carrying?: boolean
}

export interface HudConstruction {
  readonly id: number
  readonly buildingType: BuildingType
  readonly tier?: number
  readonly owner: number
  readonly status: HudConstructionStatus
  readonly progressTicks: number
  readonly totalTicks: number
  readonly builderId: number | null
  readonly tierUpgrade?: { readonly progressTicks: number; readonly totalTicks: number } | null
  readonly hp?: number
  readonly maxHp?: number
  readonly rallyPoint?: { readonly x: number; readonly y: number } | null
  readonly production?: SnapshotProduction
}

export interface HudMineral {
  readonly id: number
  readonly remaining: number
}

export interface HudResources {
  readonly mineral: number
  readonly supply: number
  readonly supplyCap: number
  readonly castleTier: number
  readonly completedResearch: readonly ResearchType[]
  readonly queuedResearch: readonly ResearchType[]
}

export const TRAINABLE_LABEL: Readonly<Record<TrainableUnitKind, string>> = {
  pawn: 'Pawn',
  warrior: 'Warrior',
  archer: 'Archer',
  lancer: 'Lancer',
  monk: 'Monk'
}

export const KIND_LABEL: Readonly<Record<HudSelectionUnit['kind'], string>> = {
  pawn: 'Worker',
  warrior: 'Soldier',
  archer: 'Ranger',
  lancer: 'Lancer',
  monk: 'Monk'
}

/** Tailwind text/bg classes per faction slot (0=blue, 1=red, 2=purple, 3=yellow). */
export const OWNER_COLORS: Readonly<Record<number, string>> = {
  0: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  1: 'bg-red-500/15 text-red-300 border-red-500/40',
  2: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  3: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40'
}
