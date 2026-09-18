import { tilesToFixed } from '@rts/shared'
import { createSimulation, Position } from '@rts/simulation'
import { describe, expect, it } from 'vitest'
import { buildMoveCommand, runUntilArrived, SEEDS, TEST_IDENTITY, worldWithOwners } from '../fixtures/index.js'

describe('MOVE command validation', () => {
  it('moves own units with the first unit exactly on the target', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveOwn,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0, 0, 0])
    })
    const units = sim.inspectState().world.aliveIds()
    const target = tilesToFixed(3)

    sim.step([buildMoveCommand(units, target, target)])
    runUntilArrived(sim, units)

    const after = sim.inspectState()
    const sorted = [...units].sort((a, b) => a - b)
    expect(after.world.store(Position).get(sorted[0]!)).toEqual({ x: target, y: target })
    for (const unit of sorted.slice(1)) {
      expect(after.world.store(Position).get(unit)).not.toEqual({ x: target, y: target })
    }
  })

  it('rejects a command from a non-owner without mutating state beyond the tick advance', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveNonOwner,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveNonOwner,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    const result = sim.step([buildMoveCommand([unit], 100, 100, { playerId: 1 })])
    control.step([])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('NOT_OWNER')
    expect(sim.hashState()).toBe(control.hashState())
    expect(sim.inspectState().world.store(Position).get(unit)).toEqual({ x: 0, y: 0 })
  })

  it('rejects a command targeting a nonexistent entity without mutating state', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveMissing,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })

    const result = sim.step([buildMoveCommand([999], 100, 100)])
    control.step([])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('ENTITY_UNAVAILABLE')
    expect(sim.hashState()).toBe(control.hashState())
  })

  it('rejects empty and oversized unit selections', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveEmptyOversize,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveEmptyOversize,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const big = Array.from({ length: 257 }, (_, i) => i + 1)

    expect(sim.step([buildMoveCommand([], 1, 1)]).rejected).toHaveLength(1)
    expect(sim.step([buildMoveCommand(big, 1, 1)]).rejected).toHaveLength(1)
    control.step([])
    control.step([])

    expect(sim.hashState()).toBe(control.hashState())
  })

  it('rejects fractional target coordinates as INVALID_PAYLOAD without mutating state', () => {
    const sim = createSimulation({
      seed: SEEDS.integration.moveFractional,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const control = createSimulation({
      seed: SEEDS.integration.moveFractional,
      identity: TEST_IDENTITY,
      initialWorld: worldWithOwners([0])
    })
    const unit = sim.inspectState().world.aliveIds()[0]!

    const result = sim.step([buildMoveCommand([unit], 4200.5, 3800.25)])
    control.step([])

    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0]!.code).toBe('INVALID_PAYLOAD')
    expect(sim.hashState()).toBe(control.hashState())
    expect(sim.inspectState().world.store(Position).get(unit)).toEqual({ x: 0, y: 0 })
  })

  it('is deterministic: same seed + commands produce the same hash', () => {
    const build = () =>
      createSimulation({
        seed: SEEDS.integration.moveDeterministic,
        identity: TEST_IDENTITY,
        initialWorld: worldWithOwners([0, 1])
      })
    const a = build()
    const b = build()
    const unitA = a.inspectState().world.aliveIds()[0]!
    const unitB = a.inspectState().world.aliveIds()[1]!

    for (let i = 0; i < 50; i += 1) {
      a.step([
        buildMoveCommand([unitA], tilesToFixed(i), tilesToFixed(i)),
        buildMoveCommand([unitB], tilesToFixed(i * 2), tilesToFixed(i * 2), { playerId: 1 })
      ])
      b.step([
        buildMoveCommand([unitA], tilesToFixed(i), tilesToFixed(i)),
        buildMoveCommand([unitB], tilesToFixed(i * 2), tilesToFixed(i * 2), { playerId: 1 })
      ])
      expect(b.hashState()).toBe(a.hashState())
    }
  })
})
