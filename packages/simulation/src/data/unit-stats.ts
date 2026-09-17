import { FIXED_SCALE } from '@rts/shared'
import { Attack, Health, UnitClass, type UnitClassKind } from '../ecs/components.js'
import type { World } from '../ecs/world.js'
import { TICKS_PER_SECOND } from '../systems/movement-step.js'

/**
 * Baseline unit combat stats (master plan §13.1 Vanguard). These are
 * implementation/test baselines, not a balance claim; real content is authored
 * as data in game-data (ADR-004, Phase 4A).
 */
export interface UnitStats {
  readonly maxHp: number
  readonly armor: number
  readonly damage: number
  /** Attack range in tiles. */
  readonly rangeTiles: number
  /** Cooldown in seconds. */
  readonly cooldownSeconds: number
}

export const BASELINE_STATS: Readonly<Record<UnitClassKind, UnitStats>> = {
  worker: { maxHp: 60, armor: 0, damage: 4, rangeTiles: 1, cooldownSeconds: 1 },
  military: { maxHp: 90, armor: 1, damage: 12, rangeTiles: 1, cooldownSeconds: 0.75 },
  building: { maxHp: 400, armor: 1, damage: 18, rangeTiles: 6, cooldownSeconds: 1 }
}

/** Assigns baseline combat components (Health, Attack, UnitClass) to an entity. */
export function assignBaselineStats(world: World, id: number, kind: UnitClassKind): void {
  const stats = BASELINE_STATS[kind]
  world.store(Health).set(id, { current: stats.maxHp, max: stats.maxHp, armor: stats.armor })
  world.store(Attack).set(id, {
    damage: stats.damage,
    range: Math.round(stats.rangeTiles * FIXED_SCALE),
    cooldownTicks: Math.round(stats.cooldownSeconds * TICKS_PER_SECOND),
    cooldownRemaining: 0
  })
  world.store(UnitClass).set(id, { kind })
}
