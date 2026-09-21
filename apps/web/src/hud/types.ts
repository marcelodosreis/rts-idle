/** A selected unit projected for the HUD (id, archetype, movement state). */
export interface HudSelectionUnit {
  readonly id: number
  readonly kind: 'pawn' | 'warrior' | 'archer'
  readonly owner: number
  readonly moving: boolean
  readonly orderState?: 'idle' | 'moving' | 'attacking' | 'hold' | 'patrol' | 'attack_move'
  readonly hp?: number
  readonly maxHp?: number
  readonly economy?: {
    readonly phase: 'to_node' | 'gathering' | 'to_base' | 'waiting_for_base'
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
  readonly buildingType: 'BASE' | 'BARRACKS' | 'SUPPLY_DEPOT'
  readonly owner: number
  readonly status: 'FOUNDATION' | 'UNDER_CONSTRUCTION' | 'COMPLETED' | 'PAUSED'
  readonly progressTicks: number
  readonly totalTicks: number
  readonly builderId: number | null
}

export interface HudMineral {
  readonly id: number
  readonly remaining: number
}

export interface HudResources {
  readonly mineral: number
  readonly energy: number
  readonly supply: number
  readonly supplyCap: number
}

export const KIND_LABEL: Readonly<Record<HudSelectionUnit['kind'], string>> = {
  pawn: 'Worker',
  warrior: 'Soldier',
  archer: 'Ranger'
}

/** Tailwind text/bg classes per faction slot (0=blue, 1=red, 2=purple, 3=yellow). */
export const OWNER_COLORS: Readonly<Record<number, string>> = {
  0: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  1: 'bg-red-500/15 text-red-300 border-red-500/40',
  2: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  3: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40'
}
