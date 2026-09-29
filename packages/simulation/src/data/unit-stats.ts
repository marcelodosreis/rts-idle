import type { UnitKind } from '@rts/shared'

/**
 * Authored combat stats per unit kind (master plan P1.05). Phase 1 balance:
 * warrior is a melee bruiser, archer is a fragile ranged unit, pawn is the
 * baseline. Values: maxHp/damage in hit points, rangeTiles in tiles (one tile
 * is FIXED_SCALE fixed units), cooldownTicks in simulation ticks (20/s, ADR-009).
 */
export interface UnitCombatStats {
  readonly maxHp: number
  readonly damage: number
  readonly rangeTiles: number
  readonly cooldownTicks: number
  readonly mechanical: boolean
}

export const UNIT_STATS_BY_KIND: Readonly<Record<UnitKind, UnitCombatStats>> = {
  pawn: { maxHp: 100, damage: 10, rangeTiles: 1, cooldownTicks: 20, mechanical: true },
  warrior: { maxHp: 150, damage: 15, rangeTiles: 1, cooldownTicks: 20, mechanical: true },
  archer: { maxHp: 60, damage: 8, rangeTiles: 3, cooldownTicks: 20, mechanical: true }
}

/** Baseline stats; every kind resolves through {@link unitStatsFor}. */
export const UNIT_COMBAT_STATS: UnitCombatStats = UNIT_STATS_BY_KIND.pawn

/** Combat stats for a unit kind (defaults to the pawn baseline when unknown). */
export function unitStatsFor(kind: UnitKind): UnitCombatStats {
  return UNIT_STATS_BY_KIND[kind] ?? UNIT_COMBAT_STATS
}
