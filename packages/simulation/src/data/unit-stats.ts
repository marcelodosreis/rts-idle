/**
 * Authored combat stats for Phase 1 (master plan P1.05). A single baseline
 * block serves every unit for now; per-kind differentiation arrives with real
 * content. Values: maxHp/damage in hit points, rangeTiles in tiles (one tile
 * is FIXED_SCALE fixed units), cooldownTicks in simulation ticks (20/s, ADR-009).
 */
export interface UnitCombatStats {
  readonly maxHp: number
  readonly damage: number
  readonly rangeTiles: number
  readonly cooldownTicks: number
}

export const UNIT_COMBAT_STATS: UnitCombatStats = {
  maxHp: 100,
  damage: 10,
  rangeTiles: 1,
  cooldownTicks: 20
}
