import type { UnitKind } from '@rts/shared'

/**
 * Authored combat stats per unit kind (master plan P1.05). Phase 1 balance:
 * warrior is a melee bruiser, archer is a fragile ranged unit, pawn is the
 * baseline. Values: maxHp/damage in hit points, rangeTiles in tiles (one tile
 * is FIXED_SCALE fixed units), cooldownTicks in simulation ticks (20/s, ADR-009).
 */
export interface UnitCombatStats {
  readonly maxHp: number
  readonly armor: number
  readonly damage: number
  readonly rangeTiles: number
  readonly cooldownTicks: number
  readonly mechanical: boolean
  readonly movementSpeedTilesPerSecond: number
  readonly militaryAttackUpgrade: boolean
  readonly militaryDefenseUpgrade: boolean
  readonly economyUpgrade: boolean
  readonly movementUpgrade: boolean
}

export const UNIT_STATS_BY_KIND: Readonly<Record<UnitKind, UnitCombatStats>> = {
  pawn: {
    maxHp: 100,
    armor: 0,
    damage: 10,
    rangeTiles: 1,
    cooldownTicks: 20,
    mechanical: true,
    movementSpeedTilesPerSecond: 4,
    militaryAttackUpgrade: false,
    militaryDefenseUpgrade: false,
    economyUpgrade: true,
    movementUpgrade: true
  },
  warrior: {
    maxHp: 150,
    armor: 0,
    damage: 15,
    rangeTiles: 1,
    cooldownTicks: 20,
    mechanical: true,
    movementSpeedTilesPerSecond: 4,
    militaryAttackUpgrade: true,
    militaryDefenseUpgrade: true,
    economyUpgrade: false,
    movementUpgrade: true
  },
  archer: {
    maxHp: 60,
    armor: 0,
    damage: 8,
    rangeTiles: 3,
    cooldownTicks: 20,
    mechanical: true,
    movementSpeedTilesPerSecond: 4,
    militaryAttackUpgrade: true,
    militaryDefenseUpgrade: true,
    economyUpgrade: false,
    movementUpgrade: true
  },
  lancer: {
    maxHp: 120,
    armor: 0,
    damage: 15,
    rangeTiles: 2,
    cooldownTicks: 20,
    mechanical: true,
    movementSpeedTilesPerSecond: 5,
    militaryAttackUpgrade: true,
    militaryDefenseUpgrade: true,
    economyUpgrade: false,
    movementUpgrade: true
  },
  monk: {
    maxHp: 60,
    armor: 0,
    damage: 8,
    rangeTiles: 3,
    cooldownTicks: 20,
    mechanical: true,
    movementSpeedTilesPerSecond: 4,
    militaryAttackUpgrade: false,
    militaryDefenseUpgrade: true,
    economyUpgrade: false,
    movementUpgrade: true
  }
}

/** Baseline stats; every kind resolves through {@link unitStatsFor}. */
export const UNIT_COMBAT_STATS: UnitCombatStats = UNIT_STATS_BY_KIND.pawn

/** Combat stats for a unit kind (defaults to the pawn baseline when unknown). */
export function unitStatsFor(kind: UnitKind): UnitCombatStats {
  return UNIT_STATS_BY_KIND[kind] ?? UNIT_COMBAT_STATS
}

/** Monks are support units and do not have an offensive combat capability. */
export function unitCanAttack(kind: UnitKind | undefined): boolean {
  return kind !== 'monk'
}
